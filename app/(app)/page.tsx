import Link from "next/link";
import { requireMe } from "@/lib/auth";
import { getProjectStats, getProjects, getTasksWhere } from "@/lib/data";
import { ProjectCards } from "@/components/ProjectCards";
import { dueTone, fmtDate, todayET } from "@/lib/format";
import { isManager } from "@/lib/perm";

export default async function Home() {
  const me = await requireMe();
  const [projects, stats, mine] = await Promise.all([
    getProjects(), getProjectStats(), getTasksWhere({ assigneeId: me.id }),
  ]);
  const open = mine.filter((t) => t.status !== "done");
  const today = todayET();
  const overdue = open.filter((t) => t.due_date && t.due_date < today);
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }));
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <p className="text-sm text-slate-500">
        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" })}
      </p>
      <h1 className="text-2xl font-semibold">{greet}, {me.name.split(" ")[0]}</h1>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="My open tasks" value={open.length} href="/my-tasks" />
        <Stat label="Overdue" value={overdue.length} href="/my-tasks" tone={overdue.length ? "text-rose-600" : undefined} />
        <Stat label="Active projects" value={projects.length} href="#projects" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <section id="projects">
          <h2 className="mb-3 font-semibold">Projects</h2>
          <ProjectCards projects={projects} stats={stats} canCreate={isManager(me)} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3"><h2 className="font-semibold">Up next for you</h2></div>
          <ul className="divide-y divide-slate-100 text-sm">
            {open.slice(0, 8).map((t) => (
              <li key={t.id}>
                <Link href={`/projects/${t.project.id}?task=${t.id}`} className="flex items-start gap-2 px-4 py-2.5 hover:bg-slate-50">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-sm" style={{ background: t.project.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{t.title}</span>
                    <span className="block truncate text-xs text-slate-500">{t.project.name}</span>
                  </span>
                  <span className={`shrink-0 text-xs ${dueTone(t.due_date, false)}`}>{fmtDate(t.due_date)}</span>
                </Link>
              </li>
            ))}
            {open.length === 0 && <li className="px-4 py-8 text-center text-slate-500">Nothing assigned to you. 🙌</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, href, tone }: { label: string; value: number; href: string; tone?: string }) {
  return (
    <Link href={href} className="rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-brand-500">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${tone ?? ""}`}>{value}</div>
    </Link>
  );
}
