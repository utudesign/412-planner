const TZ = "America/New_York";

/** Date-only values (YYYY-MM-DD) are formatted in UTC so they never shift a day. */
export function fmtDate(d: string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  if (!d) return "";
  return new Date(d.slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

export function fmtDateTime(ts: string) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: TZ,
  }) + " ET";
}

/** Today's date in Eastern Time as YYYY-MM-DD. */
export function todayET() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function dueTone(due: string | null, done: boolean) {
  if (!due || done) return "text-slate-500";
  const t = todayET();
  if (due < t) return "text-rose-600 font-medium";
  if (due === t) return "text-amber-600 font-medium";
  return "text-slate-600";
}

export function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function fmtBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
