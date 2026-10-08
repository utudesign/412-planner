"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyAssigned, notifyComment } from "@/lib/notify";
import { redirect } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { db, must } from "@/lib/supabase";
import { canDeleteTask, canEditTask, canManageProject, isManager } from "@/lib/perm";
import type { Member, Project, Section, Task, TaskStatus } from "@/lib/types";
import { SECTIONS, STARTER_TASKS, addDays, ownerFor } from "@/lib/template.mjs";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const refresh = () => revalidatePath("/", "layout");

async function loadTask(taskId: string) {
  const task = must(await db().from("tasks").select("*").eq("id", taskId).single()) as Task;
  const project = must(await db().from("projects").select("*").eq("id", task.project_id).single()) as Project;
  const section = task.section_id
    ? (must(await db().from("sections").select("*").eq("id", task.section_id).maybeSingle()) as Section | null)
    : null;
  return { task, project, section };
}

async function loadProject(projectId: string) {
  return must(await db().from("projects").select("*").eq("id", projectId).single()) as Project;
}

/** People used to auto-assign template tasks. */
async function keyPeople() {
  const members = must(await db().from("members").select("id, role")) as Pick<Member, "id" | "role">[];
  return {
    admin: members.find((m) => m.role === "admin")?.id ?? null,
    coordinator: members.find((m) => m.role === "coordinator")?.id ?? null,
    gospel: members.find((m) => m.role === "gospel")?.id ?? null,
  };
}

/** Create sections + starter tasks for a new project (shared with scripts/seed.mjs logic). */
async function applyTemplate(project: Project, createdBy: string | null) {
  const sections = must(
    await db().from("sections")
      .insert(SECTIONS.map((s, i) => ({ project_id: project.id, name: s.name, kind: s.kind, position: i })))
      .select("*"),
  ) as Section[];
  const people = await keyPeople();
  const start = project.start_date;
  const end = project.end_date ?? start;
  const rows = STARTER_TASKS
    .filter((t) => !(t.onlyIfNoLead && project.lead_id))
    .map((t, i) => {
      const anchor = t.anchor === "start" ? start : end;
      return {
        project_id: project.id,
        section_id: sections.find((s) => s.name === t.section)?.id ?? null,
        title: t.title,
        description: t.description ?? null,
        assignee_id: ownerFor(t.owner, project.lead_id, people),
        due_date: anchor ? addDays(anchor, t.offset) : null,
        position: i,
        created_by: createdBy,
      };
    });
  const inserted = must(await db().from("tasks").insert(rows).select("id, assignee_id")) as { id: string; assignee_id: string | null }[];
  return inserted;
}

/** One "you were assigned N tasks" email per person instead of one per task. */
function notifyGrouped(actor: Member, rows: { id: string; assignee_id: string | null }[]) {
  const groups = new Map<string, string[]>();
  for (const r of rows) if (r.assignee_id) groups.set(r.assignee_id, [...(groups.get(r.assignee_id) ?? []), r.id]);
  after(async () => { for (const [who, ids] of groups) await notifyAssigned(actor, who, ids); });
}

// ── Projects ────────────────────────────────────────────────────────────

export async function createProject(form: FormData) {
  const me = await requireMe();
  if (!isManager(me)) throw new Error("Only the Events & Outreach Lead or Coordinator can create projects.");
  const name = str(form, "name");
  if (!name) throw new Error("Project name is required.");
  const project = must(
    await db().from("projects").insert({
      name,
      purpose: str(form, "purpose"),
      color: str(form, "color") ?? "#4f46e5",
      lead_id: str(form, "lead_id"),
      start_date: str(form, "start_date"),
      end_date: str(form, "end_date"),
      created_by: me.id,
    }).select("*").single(),
  ) as Project;
  if (form.get("template") === "on") notifyGrouped(me, await applyTemplate(project, me.id));
  else
    must(await db().from("sections").insert(SECTIONS.map((s, i) => ({ project_id: project.id, name: s.name, kind: s.kind, position: i }))));
  refresh();
  redirect(`/projects/${project.id}`);
}

