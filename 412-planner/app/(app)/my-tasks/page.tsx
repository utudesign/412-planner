import { requireMe } from "@/lib/auth";
import { getMembers, getTasksWhere } from "@/lib/data";
import { TaskBuckets } from "@/components/TaskBuckets";

export default async function MyTasks() {
  const me = await requireMe();
  const [rows, members] = await Promise.all([getTasksWhere({ assigneeId: me.id }), getMembers()]);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-semibold">My tasks</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Everything assigned to you across all 412 projects.</p>
      <TaskBuckets rows={rows} members={members} canToggle={() => true} />
    </div>
  );
}
