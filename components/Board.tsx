"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { Member, Section, Task, TaskStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { setTaskStatus } from "@/app/actions";
import { Avatar } from "./Avatar";
import { dueTone, fmtDate } from "@/lib/format";

const COLUMNS: TaskStatus[] = ["todo", "doing", "done"];
const DOT = { todo: "bg-slate-400", doing: "bg-sky-500", done: "bg-emerald-500" };

export function Board({ tasks: initial, sections, members, editableIds }: {
  tasks: Task[]; sections: Section[]; members: Member[]; editableIds: string[];
}) {
  const [tasks, setTasks] = useState(initial);
  const [, start] = useTransition();
  useEffect(() => setTasks(initial), [initial]);

  const byMember = Object.fromEntries(members.map((m) => [m.id, m]));
  const bySection = Object.fromEntries(sections.map((s) => [s.id, s]));
  const editable = new Set(editableIds);
  const col = (s: TaskStatus) => tasks.filter((t) => t.status === s).sort((a, b) => a.position - b.position);

  function onDragEnd({ source, destination, draggableId }: DropResult) {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const to = destination.droppableId as TaskStatus;
    const target = col(to).filter((t) => t.id !== draggableId);
    const before = target[destination.index - 1]?.position;
    const after = target[destination.index]?.position;
    const position =
      before === undefined && after === undefined ? Date.now()
      : before === undefined ? after! - 1
      : after === undefined ? before + 1
      : (before + after) / 2;
    const prev = tasks;
    setTasks((ts) => ts.map((t) => (t.id === draggableId ? { ...t, status: to, position } : t)));
    start(async () => {
      try { await setTaskStatus(draggableId, to, position); }
      catch (e) { setTasks(prev); alert((e as Error).message); }
    });
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid gap-4 overflow-x-auto pb-4 md:grid-cols-3">
        {COLUMNS.map((status) => {
          const list = col(status);
          return (
            <div key={status} className="flex min-w-[260px] flex-col rounded-xl bg-slate-100/80">
              <div className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold">
                <span className={`h-2 w-2 rounded-full ${DOT[status]}`} />
                {STATUS_LABEL[status]}
                <span className="font-normal text-slate-500">{list.length}</span>
              </div>
              <Droppable droppableId={status}>
                {(drop, snap) => (
                  <div ref={drop.innerRef} {...drop.droppableProps}
                    className={`min-h-24 flex-1 space-y-2 px-2 pb-2 transition ${snap.isDraggingOver ? "bg-brand-50" : ""}`}>
                    {list.map((t, i) => {
                      const a = t.assignee_id ? byMember[t.assignee_id] : null;
                      const s = t.section_id ? bySection[t.section_id] : null;
                      return (
                        <Draggable key={t.id} draggableId={t.id} index={i} isDragDisabled={!editable.has(t.id)}>
                          {(drag, ds) => (
                            <div ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps}
                              className={`rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm ${ds.isDragging ? "rotate-1 shadow-lg" : "hover:border-slate-300"}`}>
                              {s && (
                                <span className={`mb-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide
                                  ${s.kind === "gospel" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                                  {s.name}
                                </span>
                              )}
                              <Link href={`?view=board&task=${t.id}`} scroll={false}
                                className={`block font-medium leading-snug hover:underline ${t.status === "done" ? "text-slate-400 line-through" : ""}`}>
                                {t.title}
                              </Link>
                              <div className="mt-2.5 flex items-center justify-between">
                                <Avatar member={a} size={22} />
                                <span className={`text-xs ${dueTone(t.due_date, t.status === "done")}`}>{fmtDate(t.due_date)}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {drop.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
