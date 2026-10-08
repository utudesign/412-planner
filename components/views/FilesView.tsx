import Link from "next/link";
import type { Attachment, Member } from "@/lib/types";
import { Avatar } from "../Avatar";
import { fmtBytes, fmtDateTime } from "@/lib/format";

type FileRow = Attachment & { url: string | null; task: { id: string; title: string } };

export function FilesView({ files, members }: { files: FileRow[]; members: Member[] }) {
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  if (!files.length)
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="text-3xl">📎</div>
        <p className="mt-2 font-medium">No files yet</p>
        <p className="mt-1 text-sm text-slate-500">Open any task and use “Attach files”. Everything attached in this project shows up here.</p>
      </div>
    );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {files.map((f) => {
        const isImg = /\.(png|jpe?g|gif|webp)$/i.test(f.file_name);
        return (
          <div key={f.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <a href={f.url ?? "#"} target="_blank" rel="noreferrer" className="flex h-32 items-center justify-center bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {isImg && f.url ? <img src={f.url} alt={f.file_name} className="h-full w-full object-cover" /> : <span className="text-4xl">📄</span>}
            </a>
            <div className="p-3 text-sm">
              <a href={f.url ?? "#"} target="_blank" rel="noreferrer" className="block truncate font-medium hover:underline">{f.file_name}</a>
              <Link href={`?view=files&task=${f.task.id}`} scroll={false} className="block truncate text-xs text-slate-500 hover:underline">on “{f.task.title}”</Link>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                <Avatar member={f.uploader_id ? byId[f.uploader_id] : null} size={16} />
                {fmtDateTime(f.created_at)} · {fmtBytes(f.size_bytes)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
