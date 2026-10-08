"use client";
import { useOptimistic, useTransition } from "react";
import { toggleDone } from "@/app/actions";

export function CheckToggle({ taskId, done, disabled }: { taskId: string; done: boolean; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [optimistic, set] = useOptimistic(done);
  return (
    <button
      type="button"
      disabled={disabled || pending}
      title={disabled ? "Only the assignee or Project Lead can change this" : optimistic ? "Mark incomplete" : "Mark complete"}
      onClick={() =>
        start(async () => {
          set(!optimistic);
          try { await toggleDone(taskId, !optimistic); } catch (e) { alert((e as Error).message); }
        })
      }
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border text-[10px] transition
        ${optimistic ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-400 text-transparent hover:border-emerald-500 hover:text-emerald-500"}
        disabled:cursor-not-allowed disabled:opacity-60`}
    >
      ✓
    </button>
  );
}
