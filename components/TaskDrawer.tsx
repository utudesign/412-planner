import Link from "next/link";
import type { Member, Project, Section } from "@/lib/types";
import { getTaskDetail } from "@/lib/data";
import { canDeleteTask, canEditTask, canManageProject } from "@/lib/perm";
import { addComment, deleteAttachment, deleteTask, updateTask } from "@/app/actions";
import { Avatar } from "./Avatar";
import { SubmitButton } from "./SubmitButton";
import { Uploader } from "./Uploader";
import { ConfirmButton } from "./ConfirmButton";
import { fmtBytes, fmtDateTime } from "@/lib/format";

export async function TaskDrawer({ taskId, me, project, sections, members, closeHref }: {
  taskId: string; me: Member; project: Project; sections: Section[]; members: Member[]; closeHref: string;
}) {
  const detail = await getTaskDetail(taskId);
  if (!detail || detail.task.project_id !== project.id) return null;
  const { task, comments, attachments } = detail;
  const section = sections.find((s) => s.id === task.section_id) ?? null;
  const editable = canEditTask(me, project, task, section);
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  const save = updateTask.bind(null, task.id);
  const comment = addComment.bind(null, task.id);

  return (
    <>
      <Link href={closeHref} scroll={false} aria-label="Close" className="fixed inset-0 z-30 bg-slate-900/20" />
      <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: project.color }} />
            {project.name}{section ? ` · ${section.name}` : ""}
          </span>
          <div className="flex items-center gap-1">
            {canDeleteTask(me, project) && (
              <ConfirmButton action={deleteTask.bind(null, task.id)} message="Delete this task and its comments and files?"
                className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">Delete</ConfirmButton>
            )}
            <Link href={closeHref} scroll={false} className="rounded px-2 py-1 text-lg leading-none text-slate-500 hover:bg-slate-100">×</Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form action={save} className="space-y-4 px-5 py-4">
            <fieldset disabled={!editable} className="space-y-4">
              <input name="title" defaultValue={task.title} required
                className="w-full rounded-md border border-transparent px-1 py-1 text-xl font-semibold outline-none hover:border-slate-200 focus:border-brand-500" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Assignee</label>
                  <select name="assignee_id" defaultValue={task.assignee_id ?? ""} className="input">
                    <option value="">Unassigned</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select name="status" defaultValue={task.status} className="input">
                    <option value="todo">To do</option>
                    <option value="doing">In progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="label">Start date</label>
                  <input type="date" name="start_date" defaultValue={task.start_date ?? ""} className="input" />
                </div>
                <div>
                  <label className="label">Due date</label>
                  <input type="date" name="due_date" defaultValue={task.due_date ?? ""} className="input" />
                </div>
                <div>
                  <label className="label">Section</label>
                  <select name="section_id" defaultValue={task.section_id ?? ""} className="input">
                    <option value="">No section</option>
                    {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select name="priority" defaultValue={task.priority ?? ""} className="input">
                    <option value="">—</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea name="description" rows={5} defaultValue={task.description ?? ""} className="input" placeholder="Add details, links, checklists…" />
              </div>
            </fieldset>
            {editable ? (
              <SubmitButton>Save changes</SubmitButton>
            ) : (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                View only. The assignee, the Project Lead{section?.kind === "gospel" ? ", the Gospel & Outreach Coordinator" : ""} and the Coordinator can edit this task. You can still comment and attach files.
              </p>
            )}
          </form>

          <section className="border-t border-slate-200 px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Files {attachments.length > 0 && <span className="font-normal text-slate-400">{attachments.length}</span>}</h3>
              <Uploader taskId={task.id} />
            </div>
            <ul className="space-y-1.5">
              {attachments.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <span>📄</span>
                  {a.url ? <a href={a.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-brand-700 hover:underline">{a.file_name}</a>
                    : <span className="min-w-0 flex-1 truncate">{a.file_name}</span>}
                  <span className="text-xs text-slate-400">{fmtBytes(a.size_bytes)}</span>
                  {(a.uploader_id === me.id || canManageProject(me, project)) && (
                    <ConfirmButton action={deleteAttachment.bind(null, a.id)} message={`Delete ${a.file_name}?`}
                      className="text-xs text-slate-400 hover:text-rose-600">✕</ConfirmButton>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t border-slate-200 px-5 py-4">
            <h3 className="mb-3 text-sm font-semibold">Comments</h3>
            <ul className="space-y-4">
              {comments.map((c) => {
                const a = c.author_id ? byId[c.author_id] : null;
                return (
                  <li key={c.id} className="flex gap-3">
                    <Avatar member={a} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs"><span className="font-semibold text-slate-800">{a?.name ?? "Former member"}</span>
                        <span className="ml-2 text-slate-400">{fmtDateTime(c.created_at)}</span></div>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{c.body}</p>
                    </div>
                  </li>
                );
              })}
              {comments.length === 0 && <li className="text-sm text-slate-400">No comments yet.</li>}
            </ul>
          </section>
        </div>

        <form action={comment} className="flex gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <Avatar member={me} size={28} />
          <textarea name="body" rows={2} required placeholder="Write a comment…" className="input flex-1 resize-none" />
          <SubmitButton pendingText="…">Send</SubmitButton>
        </form>
      </aside>
    </>
  );
}
