import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { getMembers, getMessages, getProject, getProjectFiles, getStatusUpdates } from "@/lib/data";
import { canEditTask, canManageProject, isManager } from "@/lib/perm";
import { PROJECT_STATUS, type ProjectStatus } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { addSection, archiveProject, createTask, updateProject } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { ListView } from "@/components/ListView";
import { Board } from "@/components/Board";
import { Timeline } from "@/components/Timeline";
import { TaskDrawer } from "@/components/TaskDrawer";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Overview } from "@/components/views/Overview";
import { CalendarView } from "@/components/views/CalendarView";
import { Dashboard } from "@/components/views/Dashboard";
import { FilesView } from "@/components/views/FilesView";
import { Messages } from "@/components/views/Messages";

const VIEWS = ["overview", "list", "board", "timeline", "dashboard", "calendar", "files", "messages"] as const;
type View = (typeof VIEWS)[number];

export default async function ProjectPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; task?: string; month?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const me = await requireMe();
  const [data, members] = await Promise.all([getProject(id), getMembers()]);
  if (!data) notFound();
  const { project, sections, tasks } = data;
  const view: View = (VIEWS as readonly string[]).includes(sp.view ?? "") ? (sp.view as View) : "list";
  const [updates, files, messages] = await Promise.all([
    view === "overview" ? getStatusUpdates(id) : Promise.resolve([]),
    view === "files" ? getProjectFiles(id) : Promise.resolve([]),
    view === "messages" ? getMessages(id) : Promise.resolve([]),
  ]);
  const lead = members.find((m) => m.id === project.lead_id) ?? null;
  const manage = canManageProject(me, project);
  const done = tasks.filter((t) => t.status === "done").length;
  const byMember = Object.fromEntries(members.map((m) => [m.id, m]));

  return (
    <div className="px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: project.color }} />
            <h1 className="truncate text-2xl font-semibold">{project.name}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PROJECT_STATUS[project.status].cls}`}>
              {PROJECT_STATUS[project.status].label}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">Project Lead</span>
              {lead ? <><Avatar member={lead} size={20} />{lead.name}</> : <span className="text-amber-600">Not assigned</span>}
            </span>
            {(project.start_date || project.end_date) && (
              <span><span className="text-slate-400">Dates</span> {fmtDate(project.start_date)} – {fmtDate(project.end_date, { month: "short", day: "numeric", year: "numeric" })}</span>
            )}
            <span><span className="text-slate-400">Progress</span> {done}/{tasks.length}</span>
          </div>
        </div>
      </header>

      <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200 text-sm">
        {VIEWS.map((v) => (
          <Link key={v} href={`?view=${v}`} scroll={false}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 capitalize ${view === v ? "border-brand-600 font-medium text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {v}
          </Link>
        ))}
      </nav>

      {view === "overview" && (manage || me.role === "gospel") && (
      <details className="mt-4 rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          ✎ Edit project details
        </summary>
        <form action={updateProject.bind(null, project.id)} className="grid gap-4 border-t border-slate-200 p-4 md:grid-cols-2">
          <fieldset disabled={!manage} className="contents">
            <div className="md:col-span-2">
              <label className="label">Name</label>
              <input name="name" defaultValue={project.name} className="input" />
            </div>
            <div>
              <label className="label">Purpose</label>
              <textarea name="purpose" rows={4} defaultValue={project.purpose ?? ""} className="input" />
            </div>
          </fieldset>
          <fieldset disabled={!manage && me.role !== "gospel"}>
            <label className="label">Gospel purpose <span className="normal-case text-amber-700">(Gospel &amp; Outreach lane)</span></label>
            <textarea name="gospel_purpose" rows={4} defaultValue={project.gospel_purpose ?? ""} className="input"
              placeholder="How will the Gospel be shared at this event?" />
          </fieldset>
          <fieldset disabled={!manage} className="grid gap-4 sm:grid-cols-2 md:col-span-2 md:grid-cols-5">
            <div>
              <label className="label">Project Lead</label>
              <select name="lead_id" defaultValue={project.lead_id ?? ""} className="input" disabled={!isManager(me)}>
                <option value="">Not assigned</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" defaultValue={project.status} className="input">
                {(Object.keys(PROJECT_STATUS) as ProjectStatus[]).map((s) => <option key={s} value={s}>{PROJECT_STATUS[s].label}</option>)}
              </select>
            </div>
            <div><label className="label">Start</label><input type="date" name="start_date" defaultValue={project.start_date ?? ""} className="input" /></div>
            <div><label className="label">End / event</label><input type="date" name="end_date" defaultValue={project.end_date ?? ""} className="input" /></div>
            <div><label className="label">Color</label><input type="color" name="color" defaultValue={project.color} className="h-[34px] w-full rounded-md border border-slate-300" /></div>
          </fieldset>
          {(manage || me.role === "gospel") && <div className="md:col-span-2"><SubmitButton>Save project</SubmitButton></div>}
        </form>
        {manage && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <span />
            {isManager(me) && (
              <ConfirmButton action={archiveProject.bind(null, project.id)} message="Archive this project? It will be hidden from everyone."
                className="text-sm text-rose-600 hover:underline">Archive project</ConfirmButton>
            )}
          </div>
        )}
      </details>
      )}

      <div className="mt-4">
        {view === "overview" && (
          <Overview project={project} sections={sections} tasks={tasks} members={members} updates={updates} canManage={manage} />
        )}
        {view === "list" && (
          <>
            <form action={createTask.bind(null, project.id, sections[0]?.id ?? null)} className="mb-3 flex flex-wrap items-center gap-2">
              <input name="title" required placeholder="Task name" className="input w-64" />
              <input type="hidden" name="assignee_id" value={me.id} />
              <SubmitButton pendingText="Adding…">+ Add task</SubmitButton>
              <span className="text-xs text-slate-400">Adds to {sections[0]?.name ?? "the project"}. Use “Add task” under any section to add it there.</span>
            </form>
            <ListView me={me} project={project} sections={sections} tasks={tasks} members={members} />
            {manage && (
              <form action={addSection.bind(null, project.id)} className="mt-3 flex items-center gap-2">
                <input name="name" required placeholder="+ Add section" className="input w-56 border-dashed" />
                <SubmitButton className="btn-ghost">Add</SubmitButton>
              </form>
            )}
          </>
        )}
        {view === "dashboard" && <Dashboard tasks={tasks} sections={sections} members={members} color={project.color} />}
        {view === "calendar" && (
          <CalendarView tasks={tasks} sections={sections} members={members} month={sp.month} color={project.color} baseHref="?view=calendar" />
        )}
        {view === "files" && <FilesView files={files} members={members} />}
        {view === "messages" && <Messages projectId={project.id} messages={messages} members={members} me={me} />}
        {view === "board" && (
          <Board tasks={tasks} sections={sections} members={members}
            editableIds={tasks.filter((t) => canEditTask(me, project, t, sections.find((s) => s.id === t.section_id))).map((t) => t.id)} />
        )}
        {view === "timeline" && (
          <Timeline
            rows={[...sections, { id: null, name: "No section", kind: "general" as const }].flatMap((s) =>
              tasks.filter((t) => (s.id ? t.section_id === s.id : !sections.some((x) => x.id === t.section_id))).sort((a, b) => (a.due_date ?? "9").localeCompare(b.due_date ?? "9")).map((t) => ({
                id: t.id, label: t.title, group: s.name, color: s.kind === "gospel" ? "#d97706" : project.color,
                start: t.start_date, end: t.due_date, href: `?view=timeline&task=${t.id}`, done: t.status === "done",
                meta: t.assignee_id ? byMember[t.assignee_id]?.name : undefined,
              })),
            )}
          />
        )}
      </div>

      {sp.task && (
        <TaskDrawer taskId={sp.task} me={me} project={project} sections={sections} members={members} closeHref={`?view=${view}${sp.month ? `&month=${sp.month}` : ""}`} />
      )}
    </div>
  );
}
