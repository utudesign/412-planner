import Link from "next/link";
import type { Member, Section, Task } from "@/lib/types";
import { Avatar } from "../Avatar";
import { todayET } from "@/lib/format";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Month grid of tasks by due date (multi-day tasks show on each day from start to due). */
export function CalendarView({ tasks, sections, members, month, color, baseHref }: {
  tasks: Task[]; sections: Section[]; members: Member[]; month?: string; color: string; baseHref: string;
}) {
  const today = todayET();
  const [y, m] = (month && /^\d{4}-\d{2}$/.test(month) ? month : today.slice(0, 7)).split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const gridStart = new Date(first);
  gridStart.setUTCDate(1 - first.getUTCDay());
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setUTCDate(gridStart.getUTCDate() + i);
    return iso(d);
  });
  const weeks = days[35].slice(0, 7) === `${y}-${String(m).padStart(2, "0")}` ? 6 : 5;
  const byMember = Object.fromEntries(members.map((x) => [x.id, x]));
  const gospel = new Set(sections.filter((s) => s.kind === "gospel").map((s) => s.id));
  const prev = iso(new Date(Date.UTC(y, m - 2, 1))).slice(0, 7);
  const next = iso(new Date(Date.UTC(y, m, 1))).slice(0, 7);
  const sorted = [...tasks].sort((a, b) => (a.start_date ?? a.due_date ?? "").localeCompare(b.start_date ?? b.due_date ?? "") || a.id.localeCompare(b.id));
  const onDay = (d: string) =>
    sorted.filter((t) => {
      if (!t.due_date) return false;
      const s = t.start_date && t.start_date < t.due_date ? t.start_date : t.due_date;
      return d >= s && d <= t.due_date;
    });
  // Each week gets fixed lanes so a multi-day bar stays on the same row across days.
  const laneCache: Record<string, (Task | null)[]> = {};
  const lanesFor = (d: string) => {
    const wk = days[Math.floor(days.indexOf(d) / 7) * 7];
    if (!laneCache[wk]) {
      const weekDays = days.slice(days.indexOf(wk), days.indexOf(wk) + 7);
      const lanes: (Task | null)[][] = [];
      const placed: Task[] = [];
      for (const t of sorted) {
        const covered = weekDays.filter((x) => onDay(x).includes(t));
        if (!covered.length) continue;
        let lane = lanes.findIndex((l) => covered.every((x) => !l[weekDays.indexOf(x)]));
        if (lane === -1) { lanes.push(Array(7).fill(null)); lane = lanes.length - 1; }
        for (const x of covered) lanes[lane][weekDays.indexOf(x)] = t;
        placed.push(t);
      }
      weekDays.forEach((x, i) => { laneCache[x] = lanes.map((l) => l[i]); });
    }
    return laneCache[d];
  };
  const noDate = tasks.filter((t) => !t.due_date && t.status !== "done").length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-center gap-1">
          <Link href={`${baseHref}&month=${today.slice(0, 7)}`} scroll={false} className="btn-ghost py-1">Today</Link>
          <Link href={`${baseHref}&month=${prev}`} scroll={false} className="rounded px-2 py-1 text-lg text-slate-500 hover:bg-slate-100">‹</Link>
          <Link href={`${baseHref}&month=${next}`} scroll={false} className="rounded px-2 py-1 text-lg text-slate-500 hover:bg-slate-100">›</Link>
          <h2 className="ml-2 font-semibold">{first.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</h2>
        </div>
        {noDate > 0 && <span className="text-xs text-slate-500">{noDate} open task{noDate > 1 ? "s" : ""} without a due date</span>}
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-7">
          {WEEKDAYS.map((w) => <div key={w} className="border-b border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-500">{w}</div>)}
          {days.slice(0, weeks * 7).map((d) => {
            const inMonth = d.slice(5, 7) === String(m).padStart(2, "0");
            const list = onDay(d);
            return (
              <div key={d} className={`min-h-28 border-b border-r border-slate-100 p-1.5 ${inMonth ? "" : "bg-slate-50/70"}`}>
                <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs
                  ${d === today ? "bg-rose-500 font-semibold text-white" : inMonth ? "text-slate-700" : "text-slate-400"}`}>
                  {Number(d.slice(8))}
                </div>
                <div className="space-y-1">
                  {lanesFor(d).slice(0, 4).map((t, lane) => {
                    if (!t || !list.includes(t)) return <div key={`gap-${lane}`} className="h-[18px]" />;
                    const start = t.start_date && t.start_date < t.due_date! ? t.start_date : t.due_date!;
                    const isStart = d === start || new Date(d + "T00:00:00Z").getUTCDay() === 0;
                    const isEnd = d === t.due_date || new Date(d + "T00:00:00Z").getUTCDay() === 6;
                    return (
                      <Link key={t.id} href={`${baseHref}&month=${y}-${String(m).padStart(2, "0")}&task=${t.id}`} scroll={false}
                        className={`flex h-[18px] items-center gap-1 truncate px-1.5 text-[11px] leading-tight text-white hover:brightness-110
                          ${isStart ? "rounded-l" : "-ml-1.5 pl-0"} ${isEnd ? "rounded-r" : "-mr-1.5"} ${t.status === "done" ? "opacity-50 line-through" : ""}`}
                        style={{ background: t.section_id && gospel.has(t.section_id) ? "#d97706" : color }} title={t.title}>
                        {isStart && t.assignee_id && <Avatar member={byMember[t.assignee_id]} size={14} />}
                        {isStart && <span className="truncate">{t.title}</span>}
                      </Link>
                    );
                  })}
                  {list.length > lanesFor(d).slice(0, 4).filter((t) => t && list.includes(t)).length && <div className="px-1 text-[11px] text-slate-500">+{list.length - lanesFor(d).slice(0, 4).filter((t) => t && list.includes(t)).length} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
