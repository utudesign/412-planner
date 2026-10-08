import { requireMe } from "@/lib/auth";
import { getMembers, getProjectStats, getProjects } from "@/lib/data";
import { PortfolioTable } from "@/components/PortfolioTable";

export default async function Portfolios() {
  await requireMe();
  const [projects, stats, members] = await Promise.all([getProjects(), getProjectStats(), getMembers()]);
  const late = Object.values(stats).reduce((a, s) => a + s.overdue, 0);
  const noLead = projects.filter((p) => !p.lead_id).length;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-semibold">Portfolio · Events &amp; Outreach 2027</h1>
      <p className="mt-1 text-sm text-slate-500">“Are we choosing and executing the right projects well?” Every project&apos;s health at a glance.</p>
      <div className="my-6 flex flex-wrap gap-3 text-sm">
        <span className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200"><b>{projects.length}</b> active projects</span>
        <span className={`rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200 ${noLead ? "text-amber-700" : ""}`}><b>{noLead}</b> need a Project Lead</span>
        <span className={`rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200 ${late ? "text-rose-600" : ""}`}><b>{late}</b> late tasks</span>
      </div>
      <PortfolioTable projects={projects} stats={stats} members={members} />
    </div>
  );
}
