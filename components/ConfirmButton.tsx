"use client";
import { useTransition } from "react";

export function ConfirmButton({ action, message, children, className }: {
  action: () => Promise<void>; message: string; children: React.ReactNode; className?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        if (!confirm(message)) return;
        start(async () => { try { await action(); } catch (e) { const m = (e as Error).message ?? ""; if (!m.includes("NEXT_REDIRECT")) alert(m); } });
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}
