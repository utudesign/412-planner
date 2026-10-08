import { redirect } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { getMembers } from "@/lib/data";
import { isManager } from "@/lib/perm";
import { createProject } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";

const COLORS = ["#4f46e5", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#475569"];

export default async function NewProject() {
  const me = await requireMe();
  if (!isManager(me)) redirect("/");
  const members = await getMembers();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-semibold">New project</h1>
      <p className="mt-1 text-sm text-slate-500">Every project needs a clear purpose, a Project Lead, a timeline, and resources.</p>

      <form action={createProject} className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <label className="label" htmlFor="name">Project name</label>
          <input id="name" name="name" required className="input" placeholder="e.g. Open Mic — Chicago" />
        </div>
        <div>
          <label className="label" htmlFor="purpose">Purpose</label>
          <textarea id="purpose" name="purpose" rows={3} className="input" placeholder="Why are we doing this? Who is it for?" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="label" htmlFor="lead_id">Project Lead</label>
            <select id="lead_id" name="lead_id" className="input" defaultValue="">
              <option value="">Assign later</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="start_date">Start</label>
            <input id="start_date" name="start_date" type="date" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="end_date">Event / end date</label>
            <input id="end_date" name="end_date" type="date" className="input" />
          </div>
        </div>
        <fieldset>
          <legend className="label">Color</legend>
          <div className="flex gap-2">
            {COLORS.map((c, i) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="color" value={c} defaultChecked={i === 0} className="peer sr-only" />
                <span className="block h-7 w-7 rounded-md ring-offset-2 peer-checked:ring-2 peer-checked:ring-slate-900" style={{ background: c }} />
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-start gap-2 rounded-lg bg-brand-50 p-3 text-sm">
          <input type="checkbox" name="template" defaultChecked className="mt-0.5" />
          <span>
            <span className="font-medium">Use the 412 project template</span>
            <span className="block text-slate-600">
              Adds sections (Program, Logistics, Volunteers, Media, Finance, Gospel &amp; Outreach, Follow-up, Evaluation) and starter tasks
              assigned to the Project Lead, the Coordinator and the Gospel &amp; Outreach Coordinator, with due dates from the event date.
            </span>
          </span>
        </label>
        <SubmitButton>Create project</SubmitButton>
      </form>
    </div>
  );
}
