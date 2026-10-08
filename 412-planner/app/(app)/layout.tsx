import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { requireMe } from "@/lib/auth";
import { getProjects } from "@/lib/data";
import { ROLE_LABEL } from "@/lib/types";
import { isManager } from "@/lib/perm";
import { NavLink } from "@/components/NavLink";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMe();
  const projects = await getProjects();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-brand-900 text-slate-200 md:flex">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="rounded-md bg-white px-1.5 py-0.5 text-sm font-black text-brand-900">412</span>
          <span className="text-sm font-semibold text-white">Team Planner</span>
        </div>
        <nav className="space-y-0.5 px-2 text-sm">
          <NavLink href="/"><Icon d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />Home</NavLink>
          <NavLink href="/inbox"><Icon d="M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6H3v-6z" />Inbox</NavLink>
          <div className="my-2 border-t border-white/10" />
          <NavLink href="/my-tasks"><Icon d="M9 12l2 2 4-4M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />My tasks</NavLink>
          <NavLink href="/projects"><Icon d="M8 3h8l1 2h3v16H4V5h3zM8 11h8M8 15h5" />Projects</NavLink>
          <NavLink href="/portfolios"><Icon d="M3 7h18v13H3zM8 7V4h8v3" />Portfolios</NavLink>
          <NavLink href="/timeline"><Icon d="M4 6h10M8 12h12M4 18h8" />Timeline</NavLink>
          <div className="my-2 border-t border-white/10" />
          <NavLink href="/gospel"><Icon d="M12 3v18M7 8h10" />Gospel &amp; Outreach</NavLink>
          <NavLink href="/team"><Icon d="M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />Team</NavLink>
          <NavLink href="/settings"><Icon d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0" />Notifications</NavLink>
        </nav>
        <div className="mt-6 flex items-center justify-between px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Projects
          {isManager(me) && <Link href="/projects/new" className="rounded px-1.5 text-base leading-none text-slate-300 hover:bg-white/10" title="New project">+</Link>}
        </div>
        <nav className="mt-1 flex-1 space-y-0.5 overflow-y-auto px-2 text-sm">
          {projects.map((p) => (
            <NavLink key={p.id} href={`/projects/${p.id}`} prefix>
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} />
              <span className="truncate">{p.name}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
          <UserButton />
          <div className="min-w-0 text-xs">
            <div className="truncate font-medium text-white">{me.name}</div>
            <div className="truncate text-slate-400">{ROLE_LABEL[me.role]}</div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 overflow-x-auto bg-brand-900 px-4 py-2.5 text-sm text-slate-200 md:hidden">
          <span className="rounded bg-white px-1.5 text-xs font-black text-brand-900">412</span>
          <Link href="/">Home</Link>
          <Link href="/inbox">Inbox</Link>
          <Link href="/my-tasks" className="whitespace-nowrap">My tasks</Link>
          <Link href="/projects">Projects</Link>
          <Link href="/timeline">Timeline</Link>
          <Link href="/gospel">Gospel</Link>
          <Link href="/team">Team</Link>
          <Link href="/settings">Alerts</Link>
          <span className="ml-auto"><UserButton /></span>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
