import Link from "next/link";
import type { Member, Project, Section, Task } from "@/lib/types";
import { Avatar } from "./Avatar";
import { CheckToggle } from "./CheckToggle";
import { dueTone, fmtDate, todayET } from "@/lib/format";
import { addDays } from "@/lib/template.mjs";

type Row = Task & { project: Pick<Project, "id" | "name" | "color">; section: Pick<Section, "id" | "name" | "kind"> | null };

/** Tasks across projects, bucketed Asana-style by due date. */
export function TaskBuckets({ rows, members, showAssignee, canToggle }: {
  rows: Row[]; members: Member[]; showAssignee?: boolean; canToggle: (r: Row) => boolean;
}) {
  const today = todayET();
  const week = addDays(today, 7);
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  const open = rows.filter((r) => r.status !== "done");
  const buckets: [string, Row[]][] = [
    ["Overdue", open.filter((r) => r.due_date && r.due_date < today)],
    ["Today", open.filter((r) => r.due_date === today)],
    ["Next 7 days", open.filter((r) => r.due_date && r.due_date > today && r.due_date <= week)],
    ["Later", open.filter((r) => r.due_date && r.due_date > week)],
    ["No due date", open.filter((r) => !r.due_date)],
    ["Recently completed", rows.filter((r) => r.status === "done").slice(-10).reverse()],
  ];

  return (
    <div className="space-y-5">
      {buckets.filter(([, list]) => list.length).map(([name, list]) => (
        <section key={name} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <h2 className={`border-b border-slate-200 px-4 py-2.5 text-sm font-semibold ${name === "Overdue" ? "text-rose-600" : ""}`}>
            {name} <span className="font-normal text-slate-400">{list.length}</span>
          </h2>
          <ul className="divide-y divide-slate-100">
            {list.map((r) => {
              const a = r.assignee_id ? byId[r.assignee_id] : null;
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50">
                  <CheckToggle taskId={r.id} done={r.status === "done"} disabled={!canToggle(r)} />
                  <Link href={`/projects/${r.project.id}?task=${r.id}`} className={`min-w-0 flex-1 truncate hover:underline ${r.status === "done" ? "text-slate-400 line-through" : ""}`}>
                    {r.title}
                  </Link>
                  <span className="hidden items-center gap-1.5 truncate text-xs text-slate-500 sm:flex">
                    <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: r.project.color }} />
                    {r.project.name}{r.section ? ` · ${r.section.name}` : ""}
                  </span>
                  {showAssignee && <Avatar member={a} size={22} />}
                  <span className={`w-14 shrink-0 text-right text-xs ${dueTone(r.due_date, r.status === "done")}`}>{fmtDate(r.due_date)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {rows.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Nothing here yet.</div>}
    </div>
  );
}
