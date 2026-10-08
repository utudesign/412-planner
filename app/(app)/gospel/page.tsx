import Link from "next/link";
import { requireMe } from "@/lib/auth";
import { getMembers, getProjects, getTasksWhere } from "@/lib/data";
import { TaskBuckets } from "@/components/TaskBuckets";
import { isManager } from "@/lib/perm";

export default async function Gospel() {
  const me = await requireMe();
  const [rows, members, projects] = await Promise.all([getTasksWhere({ sectionKind: "gospel" }), getMembers(), getProjects()]);
  const lead = (pid: string) => projects.find((p) => p.id === pid)?.lead_id;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-semibold">Gospel &amp; Outreach</h1>
      <p className="mt-1 text-sm text-slate-500">
        “Is the Gospel/outreach component of this project intentional, prepared, and ready?” Every project&apos;s Gospel lane in one place.
      </p>

      <div className="my-6 grid gap-3 sm:grid-cols-2">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-amber-400">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />{p.name}
            </div>
            <p className={`mt-1.5 line-clamp-3 text-sm ${p.gospel_purpose ? "text-slate-600" : "italic text-amber-700"}`}>
              {p.gospel_purpose ?? "Gospel purpose not defined yet."}
            </p>
          </Link>
        ))}
      </div>

      <TaskBuckets rows={rows} members={members} showAssignee
        canToggle={(r) => isManager(me) || me.role === "gospel" || r.assignee_id === me.id || lead(r.project.id) === me.id} />
    </div>
  );
}
