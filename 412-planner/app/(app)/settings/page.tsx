import { requireMe } from "@/lib/auth";
import { saveNotificationPrefs } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";

const OPTIONS = [
  { key: "notify_assigned", title: "Task assigned to me", desc: "Right away, when someone assigns you a task." },
  { key: "notify_comments", title: "Comments on my tasks", desc: "Right away, when someone comments on a task you're assigned to, created, or commented on." },
  { key: "notify_due", title: "Due-date reminders", desc: "Daily at about 7 AM ET: tasks that are overdue, due today, or due tomorrow." },
  { key: "notify_digest", title: "Week-ahead list", desc: "Adds the rest of this week's tasks to the daily reminder." },
  { key: "notify_weekly", title: "Monday project summary", desc: "For Project Leads, the Coordinator and Admins: progress, overdue items and what's due this week." },
] as const;

export default async function Settings() {
  const me = await requireMe();
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-semibold">Notification settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Emails go to <b>{me.email ?? "no email on file"}</b>.{!me.email && " Ask an Admin to add your email on the Team page."}
      </p>
      <form action={saveNotificationPrefs} className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {OPTIONS.map((o) => (
          <label key={o.key} className="flex cursor-pointer items-start justify-between gap-4 px-5 py-4">
            <span>
              <span className="block text-sm font-medium">{o.title}</span>
              <span className="block text-sm text-slate-500">{o.desc}</span>
            </span>
            <input type="checkbox" name={o.key} defaultChecked={me[o.key]} className="peer sr-only" />
            <span className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-brand-600
              after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
          </label>
        ))}
        <div className="px-5 py-4"><SubmitButton>Save settings</SubmitButton></div>
      </form>
    </div>
  );
}
