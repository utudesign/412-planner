import { requireMe } from "@/lib/auth";
import { getProjectStats, getProjects } from "@/lib/data";
import { isManager } from "@/lib/perm";
import { ProjectCards } from "@/components/ProjectCards";

export default async function Projects() {
  const me = await requireMe();
  const [projects, stats] = await Promise.all([getProjects(), getProjectStats()]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <h1 className="mb-6 text-2xl font-semibold">Projects</h1>
      <ProjectCards projects={projects} stats={stats} canCreate={isManager(me)} />
    </div>
  );
}
