import type { Member, ProjectMessage } from "@/lib/types";
import { Avatar } from "../Avatar";
import { SubmitButton } from "../SubmitButton";
import { fmtDateTime } from "@/lib/format";
import { postMessage } from "@/app/actions";

export function Messages({ projectId, messages, members, me }: { projectId: string; messages: ProjectMessage[]; members: Member[]; me: Member }) {
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white">
      <ul className="max-h-[60vh] space-y-5 overflow-y-auto p-5">
        {messages.map((m) => {
          const a = m.author_id ? byId[m.author_id] : null;
          return (
            <li key={m.id} className="flex gap-3">
              <Avatar member={a} size={32} />
              <div className="min-w-0 flex-1">
                <div className="text-xs"><span className="font-semibold text-slate-800">{a?.name ?? "Former member"}</span>
                  <span className="ml-2 text-slate-400">{fmtDateTime(m.created_at)}</span></div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{m.body}</p>
              </div>
            </li>
          );
        })}
        {messages.length === 0 && (
          <li className="py-8 text-center text-sm text-slate-500">
            Start the conversation. Messages here go to everyone on the project, not to a single task.
          </li>
        )}
      </ul>
      <form action={postMessage.bind(null, projectId)} className="flex gap-2 border-t border-slate-200 bg-slate-50 p-4">
        <Avatar member={me} size={32} />
        <textarea name="body" rows={2} required placeholder="Message the project team…" className="input flex-1 resize-none" />
        <SubmitButton pendingText="…">Send</SubmitButton>
      </form>
    </div>
  );
}
