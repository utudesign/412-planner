import Link from "next/link";
import { todayET } from "@/lib/format";

export interface TimelineRow {
  id: string;
  label: string;
  group?: string;
  color: string;
  start: string | null;
  end: string | null;
  href: string;
  done?: boolean;
  meta?: string;
}

const DAY = 86_400_000;
const toMs = (d: string) => Date.parse(d + "T00:00:00Z");

/**
 * Gantt-style timeline. A row with only a due date shows as a milestone (◆);
 * a row with start + end shows as a bar. Rows with no dates are listed at the bottom.
 */
export function Timeline({ rows, emptyText = "Add start and due dates to see items here." }: { rows: TimelineRow[]; emptyText?: string }) {
  const dated = rows.filter((r) => r.start || r.end);
  const undated = rows.filter((r) => !r.start && !r.end);
  if (!dated.length)
    return <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">{emptyText}</div>;

  const today = todayET();
  const allDates = dated.flatMap((r) => [r.start, r.end].filter(Boolean) as string[]).concat(today);
  const first = new Date(Math.min(...allDates.map(toMs)));
  const last = new Date(Math.max(...allDates.map(toMs)));
  const min = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1);
  const max = Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 1);
  const span = max - min;
  const pct = (ms: number) => ((ms - min) / span) * 100;

  const months: { label: string; left: number; width: number }[] = [];
  for (let d = new Date(min); d.getTime() < max; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const s = d.getTime();
    const e = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    months.push({
      label: d.toLocaleDateString("en-US", { month: "short", year: d.getUTCMonth() === 0 || s === min ? "2-digit" : undefined, timeZone: "UTC" }),
      left: pct(s), width: pct(e) - pct(s),
    });
  }
  const widthPx = Math.max(720, months.length * 90);
  let lastGroup: string | undefined;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="grid" style={{ gridTemplateColumns: `220px ${widthPx}px` }}>
        <div className="sticky left-0 z-20 border-b border-r border-slate-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">Item</div>
        <div className="relative h-9 border-b border-slate-200">
          {months.map((m) => (
            <div key={m.left} className="absolute top-0 h-full border-l border-slate-200 px-2 pt-2 text-xs text-slate-500" style={{ left: `${m.left}%`, width: `${m.width}%` }}>
              {m.label}
            </div>
          ))}
        </div>

        {dated.map((r) => {
          const header = r.group && r.group !== lastGroup ? r.group : null;
          lastGroup = r.group;
          const s = toMs(r.start ?? r.end!);
          const e = toMs(r.end ?? r.start!) + DAY;
          const milestone = !r.start || !r.end || r.start === r.end;
          return (
            <Row key={r.id} header={header} months={months} todayPct={pct(toMs(today))}>
              <Link href={r.href} scroll={false} className="block truncate text-sm hover:underline" title={r.label}>
                <span className={r.done ? "text-slate-400 line-through" : ""}>{r.label}</span>
                {r.meta && <span className="block truncate text-xs text-slate-500">{r.meta}</span>}
              </Link>
              {milestone ? (
                <Link href={r.href} scroll={false} title={r.label}
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px]"
                  style={{ left: `${pct(toMs(r.end ?? r.start!))}%`, background: r.done ? "#94a3b8" : r.color }} />
              ) : (
                <Link href={r.href} scroll={false} title={r.label}
                  className="absolute top-1/2 h-5 -translate-y-1/2 rounded-md px-2 text-[11px] leading-5 text-white shadow-sm hover:brightness-110"
                  style={{ left: `${pct(s)}%`, width: `${Math.max(pct(e) - pct(s), 0.6)}%`, background: r.done ? "#94a3b8" : r.color }}>
                  <span className="block truncate">{r.label}</span>
                </Link>
              )}
            </Row>
          );
        })}
      </div>
      {undated.length > 0 && (
        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          {undated.length} item{undated.length > 1 ? "s" : ""} without dates:{" "}
          {undated.slice(0, 6).map((r, i) => (
            <span key={r.id}>{i > 0 && ", "}<Link href={r.href} scroll={false} className="hover:underline">{r.label}</Link></span>
          ))}
          {undated.length > 6 && "…"}
        </div>
      )}
    </div>
  );
}

function Row({ header, months, todayPct, children }: {
  header: string | null; months: { left: number }[]; todayPct: number; children: [React.ReactNode, React.ReactNode];
}) {
  const grid = (
    <>
      {months.map((m) => <div key={m.left} className="absolute top-0 h-full border-l border-slate-100" style={{ left: `${m.left}%` }} />)}
      <div className="absolute top-0 z-10 h-full w-px bg-rose-400" style={{ left: `${todayPct}%` }} />
    </>
  );
  return (
    <>
      {header && (
        <>
          <div className="sticky left-0 z-20 border-r border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-600">{header}</div>
          <div className="relative bg-slate-50">{grid}</div>
        </>
      )}
      <div className="sticky left-0 z-20 border-r border-t border-slate-100 border-r-slate-200 bg-white px-4 py-2">{children[0]}</div>
      <div className="relative h-11 border-t border-slate-100">{grid}{children[1]}</div>
    </>
  );
}
