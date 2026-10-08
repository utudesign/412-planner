import Link from "next/link";
import type { Member, Project, Section, StatusUpdate, Task } from "@/lib/types";
import { PROJECT_STATUS } from "@/lib/types";
import { Avatar } from "../Avatar";
import { SubmitButton } from "../SubmitButton";
import { dueTone, fmtDate, fmtDateTime, todayET } from "@/lib/format";
import { postStatusUpdate } from "@/app/actions";

export function Overview({ project, sections, tasks, members, updates, canManage }: {
  project: Project; sections: Section[]; tasks: Task[]; members: Member[]; updates: StatusUpdate[]; canManage: boolean;
}) {
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  const lead = project.lead_id ? byId[project.lead_id] : null;
  const coordinator = members.find((m) => m.role === "coordinator");
  const gospel = members.find((m) => m.role === "gospel");
  const roles = [
    { label: "Project Lead", m: lead },
    { label: "Project & Calendar", m: coordinator },
    { label: "Gospel & Outreach", m: gospel },
  ];
  const helpers = [...new Set(tasks.map((t) => t.assignee_id).filter(Boolean) as string[])]
    .filter((id) => !roles.some((r) => r.m?.id === id)).map((id) => byId[id]).filter(Boolean);
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const today = todayET();
  const upcoming = tasks.filter((t) => t.status !== "done" && t.due_date).sort((a, b) => a.due_date!.localeCompare(b.due_date!)).slice(0, 5);
  const latest = updates[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card title="Project description">
          <p className="whitespace-pre-wrap text-sm text-slate-700">{project.purpose ?? <span className="italic text-slate-400">No purpose written yet.</span>}</p>
        </Card>

        <Card title="Gospel purpose" tag="Gospel lane">
          <p className="whitespace-pre-wrap text-sm text-slate-700">{project.gospel_purpose ?? <span className="italic text-amber-700">Not defined yet. Nomin and the Project Lead set this.</span>}</p>
        </Card>

        <Card title="Project roles">
          <div className="grid gap-3 sm:grid-cols-3">
            {roles.map((r) => (
              <div key={r.label} className="flex items-center gap-2.5 rounded-lg border border-slate-200 p-2.5">
                <Avatar member={r.m} size={32} />
                <div className="min-w-0 text-sm">
                  <div className="truncate font-medium">{r.m?.name ?? <span className="text-amber-600">Unassigned</span>}</div>
                  <div className="truncate text-xs text-slate-500">{r.label}</div>
                </div>
              </div>
            ))}
          </div>
          {helpers.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              Also working on this: {helpers.map((m) => <Avatar key={m.id} member={m} size={22} />)}
            </div>
          )}
        </Card>

        <Card title="Status updates">
          {canManage && (
            <form action={postStatusUpdate.bind(null, project.id)} className="mb-5 space-y-2 rounded-lg bg-slate-50 p-3">
              <div className="flex flex-wrap gap-2">
                {(["on_track", "at_risk", "off_track", "done"] as const).map((s, i) => (
                  <label key={s} className="cursor-pointer">
                    <input type="radio" name="status" value={s} defaultChecked={project.status === s || (i === 0 && project.status === "planning")} className="peer sr-only" />
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium opacity-50 ring-slate-900 peer-checked:opacity-100 peer-checked:ring-1 ${PROJECT_STATUS[s].cls}`}>
                      {PROJECT_STATUS[s].label}
                    </span>
                  </label>
                ))}
              </div>
              <textarea name="body" rows={3} required className="input" placeholder="What's the status? Highlights, blockers, next steps…" />
              <SubmitButton>Post update</SubmitButton>
            </form>
          )}
          <ul className="space-y-4">
            {updates.map((u) => {
              const a = u.author_id ? byId[u.author_id] : null;
              return (
                <li key={u.id} className="flex gap-3">
                  <Avatar member={a} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${PROJECT_STATUS[u.status].cls}`}>{PROJECT_STATUS[u.status].label}</span>
                      <span className="font-semibold text-slate-800">{a?.name ?? "Former member"}</span>
                      <span className="text-slate-400">{fmtDateTime(u.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{u.body}</p>
                  </div>
                </li>
              );
            })}
            {updates.length === 0 && <li className="text-sm text-slate-400">No status updates yet.</li>}
          </ul>
        </Card>
      </div>

      <aside className="space-y-6">
        <Card title="What's the status?">
          <span className={`rounded-full px-2.5 py-1 text-sm font-medium ${PROJECT_STATUS[project.status].cls}`}>{PROJECT_STATUS[project.status].label}</span>
          {latest && <p className="mt-2 text-xs text-slate-500">Last update {fmtDateTime(latest.created_at)}</p>}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500"><span>Progress</span><span>{done}/{tasks.length} tasks · {pct}%</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: project.color }} /></div>
          </div>
        </Card>

        <Card title="Key dates">
          <ol className="relative space-y-4 border-l border-slate-200 pl-4 text-sm">
            <li><Dot />Project start<div className="text-xs text-slate-500">{fmtDate(project.start_date, { month: "long", day: "numeric", year: "numeric" }) || "Not set"}</div></li>
            <li><Dot color={project.color} />Event / end<div className="text-xs text-slate-500">{fmtDate(project.end_date, { month: "long", day: "numeric", year: "numeric" }) || "Not set"}</div></li>
          </ol>
        </Card>

        <Card title="Coming up">
          <ul className="space-y-2 text-sm">
            {upcoming.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-2">
                <Link href={`?view=overview&task=${t.id}`} scroll={false} className="min-w-0 truncate hover:underline">{t.title}</Link>
                <span className={`shrink-0 text-xs ${dueTone(t.due_date, false)}`}>{t.due_date! < today ? "Late · " : ""}{fmtDate(t.due_date)}</span>
              </li>
            ))}
            {upcoming.length === 0 && <li className="text-slate-400">Nothing due.</li>}
          </ul>
        </Card>

        <Card title="Sections">
          <ul className="space-y-1.5 text-sm">
            {sections.map((s) => {
              const list = tasks.filter((t) => t.section_id === s.id);
              const d = list.filter((t) => t.status === "done").length;
              return (
                <li key={s.id} className="flex items-center justify-between">
                  <span className={s.kind === "gospel" ? "text-amber-800" : ""}>{s.name}</span>
                  <span className="text-xs text-slate-500">{list.length ? `${d}/${list.length}` : "—"}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </aside>
    </div>
  );
}

function Card({ title, tag, children }: { title: string; tag?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
        {title}
        {tag && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-medium uppercase text-amber-800">{tag}</span>}
      </h2>
      {children}
    </section>
  );
}

function Dot({ color = "#cbd5e1" }: { color?: string }) {
  return <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full" style={{ background: color }} />;
}
