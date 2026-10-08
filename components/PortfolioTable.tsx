import Link from "next/link";
import type { Member, Project } from "@/lib/types";
import { PROJECT_STATUS } from "@/lib/types";
import { Avatar } from "./Avatar";
import { fmtDate } from "@/lib/format";

export function PortfolioTable({ projects, stats, members }: {
  projects: Project[]; stats: Record<string, { total: number; done: number; overdue: number }>; members: Member[];
}) {
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
          <tr className="border-b border-slate-200">
            <th className="px-4 py-2.5 font-medium">Project</th>
            <th className="px-2 py-2.5 font-medium">Status</th>
            <th className="px-2 py-2.5 font-medium">Project Lead</th>
            <th className="px-2 py-2.5 font-medium">Start</th>
            <th className="px-2 py-2.5 font-medium">Event / end</th>
            <th className="px-2 py-2.5 font-medium">Progress</th>
            <th className="px-4 py-2.5 font-medium">Late</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const s = stats[p.id] ?? { total: 0, done: 0, overdue: 0 };
            const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
            const lead = p.lead_id ? byId[p.lead_id] : null;
            return (
              <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/projects/${p.id}?view=overview`} className="flex items-center gap-2 font-medium hover:underline">
                    <span className="h-3 w-3 rounded-sm" style={{ background: p.color }} />{p.name}
                  </Link>
                </td>
                <td className="px-2 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PROJECT_STATUS[p.status].cls}`}>{PROJECT_STATUS[p.status].label}</span></td>
                <td className="px-2 py-3">{lead ? <span className="flex items-center gap-1.5"><Avatar member={lead} size={20} />{lead.name}</span> : <span className="text-amber-600">Needs a lead</span>}</td>
                <td className="px-2 py-3 text-slate-600">{fmtDate(p.start_date, { month: "short", day: "numeric", year: "numeric" })}</td>
                <td className="px-2 py-3 text-slate-600">{fmtDate(p.end_date, { month: "short", day: "numeric", year: "numeric" })}</td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} /></div>
                    <span className="text-xs text-slate-500">{pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">{s.overdue > 0 ? <span className="text-xs font-medium text-rose-600">{s.overdue}</span> : <span className="text-xs text-slate-400">0</span>}</td>
              </tr>
            );
          })}
          {projects.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No projects yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
