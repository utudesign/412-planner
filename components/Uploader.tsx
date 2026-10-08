"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createUpload, recordAttachment } from "@/app/actions";

const MAX = 25 * 1024 * 1024;

/** Uploads go browser → Supabase Storage via a one-time signed URL, so large files skip the server (Vercel's 4.5 MB body limit). */
export function Uploader({ taskId }: { taskId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX) { alert(`${file.name} is over 25 MB.`); continue; }
        setBusy(file.name);
        const { path, token } = await createUpload(taskId, file.name);
        const { error } = await supa.storage.from("attachments").uploadToSignedUrl(path, token, file, { contentType: file.type });
        if (error) throw error;
        await recordAttachment(taskId, path, file.name, file.size, file.type || "application/octet-stream");
      }
      router.refresh();
    } catch (e) {
      alert(`Upload failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input ref={input} type="file" multiple hidden onChange={(e) => onPick(e.target.files)} />
      <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => input.current?.click()}>
        {busy ? `Uploading ${busy.slice(0, 20)}…` : "📎 Attach files"}
      </button>
    </>
  );
}
