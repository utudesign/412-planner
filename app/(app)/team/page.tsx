import { requireMe } from "@/lib/auth";
import { getMembers } from "@/lib/data";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { removeMember, saveMember } from "@/app/actions";

const ROLE_HELP: Record<Role, string> = {
  admin: "Events & Outreach Lead: manages the team, creates projects, assigns Project Leads",
  coordinator: "Project & Calendar Coordinator: can edit every project and its timeline",
  gospel: "Gospel & Outreach Coordinator: owns the Gospel lane in every project",
  member: "Can view everything, add tasks, comment, and update tasks assigned to them. Becomes Project Lead when assigned.",
};

export default async function Team() {
  const me = await requireMe();
  const members = await getMembers();
  const admin = me.role === "admin";
  const roles = Object.keys(ROLE_LABEL) as Role[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-semibold">Team</h1>
      <p className="mt-1 text-sm text-slate-500">
        {admin
          ? "Add people here first, then invite the same email in Clerk. When they sign in, their account links to this row automatically."
          : "Who's on the 412 planner."}
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-2 font-medium">Name</th><th className="px-2 py-2 font-medium">Title</th>
              <th className="px-2 py-2 font-medium">Email</th><th className="px-2 py-2 font-medium">Role</th>
              <th className="px-2 py-2 font-medium">Signed in</th><th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const formId = `m-${m.id}`;
              return (
                <tr key={m.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar member={m} size={26} />
                      {admin ? <input form={formId} name="name" defaultValue={m.name} className="input w-36" /> : <span className="font-medium">{m.name}</span>}
                    </div>
                  </td>
                  <td className="px-2 py-2">{admin ? <input form={formId} name="title" defaultValue={m.title ?? ""} className="input" /> : m.title}</td>
                  <td className="px-2 py-2">{admin ? <input form={formId} name="email" type="email" defaultValue={m.email ?? ""} className="input" /> : <span className="text-slate-500">{m.email}</span>}</td>
                  <td className="px-2 py-2">
                    {admin ? (
                      <select form={formId} name="role" defaultValue={m.role} className="input" disabled={m.id === me.id}>
                        {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                    ) : ROLE_LABEL[m.role]}
                    {admin && m.id === me.id && <input form={formId} type="hidden" name="role" value={m.role} />}
                  </td>
                  <td className="px-2 py-2">{m.clerk_user_id ? <span className="text-emerald-600">● Yes</span> : <span className="text-slate-400">Invited</span>}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    {admin && (
                      <form id={formId} action={saveMember.bind(null, m.id)} className="inline-flex items-center gap-2">
                        <SubmitButton className="btn-ghost">Save</SubmitButton>
                        {m.id !== me.id && (
                          <ConfirmButton action={removeMember.bind(null, m.id)} message={`Remove ${m.name}? Their tasks become unassigned.`}
                            className="text-xs text-rose-600 hover:underline">Remove</ConfirmButton>
                        )}
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {admin && (
        <form action={saveMember.bind(null, null)} className="mt-4 grid gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-4 sm:grid-cols-[1fr_1fr_1fr_160px_auto] sm:items-end">
          <div><label className="label">Name</label><input name="name" required className="input" /></div>
          <div><label className="label">Title</label><input name="title" className="input" placeholder="e.g. Open Mic Project Lead" /></div>
          <div><label className="label">Email</label><input name="email" type="email" className="input" /></div>
          <div><label className="label">Role</label>
            <select name="role" defaultValue="member" className="input">{roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
          </div>
          <SubmitButton>Add person</SubmitButton>
        </form>
      )}

      <dl className="mt-8 grid gap-3 sm:grid-cols-2">
        {roles.map((r) => (
          <div key={r} className="rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200">
            <dt className="font-semibold">{ROLE_LABEL[r]}</dt>
            <dd className="mt-0.5 text-slate-600">{ROLE_HELP[r]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
