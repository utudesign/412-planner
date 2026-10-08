import { requireMe } from "@/lib/auth";
import { getProjects } from "@/lib/data";
import { Timeline } from "@/components/Timeline";
import { db, must } from "@/lib/supabase";
import type { Task } from "@/lib/types";

export default async function MasterTimeline({ searchParams }: { searchParams: Promise<{ detail?: string }> }) {
  await requireMe();
  const sp = await searchParams;
  const projects = await getProjects();
  const detail = sp.detail === "1";
  const tasks = detail
    ? (must(await db().from("tasks").select("*").in("project_id", projects.map((p) => p.id)).order("due_date")) as Task[])
    : [];

  const rows = projects.flatMap((p) => [
    { id: p.id, label: p.name, group: detail ? p.name : "Projects", color: p.color, start: p.start_date, end: p.end_date, href: `/projects/${p.id}?view=timeline` },
    ...tasks.filter((t) => t.project_id === p.id && t.status !== "done").map((t) => ({
      id: t.id, label: t.title, group: p.name, color: p.color, start: t.start_date, end: t.due_date, href: `/projects/${p.id}?task=${t.id}`,
    })),
  ]);

  return (
    <div className="px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Master timeline</h1>
          <p className="mt-1 text-sm text-slate-500">All 412 projects on one calendar. Spot overlaps and conflicts early.</p>
        </div>
        <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-sm">
          <a href="?detail=0" className={`rounded px-3 py-1 ${!detail ? "bg-brand-600 text-white" : "text-slate-600"}`}>Projects</a>
          <a href="?detail=1" className={`rounded px-3 py-1 ${detail ? "bg-brand-600 text-white" : "text-slate-600"}`}>Projects + open tasks</a>
        </div>
      </div>
      <div className="mt-6"><Timeline rows={rows} emptyText="Give projects start and end dates to see them here." /></div>
    </div>
  );
}
