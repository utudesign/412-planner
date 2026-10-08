import Link from "next/link";
import type { Member, Project, Section, Task } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { Avatar } from "./Avatar";
import { CheckToggle } from "./CheckToggle";
import { dueTone, fmtDate } from "@/lib/format";
import { createTask } from "@/app/actions";
import { canEditTask } from "@/lib/perm";

const STATUS_CLS = { todo: "bg-slate-100 text-slate-600", doing: "bg-sky-100 text-sky-800", done: "bg-emerald-100 text-emerald-800" };

export function ListView({ me, project, sections, tasks, members }: {
  me: Member; project: Project; sections: Section[]; tasks: Task[]; members: Member[];
}) {
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  const groups: { section: Section | null; tasks: Task[] }[] = [
    ...sections.map((s) => ({ section: s, tasks: tasks.filter((t) => t.section_id === s.id) })),
  ];
  const loose = tasks.filter((t) => !t.section_id || !sections.some((s) => s.id === t.section_id));
  if (loose.length) groups.unshift({ section: null, tasks: loose });

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="grid min-w-[680px] grid-cols-[1fr_160px_90px_100px] border-b border-slate-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        <span>Task</span><span>Assignee</span><span>Due</span><span>Status</span>
      </div>
      {groups.map(({ section, tasks: list }) => {
        const add = createTask.bind(null, project.id, section?.id ?? null);
        const open = list.filter((t) => t.status !== "done").length;
        return (
          <details key={section?.id ?? "none"} open className="group min-w-[680px] border-b border-slate-100 last:border-0">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 font-semibold hover:bg-slate-50">
              <span className="text-xs text-slate-400 transition group-open:rotate-90">▶</span>
              {section?.name ?? "No section"}
              {section?.kind === "gospel" && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-medium uppercase text-amber-800">Gospel lane</span>}
              <span className="text-xs font-normal text-slate-400">{open} open</span>
            </summary>
            {list.map((t) => {
              const a = t.assignee_id ? byId[t.assignee_id] : null;
              const editable = canEditTask(me, project, t, section);
              return (
                <div key={t.id} className="grid grid-cols-[1fr_160px_90px_100px] items-center border-t border-slate-100 px-4 py-2 text-sm hover:bg-slate-50">
                  <span className="flex min-w-0 items-center gap-2.5 pl-5">
                    <CheckToggle taskId={t.id} done={t.status === "done"} disabled={!editable} />
                    <Link href={`?view=list&task=${t.id}`} scroll={false}
                      className={`truncate hover:underline ${t.status === "done" ? "text-slate-400 line-through" : ""}`}>
                      {t.title}
                    </Link>
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
                    <Avatar member={a} size={20} /><span className="truncate">{a?.name ?? ""}</span>
                  </span>
                  <span className={`text-xs ${dueTone(t.due_date, t.status === "done")}`}>{fmtDate(t.due_date)}</span>
                  <span><span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLS[t.status]}`}>{STATUS_LABEL[t.status]}</span></span>
                </div>
              );
            })}
            <form action={add} className="flex items-center gap-2 border-t border-slate-100 px-4 py-1.5 pl-[52px]">
              <input name="title" placeholder="+ Add task…" className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-slate-400" />
              <select name="assignee_id" className="rounded border-0 bg-transparent text-xs text-slate-500" defaultValue={me.id}>
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input name="due_date" type="date" className="rounded border-0 bg-transparent text-xs text-slate-500" />
              <button type="submit" className="rounded px-2 py-0.5 text-xs font-medium text-brand-600 hover:bg-brand-50">Add</button>
            </form>
          </details>
        );
      })}
    </div>
  );
}
