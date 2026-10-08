import "server-only";
import { db, must } from "./supabase";
import type { Attachment, Comment, Member, Project, ProjectMessage, Section, StatusUpdate, Task } from "./types";

export async function getMembers() {
  return must(await db().from("members").select("*").order("name")) as Member[];
}

export async function getProjects() {
  return must(
    await db().from("projects").select("*").eq("archived", false).order("end_date", { ascending: true, nullsFirst: false }),
  ) as Project[];
}

/** Task counts per project for progress bars. */
export async function getProjectStats() {
  const rows = must(await db().from("tasks").select("project_id, status, due_date")) as Pick<Task, "project_id" | "status" | "due_date">[];
  const stats: Record<string, { total: number; done: number; overdue: number }> = {};
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  for (const r of rows) {
    const s = (stats[r.project_id] ??= { total: 0, done: 0, overdue: 0 });
    s.total++;
    if (r.status === "done") s.done++;
    else if (r.due_date && r.due_date < today) s.overdue++;
  }
  return stats;
}

export async function getProject(id: string) {
  const project = must(await db().from("projects").select("*").eq("id", id).maybeSingle()) as Project | null;
  if (!project) return null;
  const sections = must(await db().from("sections").select("*").eq("project_id", id).order("position")) as Section[];
  const tasks = must(
    await db().from("tasks").select("*").eq("project_id", id)
      .order("position").order("created_at"),
  ) as Task[];
  return { project, sections, tasks };
}

export async function getTaskDetail(id: string) {
  const task = must(await db().from("tasks").select("*").eq("id", id).maybeSingle()) as Task | null;
  if (!task) return null;
  const comments = must(await db().from("comments").select("*").eq("task_id", id).order("created_at")) as Comment[];
  const attachments = must(await db().from("attachments").select("*").eq("task_id", id).order("created_at")) as Attachment[];
  let urls: Record<string, string> = {};
  if (attachments.length) {
    const { data } = await db().storage.from("attachments").createSignedUrls(attachments.map((a) => a.storage_path), 60 * 60);
    urls = Object.fromEntries((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
  }
  return { task, comments, attachments: attachments.map((a) => ({ ...a, url: urls[a.storage_path] ?? null })) };
}

/** Open + recently completed tasks with their project, for cross-project views. */
export async function getTasksWhere(filter: { assigneeId?: string; sectionKind?: "gospel" }) {
  let q = db().from("tasks").select("*, project:projects!inner(id,name,color,archived), section:sections(id,name,kind)")
    .eq("project.archived", false);
  if (filter.assigneeId) q = q.eq("assignee_id", filter.assigneeId);
  const rows = must(await q.order("due_date", { ascending: true, nullsFirst: false })) as (Task & {
    project: Pick<Project, "id" | "name" | "color">;
    section: Pick<Section, "id" | "name" | "kind"> | null;
  })[];
  return filter.sectionKind ? rows.filter((r) => r.section?.kind === filter.sectionKind) : rows;
}

export async function getProjectFiles(projectId: string) {
  const rows = must(
    await db().from("attachments").select("*, task:tasks!inner(id,title,project_id)")
      .eq("task.project_id", projectId).order("created_at", { ascending: false }),
  ) as (Attachment & { task: { id: string; title: string } })[];
  let urls: Record<string, string> = {};
  if (rows.length) {
    const { data } = await db().storage.from("attachments").createSignedUrls(rows.map((a) => a.storage_path), 60 * 60);
    urls = Object.fromEntries((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
  }
  return rows.map((a) => ({ ...a, url: urls[a.storage_path] ?? null }));
}

export async function getStatusUpdates(projectId: string) {
  return must(
    await db().from("status_updates").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
  ) as StatusUpdate[];
}

export async function getMessages(projectId: string) {
  return must(
    await db().from("project_messages").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
  ) as ProjectMessage[];
}

export type InboxItem = {
  id: string;
  kind: "comment" | "assigned" | "message" | "status";
  at: string;
  actorId: string | null;
  projectId: string;
  taskId?: string;
  title: string;
  body?: string;
};

/** Activity relevant to `me` from the last 30 days: comments on my tasks, new assignments, project messages, status updates. */
export async function getInbox(meId: string): Promise<InboxItem[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [comments, assigned, messages, updates] = await Promise.all([
    db().from("comments").select("*, task:tasks!inner(id,title,project_id,assignee_id,created_by)")
      .gt("created_at", since).neq("author_id", meId).order("created_at", { ascending: false }),
    db().from("tasks").select("id,title,project_id,created_by,created_at")
      .eq("assignee_id", meId).gt("created_at", since).order("created_at", { ascending: false }),
    db().from("project_messages").select("*").gt("created_at", since).neq("author_id", meId).order("created_at", { ascending: false }),
    db().from("status_updates").select("*").gt("created_at", since).neq("author_id", meId).order("created_at", { ascending: false }),
  ]);
  const items: InboxItem[] = [];
  for (const c of (must(comments) ?? []) as (Comment & { task: Task & { created_by: string | null } })[]) {
    if (c.task.assignee_id !== meId && c.task.created_by !== meId) continue;
    items.push({ id: "c" + c.id, kind: "comment", at: c.created_at, actorId: c.author_id, projectId: c.task.project_id, taskId: c.task.id, title: c.task.title, body: c.body });
  }
  for (const t of (must(assigned) ?? []) as (Task & { created_by: string | null; created_at: string })[]) {
    if (t.created_by === meId) continue;
    items.push({ id: "a" + t.id, kind: "assigned", at: t.created_at, actorId: t.created_by, projectId: t.project_id, taskId: t.id, title: t.title });
  }
  for (const m of (must(messages) ?? []) as ProjectMessage[])
    items.push({ id: "m" + m.id, kind: "message", at: m.created_at, actorId: m.author_id, projectId: m.project_id, title: "New message", body: m.body });
  for (const u of (must(updates) ?? []) as StatusUpdate[])
    items.push({ id: "s" + u.id, kind: "status", at: u.created_at, actorId: u.author_id, projectId: u.project_id, title: "Status update", body: u.body });
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60);
}
