import type { Member, Section, Task } from "@/lib/types";
import { todayET } from "@/lib/format";
import { addDays } from "@/lib/template.mjs";

/** Asana-style dashboard: KPI tiles + simple bar charts (pure CSS, no chart library). */
export function Dashboard({ tasks, sections, members, color }: { tasks: Task[]; sections: Section[]; members: Member[]; color: string }) {
  const today = todayET();
  const open = tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => t.due_date && t.due_date < today);
  const done = tasks.length - open.length;

  const bySection = sections.map((s) => {
    const list = tasks.filter((t) => t.section_id === s.id);
    return { label: s.name, done: list.filter((t) => t.status === "done").length, open: list.filter((t) => t.status !== "done").length, gospel: s.kind === "gospel" };
  });
  const assignees = [...new Set(open.map((t) => t.assignee_id ?? ""))];
  const byAssignee = assignees.map((id) => ({
    label: members.find((m) => m.id === id)?.name ?? "Unassigned",
    open: open.filter((t) => (t.assignee_id ?? "") === id).length,
    late: overdue.filter((t) => (t.assignee_id ?? "") === id).length,
  })).sort((a, b) => b.open - a.open);
  const status = [
    { label: "To do", n: tasks.filter((t) => t.status === "todo").length, c: "#94a3b8" },
    { label: "In progress", n: tasks.filter((t) => t.status === "doing").length, c: "#0ea5e9" },
    { label: "Done", n: done, c: "#10b981" },
  ];
  // Next 8 weeks: open tasks due per week
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const s = addDays(today, i * 7), e = addDays(today, i * 7 + 6);
    return { label: i === 0 ? "This wk" : new Date(s + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      n: open.filter((t) => t.due_date && t.due_date >= s && t.due_date <= e).length };
  });
  const maxSec = Math.max(1, ...bySection.map((s) => s.done + s.open));
  const maxAs = Math.max(1, ...byAssignee.map((a) => a.open));
  const maxWk = Math.max(1, ...weeks.map((w) => w.n));
  const total = Math.max(1, tasks.length);
  let acc = 0;
  const donut = status.map((s) => { const from = acc; acc += (s.n / total) * 100; return `${s.c} ${from}% ${acc}%`; }).join(", ");

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Total tasks" value={tasks.length} />
        <Kpi label="Completed" value={done} />
        <Kpi label="Incomplete" value={open.length} />
        <Kpi label="Overdue" value={overdue.length} tone={overdue.length ? "text-rose-600" : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Tasks by section">
          <ul className="space-y-2.5">
            {bySection.map((s) => (
              <li key={s.label} className="grid grid-cols-[130px_1fr_44px] items-center gap-2 text-sm">
                <span className={`truncate ${s.gospel ? "text-amber-800" : ""}`}>{s.label}</span>
                <div className="flex h-4 overflow-hidden rounded bg-slate-100">
                  <div style={{ width: `${(s.done / maxSec) * 100}%`, background: "#10b981" }} />
                  <div style={{ width: `${(s.open / maxSec) * 100}%`, background: s.gospel ? "#d97706" : color }} />
                </div>
                <span className="text-right text-xs text-slate-500">{s.done}/{s.done + s.open}</span>
              </li>
            ))}
          </ul>
          <Legend items={[["#10b981", "Completed"], [color, "Incomplete"]]} />
        </Panel>

        <Panel title="Task status">
          <div className="flex items-center gap-8">
            <div className="relative h-40 w-40 shrink-0 rounded-full" style={{ background: `conic-gradient(${donut})` }}>
              <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white">
                <span className="text-2xl font-semibold">{Math.round((done / total) * 100)}%</span>
                <span className="text-xs text-slate-500">complete</span>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              {status.map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ background: s.c }} />{s.label}<span className="text-slate-500">{s.n}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="Incomplete tasks by assignee">
          <ul className="space-y-2.5">
            {byAssignee.map((a) => (
              <li key={a.label} className="grid grid-cols-[110px_1fr_30px] items-center gap-2 text-sm">
                <span className="truncate">{a.label}</span>
                <div className="flex h-4 overflow-hidden rounded bg-slate-100">
                  <div style={{ width: `${(a.late / maxAs) * 100}%`, background: "#e11d48" }} />
                  <div style={{ width: `${((a.open - a.late) / maxAs) * 100}%`, background: color }} />
                </div>
                <span className="text-right text-xs text-slate-500">{a.open}</span>
              </li>
            ))}
            {byAssignee.length === 0 && <li className="text-sm text-slate-400">All done.</li>}
          </ul>
          <Legend items={[["#e11d48", "Overdue"], [color, "On time"]]} />
        </Panel>

        <Panel title="Upcoming work (next 8 weeks)">
          <div className="flex h-40 items-end gap-2">
            {weeks.map((w) => (
              <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-slate-500">{w.n || ""}</span>
                <div className="w-full rounded-t" style={{ height: `${(w.n / maxWk) * 110}px`, minHeight: w.n ? 4 : 0, background: color }} />
                <span className="text-[10px] text-slate-500">{w.label}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-4 font-semibold">{title}</h2>{children}</section>;
}
function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-4 flex gap-4 text-xs text-slate-500">
      {items.map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{l}</span>)}
    </div>
  );
}
