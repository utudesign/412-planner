import "server-only";
import { db, must } from "./supabase";
import { addDays } from "./template.mjs";
import { PROJECT_STATUS, type Member, type Project, type Task } from "./types";
import {
  appUrl, assignedEmail, commentEmail, dailyEmail, sendEmail, weeklyEmail,
  type EmailTask, type WeeklyProject,
} from "./email";

const taskUrl = (t: Pick<Task, "id" | "project_id">) => appUrl(`/projects/${t.project_id}?task=${t.id}`);
const toEmailTask = (t: Task, p: Pick<Project, "name" | "color">, today?: string): EmailTask => ({
  title: t.title, project: p.name, color: p.color, due: t.due_date, url: taskUrl(t),
  late: !!(today && t.due_date && t.due_date < today),
});
const ok = (m: Member | null | undefined): m is Member & { email: string } => !!m?.email;

// ── Instant ─────────────────────────────────────────────────────────────

/** Email `assigneeId` about one or more tasks `actor` just assigned them (one email, not one per task). */
export async function notifyAssigned(actor: Member, assigneeId: string | null, taskIds: string[]) {
  if (!assigneeId || assigneeId === actor.id || !taskIds.length) return;
  const assignee = must(await db().from("members").select("*").eq("id", assigneeId).maybeSingle()) as Member | null;
  if (!ok(assignee) || !assignee.notify_assigned) return;
  const tasks = must(await db().from("tasks").select("*").in("id", taskIds).order("due_date")) as Task[];
  if (!tasks.length) return;
  const project = must(await db().from("projects").select("name,color").eq("id", tasks[0].project_id).single()) as Project;
  const mail = assignedEmail(actor.name, tasks.map((t) => toEmailTask(t, project)));
  await sendEmail(assignee.email, mail.subject, mail.html, mail.text);
}

/** Email everyone following the task (assignee, creator, earlier commenters) except the commenter. */
export async function notifyComment(actor: Member, taskId: string, body: string) {
  const task = must(await db().from("tasks").select("*").eq("id", taskId).single()) as Task & { created_by: string | null };
  const project = must(await db().from("projects").select("name,color").eq("id", task.project_id).single()) as Project;
  const prior = must(await db().from("comments").select("author_id").eq("task_id", taskId)) as { author_id: string | null }[];
  const ids = [...new Set([task.assignee_id, task.created_by, ...prior.map((c) => c.author_id)])]
    .filter((id): id is string => !!id && id !== actor.id);
  if (!ids.length) return;
  const people = must(await db().from("members").select("*").in("id", ids)) as Member[];
  const mail = commentEmail(actor.name, toEmailTask(task, project), body);
  await Promise.all(people.filter(ok).filter((m) => m.notify_comments).map((m) => sendEmail(m.email, mail.subject, mail.html, mail.text)));
}

// ── Scheduled ───────────────────────────────────────────────────────────

/** Claim today's slot for this member+kind. Returns false if it was already sent (cron re-run). */
async function claim(memberId: string, kind: string, day: string) {
  const { error } = await db().from("notification_log").insert({ member_id: memberId, kind, sent_on: day });
  return !error;
}
async function release(memberId: string, kind: string, day: string) {
  await db().from("notification_log").delete().eq("member_id", memberId).eq("kind", kind).eq("sent_on", day);
}

async function openTasksWithProjects() {
  const projects = must(await db().from("projects").select("*").eq("archived", false)) as Project[];
  const tasks = projects.length
    ? (must(await db().from("tasks").select("*").in("project_id", projects.map((p) => p.id)).neq("status", "done")) as Task[])
    : [];
  return { projects, tasks, byProject: Object.fromEntries(projects.map((p) => [p.id, p])) };
}

/** Daily reminder: overdue / due today / due tomorrow (+ rest of the week if digest is on). */
export async function runDaily(today: string) {
  const members = (must(await db().from("members").select("*")) as Member[]).filter(ok).filter((m) => m.notify_due || m.notify_digest);
  const { tasks, byProject } = await openTasksWithProjects();
  const tomorrow = addDays(today, 1), weekEnd = addDays(today, 7);
  const result = { sent: 0, skipped: 0, failed: 0 };

  for (const m of members) {
    const mine = tasks.filter((t) => t.assignee_id === m.id && t.due_date).sort((a, b) => a.due_date!.localeCompare(b.due_date!));
    const e = (t: Task) => toEmailTask(t, byProject[t.project_id], today);
    const g = {
      overdue: m.notify_due ? mine.filter((t) => t.due_date! < today).map(e) : [],
      today: m.notify_due ? mine.filter((t) => t.due_date === today).map(e) : [],
      tomorrow: m.notify_due ? mine.filter((t) => t.due_date === tomorrow).map(e) : [],
      week: m.notify_digest ? mine.filter((t) => t.due_date! > tomorrow && t.due_date! <= weekEnd).map(e) : [],
    };
    if (!g.overdue.length && !g.today.length && !g.tomorrow.length && !g.week.length) { result.skipped++; continue; }
    if (!(await claim(m.id, "daily", today))) { result.skipped++; continue; }
    const mail = dailyEmail(m.name, g);
    if (await sendEmail(m.email, mail.subject, mail.html, mail.text)) result.sent++;
    else { result.failed++; await release(m.id, "daily", today); }
  }
  return result;
}

/** Monday summary: Admins and Coordinators get every project; Project Leads get theirs. */
export async function runWeekly(today: string) {
  const members = (must(await db().from("members").select("*")) as Member[]).filter(ok).filter((m) => m.notify_weekly);
  const { projects, tasks } = await openTasksWithProjects();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const recentDone = projects.length
    ? (must(await db().from("tasks").select("project_id").in("project_id", projects.map((p) => p.id)).eq("status", "done").gt("completed_at", weekAgo)) as Pick<Task, "project_id">[])
    : [];
  const totals = projects.length
    ? (must(await db().from("tasks").select("project_id,status").in("project_id", projects.map((p) => p.id))) as Pick<Task, "project_id" | "status">[])
    : [];
  const all = must(await db().from("members").select("id,name")) as Pick<Member, "id" | "name">[];
  const nameOf = (id: string | null) => all.find((x) => x.id === id)?.name ?? null;
  const weekEnd = addDays(today, 7);

  const summary = (p: Project): WeeklyProject => {
    const open = tasks.filter((t) => t.project_id === p.id);
    return {
      name: p.name, color: p.color, url: appUrl(`/projects/${p.id}?view=overview`),
      status: PROJECT_STATUS[p.status].label, lead: nameOf(p.lead_id),
      done7: recentDone.filter((t) => t.project_id === p.id).length,
      overdue: open.filter((t) => t.due_date && t.due_date < today).map((t) => toEmailTask(t, p, today)),
      next7: open.filter((t) => t.due_date && t.due_date >= today && t.due_date <= weekEnd).length,
      total: totals.filter((t) => t.project_id === p.id).length,
      doneTotal: totals.filter((t) => t.project_id === p.id && t.status === "done").length,
    };
  };

  const result = { sent: 0, skipped: 0, failed: 0 };
  for (const m of members) {
    const mineProjects = m.role === "admin" || m.role === "coordinator" ? projects : projects.filter((p) => p.lead_id === m.id);
    if (!mineProjects.length) { result.skipped++; continue; }
    if (!(await claim(m.id, "weekly", today))) { result.skipped++; continue; }
    const mail = weeklyEmail(m.name, mineProjects.map(summary));
    if (await sendEmail(m.email, mail.subject, mail.html, mail.text)) result.sent++;
    else { result.failed++; await release(m.id, "weekly", today); }
  }
  return result;
}
