import Link from "next/link";
import type { Project } from "@/lib/types";
import { PROJECT_STATUS } from "@/lib/types";
import { fmtDate } from "@/lib/format";

export function ProjectCards({ projects, stats, canCreate }: {
  projects: Project[]; stats: Record<string, { total: number; done: number; overdue: number }>; canCreate: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {canCreate && (
        <Link href="/projects/new" className="flex min-h-28 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-500 hover:border-brand-500 hover:text-brand-600">
          <span className="text-xl">+</span> Create project
        </Link>
      )}
      {projects.map((p) => {
        const s = stats[p.id] ?? { total: 0, done: 0, overdue: 0 };
        return (
          <Link key={p.id} href={`/projects/${p.id}`} className="flex min-h-28 gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white" style={{ background: p.color }}>
              {p.name[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{p.name}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{fmtDate(p.end_date, { month: "short", day: "numeric", year: "numeric" }) || "No date"}</span>
              <span className="mt-2 flex items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 font-medium ${PROJECT_STATUS[p.status].cls}`}>{PROJECT_STATUS[p.status].label}</span>
                <span className="text-slate-500">{s.done}/{s.total} done</span>
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
