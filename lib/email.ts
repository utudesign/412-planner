import "server-only";
import { Resend } from "resend";
import fs from "node:fs/promises";
import path from "node:path";
import { fmtDate } from "./format";

const APP_URL = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const FROM = () => process.env.EMAIL_FROM ?? "412 Planner <planner@ministry412.com>";
let resend: Resend | null = null;

export const appUrl = (p: string) => APP_URL() + p;

/**
 * Send one email. Never throws: a failed email must not break saving a task.
 * Without RESEND_API_KEY (local dev) emails are logged, and written as .html files when EMAIL_OUTBOX_DIR is set.
 */
export async function sendEmail(to: string, subject: string, html: string, text: string) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log(`[email:dev] to=${to} subject="${subject}"`);
      const dir = process.env.EMAIL_OUTBOX_DIR;
      if (dir) {
        await fs.mkdir(dir, { recursive: true });
        const name = `${Date.now()}-${to.replace(/[^\w]/g, "_")}-${subject.replace(/[^\w]+/g, "_").slice(0, 40)}.html`;
        await fs.writeFile(path.join(dir, name), html);
      }
      return true;
    }
    resend ??= new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: FROM(), to, subject, html, text });
    if (error) { console.error("[email] send failed", to, error.message); return false; }
    return true;
  } catch (e) {
    console.error("[email] send failed", to, (e as Error).message);
    return false;
  }
}

// ── Templates ───────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type EmailTask = { title: string; project: string; color: string; due: string | null; url: string; late?: boolean };