export async function updateProject(projectId: string, form: FormData) {
  const me = await requireMe();
  const project = await loadProject(projectId);
  if (canManageProject(me, project)) {
    must(await db().from("projects").update({
      name: str(form, "name") ?? project.name,
      purpose: str(form, "purpose"),
      gospel_purpose: str(form, "gospel_purpose"),
      color: str(form, "color") ?? project.color,
      lead_id: isManager(me) ? str(form, "lead_id") : project.lead_id,
      status: str(form, "status") ?? project.status,
      start_date: str(form, "start_date"),
      end_date: str(form, "end_date"),
    }).eq("id", projectId));
  } else if (me.role === "gospel") {
    must(await db().from("projects").update({ gospel_purpose: str(form, "gospel_purpose") }).eq("id", projectId));
  } else {
    throw new Error("You can't edit this project.");
  }
  refresh();
}

export async function archiveProject(projectId: string) {
  const me = await requireMe();
  if (!isManager(me)) throw new Error("Not allowed.");
  must(await db().from("projects").update({ archived: true }).eq("id", projectId));
  refresh();
  redirect("/");
}

export async function addSection(projectId: string, form: FormData) {
  const me = await requireMe();
  const project = await loadProject(projectId);
  if (!canManageProject(me, project)) throw new Error("Only the Project Lead can add sections.");
  const name = str(form, "name");
  if (!name) return;
  must(await db().from("sections").insert({ project_id: projectId, name, position: Date.now() }));
  refresh();
}

// ── Tasks ───────────────────────────────────────────────────────────────

export async function createTask(projectId: string, sectionId: string | null, form: FormData) {
  const me = await requireMe();
  const title = str(form, "title");
  if (!title) return;
  const created = must(await db().from("tasks").insert({
    project_id: projectId,
    section_id: sectionId,
    title,
    status: (str(form, "status") as TaskStatus) ?? "todo",
    assignee_id: str(form, "assignee_id"),
    due_date: str(form, "due_date"),
    position: Date.now(),
    created_by: me.id,
  }).select("id, assignee_id").single()) as { id: string; assignee_id: string | null };
  after(() => notifyAssigned(me, created.assignee_id, [created.id]));
  refresh();
}

export async function updateTask(taskId: string, form: FormData) {
  const me = await requireMe();
  const { task, project, section } = await loadTask(taskId);
  if (!canEditTask(me, project, task, section)) throw new Error("You can't edit this task.");
  const status = (str(form, "status") as TaskStatus) ?? task.status;
  must(await db().from("tasks").update({
    title: str(form, "title") ?? task.title,
    description: str(form, "description"),
    status,
    priority: str(form, "priority"),
    section_id: str(form, "section_id"),
    assignee_id: str(form, "assignee_id"),
    start_date: str(form, "start_date"),
    due_date: str(form, "due_date"),
    completed_at: status === "done" ? task.completed_at ?? new Date().toISOString() : null,
  }).eq("id", taskId));
  const newAssignee = str(form, "assignee_id");
  if (newAssignee && newAssignee !== task.assignee_id) after(() => notifyAssigned(me, newAssignee, [taskId]));
  refresh();
}

export async function setTaskStatus(taskId: string, status: TaskStatus, position?: number) {
  const me = await requireMe();
  const { task, project, section } = await loadTask(taskId);
  if (!canEditTask(me, project, task, section)) throw new Error("You can't edit this task.");
  must(await db().from("tasks").update({
    status,
    ...(position !== undefined ? { position } : {}),
    completed_at: status === "done" ? task.completed_at ?? new Date().toISOString() : null,
  }).eq("id", taskId));
  refresh();
}

export async function toggleDone(taskId: string, done: boolean) {
  return setTaskStatus(taskId, done ? "done" : "todo");
}

