import Link from "next/link";
import { requireMe } from "@/lib/auth";
import { getInbox, getMembers, getProjects } from "@/lib/data";
import { Avatar } from "@/components/Avatar";
import { fmtDateTime } from "@/lib/format";

const VERB = { comment: "commented on", assigned: "assigned you", message: "posted in", status: "posted a status update in" };

export default async function Inbox() {
  const me = await requireMe();
  const [items, members, projects] = await Promise.all([getInbox(me.id), getMembers(), getProjects()]);
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  const proj = Object.fromEntries(projects.map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-semibold">Inbox</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Comments on your tasks, new assignments, project messages and status updates from the last 30 days.</p>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {items.filter((i) => proj[i.projectId]).map((i) => {
          const actor = i.actorId ? byId[i.actorId] : null;
          const p = proj[i.projectId];
          const href = i.taskId ? `/projects/${p.id}?task=${i.taskId}` : `/projects/${p.id}?view=${i.kind === "status" ? "overview" : "messages"}`;
          return (
            <li key={i.id}>
              <Link href={href} className="flex gap-3 px-4 py-3 hover:bg-slate-50">
                <Avatar member={actor} size={32} />
                <div className="min-w-0 flex-1 text-sm">
                  <div>
                    <span className="font-semibold">{actor?.name ?? "Someone"}</span>{" "}
                    <span className="text-slate-500">{VERB[i.kind]}</span>{" "}
                    <span className="font-medium">{i.kind === "comment" || i.kind === "assigned" ? i.title : p.name}</span>
                  </div>
                  {i.body && <p className="mt-0.5 line-clamp-2 text-slate-600">{i.body}</p>}
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />{p.name} · {fmtDateTime(i.at)}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
        {items.length === 0 && <li className="px-4 py-14 text-center text-sm text-slate-500">You&apos;re all caught up. 🎉</li>}
      </ul>
    </div>
  );
}