function layout(heading: string, inner: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#1e1b4b;padding:16px 24px">
  <span style="display:inline-block;background:#fff;color:#1e1b4b;font-weight:900;font-size:13px;padding:2px 7px;border-radius:5px">412</span>
  <span style="color:#fff;font-size:14px;font-weight:600;margin-left:8px">Team Planner</span>
</td></tr>
<tr><td style="padding:24px">
  <h1 style="margin:0 0 16px;font-size:19px;line-height:1.35">${heading}</h1>
  ${inner}
  ${cta ? `<p style="margin:24px 0 0"><a href="${cta.url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px">${esc(cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">
  412 Ministry · <a href="${appUrl("/settings")}" style="color:#64748b">Notification settings</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

function taskRows(tasks: EmailTask[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;border-collapse:separate">
${tasks.map((t, i) => `<tr><td style="padding:10px 12px;${i ? "border-top:1px solid #f1f5f9;" : ""}font-size:14px">
  <a href="${t.url}" style="color:#0f172a;text-decoration:none;font-weight:500">${esc(t.title)}</a><br>
  <span style="font-size:12px;color:#64748b"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${t.color};margin-right:5px"></span>${esc(t.project)}</span>
</td><td align="right" style="padding:10px 12px;${i ? "border-top:1px solid #f1f5f9;" : ""}font-size:12px;white-space:nowrap;color:${t.late ? "#e11d48" : "#475569"};font-weight:${t.late ? 600 : 400}">
  ${t.due ? fmtDate(t.due) : ""}
</td></tr>`).join("")}
</table>`;
}

const textList = (tasks: EmailTask[]) => tasks.map((t) => `• ${t.title} (${t.project})${t.due ? ` — due ${fmtDate(t.due)}` : ""}\n  ${t.url}`).join("\n");

export function assignedEmail(actor: string, tasks: EmailTask[]) {
  const one = tasks.length === 1;
  const subject = one ? `${actor} assigned you: ${tasks[0].title}` : `${actor} assigned you ${tasks.length} tasks in ${tasks[0].project}`;
  const html = layout(
    one ? `${esc(actor)} assigned you a task` : `${esc(actor)} assigned you ${tasks.length} tasks`,
    taskRows(tasks),
    { label: one ? "Open task" : "View my tasks", url: one ? tasks[0].url : appUrl("/my-tasks") },
  );
  return { subject, html, text: `${actor} assigned you:\n\n${textList(tasks)}` };
}

export function commentEmail(actor: string, task: EmailTask, body: string) {
  const subject = `${actor} commented on: ${task.title}`;
  const html = layout(
    `${esc(actor)} commented on <a href="${task.url}" style="color:#4338ca;text-decoration:none">${esc(task.title)}</a>`,
    `<div style="border-left:3px solid #c7d2fe;padding:8px 14px;background:#f8fafc;border-radius:4px;font-size:14px;white-space:pre-wrap">${esc(body)}</div>
     <p style="font-size:12px;color:#64748b;margin:10px 0 0">${esc(task.project)}</p>`,
    { label: "Reply", url: task.url },
  );
  return { subject, html, text: `${actor} commented on "${task.title}" (${task.project}):\n\n${body}\n\n${task.url}` };
}

export function dailyEmail(name: string, g: { overdue: EmailTask[]; today: EmailTask[]; tomorrow: EmailTask[]; week: EmailTask[] }) {
  const parts: string[] = [];
  const text: string[] = [];
  const block = (label: string, color: string, list: EmailTask[]) => {
    if (!list.length) return;
    parts.push(`<h2 style="margin:20px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:${color}">${label} · ${list.length}</h2>${taskRows(list)}`);
    text.push(`${label.toUpperCase()}\n${textList(list)}`);
  };
  block("Overdue", "#e11d48", g.overdue);
  block("Due today", "#d97706", g.today);
  block("Due tomorrow", "#0f172a", g.tomorrow);
  block("Later this week", "#64748b", g.week);
  const urgent = g.overdue.length + g.today.length + g.tomorrow.length;
  const subject = g.overdue.length
    ? `${g.overdue.length} overdue${g.today.length + g.tomorrow.length ? ` · ${g.today.length + g.tomorrow.length} due soon` : ""}: your 412 tasks`
    : urgent ? `${urgent} task${urgent > 1 ? "s" : ""} due soon: your 412 tasks` : "Your 412 tasks this week";
  return {
    subject,
    html: layout(`Good morning, ${esc(name.split(" ")[0])}`, `<p style="margin:0;font-size:14px;color:#475569">Here's what's on your plate.</p>${parts.join("")}`, { label: "Open My tasks", url: appUrl("/my-tasks") }),
    text: `Good morning, ${name}\n\n${text.join("\n\n")}\n\n${appUrl("/my-tasks")}`,
  };
}

export type WeeklyProject = {
  name: string; color: string; url: string; status: string; lead: string | null;
  done7: number; overdue: EmailTask[]; next7: number; total: number; doneTotal: number;
};

export function weeklyEmail(name: string, projects: WeeklyProject[]) {
  const rows = projects.map((p) => {
    const pct = p.total ? Math.round((p.doneTotal / p.total) * 100) : 0;
    return `<tr><td style="padding:14px 0;border-top:1px solid #e2e8f0">
  <a href="${p.url}" style="font-weight:600;font-size:15px;color:#0f172a;text-decoration:none"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${p.color};margin-right:6px"></span>${esc(p.name)}</a>
  <span style="font-size:12px;color:#64748b;margin-left:6px">${esc(p.status)}${p.lead ? ` · Lead: ${esc(p.lead)}` : " · <b style='color:#d97706'>No lead</b>"}</span>
  <div style="font-size:13px;color:#334155;margin-top:6px">
    ✅ ${p.done7} completed last week &nbsp;·&nbsp; 📅 ${p.next7} due this week &nbsp;·&nbsp;
    <span style="color:${p.overdue.length ? "#e11d48" : "#334155"}">⚠️ ${p.overdue.length} overdue</span> &nbsp;·&nbsp; ${pct}% complete
  </div>
  ${p.overdue.length ? `<div style="margin-top:8px">${taskRows(p.overdue.slice(0, 5))}</div>` : ""}
</td></tr>`;
  }).join("");
  return {
    subject: `Weekly 412 project summary: ${projects.reduce((a, p) => a + p.overdue.length, 0)} overdue across ${projects.length} project${projects.length > 1 ? "s" : ""}`,
    html: layout(`Weekly summary for ${esc(name.split(" ")[0])}`, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`, { label: "Open Portfolio", url: appUrl("/portfolios") }),
    text: projects.map((p) => `${p.name} (${p.status}): ${p.done7} done last week, ${p.next7} due this week, ${p.overdue.length} overdue\n${p.url}`).join("\n\n"),
  };
}
