import type { Member } from "@/lib/types";
import { initials } from "@/lib/format";

const COLORS = ["bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-sky-500", "bg-violet-500", "bg-pink-500", "bg-teal-500"];

export function Avatar({ member, size = 24 }: { member?: Pick<Member, "name" | "image_url" | "id"> | null; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (!member)
    return <span style={style} className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400">?</span>;
  if (member.image_url)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={member.image_url} alt={member.name} title={member.name} style={style} className="shrink-0 rounded-full object-cover" />;
  const c = COLORS[[...member.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length];
  return (
    <span title={member.name} style={style} className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${c}`}>
      {initials(member.name)}
    </span>
  );
}