export async function deleteTask(taskId: string) {
  const me = await requireMe();
  const { project } = await loadTask(taskId);
  if (!canDeleteTask(me, project)) throw new Error("Only the Project Lead can delete tasks.");
  const files = must(await db().from("attachments").select("storage_path").eq("task_id", taskId)) as { storage_path: string }[];
  if (files.length) await db().storage.from("attachments").remove(files.map((f) => f.storage_path));
  must(await db().from("tasks").delete().eq("id", taskId));
  refresh();
  redirect(`/projects/${project.id}`);
}

// ── Comments ────────────────────────────────────────────────────────────

export async function addComment(taskId: string, form: FormData) {
  const me = await requireMe();
  const body = str(form, "body");
  if (!body) return;
  must(await db().from("comments").insert({ task_id: taskId, author_id: me.id, body }));
  after(() => notifyComment(me, taskId, body));
  refresh();
}

// ── Attachments (browser uploads straight to Storage via a signed URL) ──

export async function createUpload(taskId: string, fileName: string) {
  await requireMe();
  const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(-120);
  const path = `${taskId}/${crypto.randomUUID()}-${safe}`;
  const { data, error } = await db().storage.from("attachments").createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  return { path, token: data.token };
}

export async function recordAttachment(taskId: string, path: string, fileName: string, size: number, mime: string) {
  const me = await requireMe();
  if (!path.startsWith(`${taskId}/`)) throw new Error("Bad path.");
  must(await db().from("attachments").insert({
    task_id: taskId, uploader_id: me.id, file_name: fileName, storage_path: path, size_bytes: size, mime_type: mime,
  }));
  refresh();
}

export async function deleteAttachment(attachmentId: string) {
  const me = await requireMe();
  const a = must(await db().from("attachments").select("*").eq("id", attachmentId).single()) as {
    uploader_id: string | null; storage_path: string; task_id: string;
  };
  const { project } = await loadTask(a.task_id);
  if (a.uploader_id !== me.id && !canManageProject(me, project)) throw new Error("Not allowed.");
  await db().storage.from("attachments").remove([a.storage_path]);
  must(await db().from("attachments").delete().eq("id", attachmentId));
  refresh();
}

// ── Team ────────────────────────────────────────────────────────────────

export async function saveMember(memberId: string | null, form: FormData) {
  const me = await requireMe();
  if (me.role !== "admin") throw new Error("Only Admins manage the team.");
  const row = {
    name: str(form, "name") ?? "Member",
    email: str(form, "email")?.toLowerCase() ?? null,
    title: str(form, "title"),
    role: str(form, "role") ?? "member",
  };
  if (memberId) must(await db().from("members").update(row).eq("id", memberId));
  else must(await db().from("members").insert(row));
  refresh();
}

export async function removeMember(memberId: string) {
  const me = await requireMe();
  if (me.role !== "admin" || memberId === me.id) throw new Error("Not allowed.");
  must(await db().from("members").delete().eq("id", memberId));
  refresh();
}

// ── Status updates & messages ───────────────────────────────────────────

export async function postStatusUpdate(projectId: string, form: FormData) {
  const me = await requireMe();
  const project = await loadProject(projectId);
  if (!canManageProject(me, project)) throw new Error("Only the Project Lead or Coordinator can post status updates.");
  const status = str(form, "status") ?? "on_track";
  const body = str(form, "body");
  if (!body) return;
  must(await db().from("status_updates").insert({ project_id: projectId, author_id: me.id, status, body }));
  must(await db().from("projects").update({ status }).eq("id", projectId));
  refresh();
}

export async function postMessage(projectId: string, form: FormData) {
  const me = await requireMe();
  const body = str(form, "body");
  if (!body) return;
  must(await db().from("project_messages").insert({ project_id: projectId, author_id: me.id, body }));
  refresh();
}

// ── Notification settings ───────────────────────────────────────────────

export async function saveNotificationPrefs(form: FormData) {
  const me = await requireMe();
  const on = (k: string) => form.get(k) === "on";
  must(await db().from("members").update({
    notify_assigned: on("notify_assigned"),
    notify_comments: on("notify_comments"),
    notify_due: on("notify_due"),
    notify_digest: on("notify_digest"),
    notify_weekly: on("notify_weekly"),
  }).eq("id", me.id));
  refresh();
}
