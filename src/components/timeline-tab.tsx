"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { addTask, updateProgress, renameTask, reorderTasks, addTaskPhotos } from "@/app/(dashboard)/projects/[id]/task-actions";
import { createClient } from "@/lib/supabase/client";

export type Task = {
  id: string; name: string; start_date: string | null; end_date: string | null;
  progress: number; assignee: string | null; photos?: string[];
};

// ── Inline-editable task name ──────────────────────────────────────────────
function TaskName({ task, projectId, canEdit }: { task: Task; projectId: string; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(task.name);
  if (!canEdit) return <span className="font-medium">{val}</span>;
  if (editing) return (
    <input autoFocus value={val}
      className="font-medium border-b bg-transparent outline-none w-full"
      onChange={(e) => setVal(e.target.value)}
      onBlur={async () => { setEditing(false); if (val.trim() && val !== task.name) await renameTask(task.id, projectId, val.trim()); }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
  return <span className="font-medium cursor-text hover:underline decoration-dashed" onClick={() => setEditing(true)}>{val}</span>;
}

// ── Progress selector ──────────────────────────────────────────────────────
function ProgressBar({ task, projectId, canEdit }: { task: Task; projectId: string; canEdit: boolean }) {
  const [val, setVal] = useState(task.progress);
  const [saving, setSaving] = useState(false);
  async function save(next: number) {
    setSaving(true); setVal(next);
    await updateProgress(task.id, projectId, next).finally(() => setSaving(false));
  }
  const color = val === 100 ? "bg-green-500" : val >= 50 ? "bg-blue-500" : "bg-amber-400";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${val}%` }} />
      </div>
      <span className="text-xs w-8 text-right">{val}%</span>
      {canEdit && (
        <select value={val} disabled={saving} onChange={(e) => save(Number(e.target.value))}
          className="h-7 rounded border text-xs px-1 bg-transparent">
          {[0,10,20,30,40,50,60,70,80,90,100].map((n) => <option key={n} value={n}>{n}%</option>)}
        </select>
      )}
    </div>
  );
}

// ── Photo thumbnail strip ─────────────────────────────────────────────────
function PhotoStrip({ paths, onAdd, canEdit, taskId, projectId }: {
  paths: string[]; onAdd: (p: string[]) => void; canEdit: boolean; taskId: string; projectId: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>([]);

  // sign URLs on mount
  useState(() => {
    (async () => {
      const supabase = createClient();
      const signed = await Promise.all(paths.map(async (p) => {
        const { data } = await supabase.storage.from("Document").createSignedUrl(p, 3600);
        return data?.signedUrl ?? "#";
      }));
      setUrls(signed);
    })();
  });

  async function upload(files: FileList) {
    const supabase = createClient();
    const newPaths: string[] = [];
    for (const file of Array.from(files)) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `tasks/${taskId}/${Date.now()}-${safe}`;
      await supabase.storage.from("Document").upload(path, file, { contentType: file.type });
      newPaths.push(path);
    }
    await addTaskPhotos(taskId, projectId, newPaths);
    onAdd(newPaths);
  }

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {urls.map((u, i) => (
        <img key={i} src={u} alt="" onClick={() => setPreview(u)}
          className="h-12 w-12 object-cover rounded cursor-pointer border hover:opacity-80" />
      ))}
      {canEdit && (
        <>
          <button onClick={() => fileRef.current?.click()}
            className="h-12 w-12 rounded border-2 border-dashed text-muted-foreground hover:border-primary text-xl flex items-center justify-center">+</button>
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.length && upload(e.target.files)} />
        </>
      )}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={() => setPreview(null)}>
          <img src={preview} alt="" className="max-h-[90vh] max-w-[90vw] rounded-lg" />
        </div>
      )}
    </div>
  );
}

// ── Draggable row ─────────────────────────────────────────────────────────
function DraggableRow({ task, projectId, canEdit, members }: {
  task: Task; projectId: string; canEdit: boolean;
  members: { id: string; full_name: string }[];
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: !canEdit });
  const [showPhotos, setShowPhotos] = useState(false);
  const [localPhotos, setLocalPhotos] = useState(task.photos ?? []);
  const now = new Date().toISOString().split("T")[0];
  const overdue = task.end_date && task.end_date < now && task.progress < 100;

  return (
    <tr ref={setNodeRef} className={`border-b ${isDragging ? "opacity-40" : "hover:bg-muted/20"}`}>
      <td className="px-2 py-3 w-6">
        {canEdit && (
          <span {...listeners} {...attributes} className="cursor-grab text-muted-foreground select-none">⠿</span>
        )}
      </td>
      <td className="px-2 py-3">
        <div className="space-y-1">
          <TaskName task={task} projectId={projectId} canEdit={canEdit} />
          {localPhotos.length > 0 && (
            <button onClick={() => setShowPhotos(v => !v)} className="text-xs text-blue-600 hover:underline">
              {showPhotos ? "ซ่อนรูป" : `รูปภาพ (${localPhotos.length})`}
            </button>
          )}
          {showPhotos && (
            <PhotoStrip paths={localPhotos} taskId={task.id} projectId={projectId} canEdit={canEdit}
              onAdd={(p) => setLocalPhotos(v => [...v, ...p])} />
          )}
          {canEdit && !showPhotos && localPhotos.length === 0 && (
            <button onClick={() => setShowPhotos(true)} className="text-xs text-muted-foreground hover:text-foreground">+ รูปหน้างาน</button>
          )}
        </div>
      </td>
      <td className="px-2 py-3 hidden md:table-cell text-sm text-muted-foreground">{task.assignee ?? "—"}</td>
      <td className="px-2 py-3 hidden sm:table-cell text-xs text-muted-foreground">
        {task.start_date && task.end_date ? `${task.start_date} → ${task.end_date}` : task.start_date ?? "—"}
        {overdue && <Badge variant="destructive" className="ml-2 text-[10px]">เกินกำหนด</Badge>}
      </td>
      <td className="px-2 py-3 w-48">
        <ProgressBar task={task} projectId={projectId} canEdit={canEdit} />
      </td>
    </tr>
  );
}

// ── Drop zone between rows ────────────────────────────────────────────────
function DropZone({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <tr ref={setNodeRef}>
      <td colSpan={5} className={`h-1 transition-all ${isOver ? "bg-primary h-2" : ""}`} />
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function TimelineTab({ projectId, tasks: initial, members, canEdit }: {
  projectId: string; tasks: Task[]; members: { id: string; full_name: string }[]; canEdit: boolean;
}) {
  const [tasks, setTasks] = useState(initial);
  const [open, setOpen] = useState(false);
  const now = new Date().toISOString().split("T")[0];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function onDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const fromId = String(e.active.id);
    const dropZoneId = String(e.over.id);
    // dropZone id format: "drop-N" where N is the index to insert before
    const toIndex = dropZoneId.startsWith("drop-") ? parseInt(dropZoneId.slice(5)) : -1;
    if (toIndex < 0) return;

    const fromIndex = tasks.findIndex((t) => t.id === fromId);
    if (fromIndex < 0) return;

    const next = [...tasks];
    const [moved] = next.splice(fromIndex, 1);
    const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
    next.splice(insertAt, 0, moved);
    setTasks(next);
    await reorderTasks(projectId, next.map((t) => t.id));
  }

  // Gantt
  const dated = tasks.filter((t) => t.start_date && t.end_date);
  const minDate = dated.length ? dated.reduce((m, t) => t.start_date! < m ? t.start_date! : m, dated[0].start_date!) : now;
  const maxDate = dated.length ? dated.reduce((m, t) => t.end_date! > m ? t.end_date! : m, dated[0].end_date!) : now;
  const totalDays = Math.max(Math.round((new Date(maxDate).getTime() - new Date(minDate).getTime()) / 86400000), 1);

  return (
    <div className="space-y-6">
      {canEdit && (
        <div>
          {!open ? (
            <Button onClick={() => setOpen(true)}>+ เพิ่ม Task</Button>
          ) : (
            <form action={async (fd) => { await addTask(projectId, fd); setOpen(false); }}
              className="rounded-xl border p-4 grid gap-3 sm:grid-cols-2">
              <Input name="name" placeholder="ชื่องาน" required className="sm:col-span-2" />
              <div className="space-y-1"><label className="text-xs text-muted-foreground">วันเริ่ม</label><Input name="start_date" type="date" /></div>
              <div className="space-y-1"><label className="text-xs text-muted-foreground">วันสิ้นสุด</label><Input name="end_date" type="date" /></div>
              <select name="assignee_id" className="h-9 rounded-md border bg-transparent px-3 text-sm">
                <option value="">— ผู้รับผิดชอบ —</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
              <div className="flex gap-2">
                <Button type="submit">บันทึก</Button>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>ยกเลิก</Button>
              </div>
            </form>
          )}
        </div>
      )}

      {tasks.length === 0 && <p className="text-muted-foreground py-6 text-center">ยังไม่มี task</p>}

      {/* Task table with drag-and-drop */}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-6" />
                <th className="text-left px-2 py-2 font-medium">งาน</th>
                <th className="text-left px-2 py-2 font-medium hidden md:table-cell">ผู้รับผิดชอบ</th>
                <th className="text-left px-2 py-2 font-medium hidden sm:table-cell">วันที่</th>
                <th className="text-left px-2 py-2 font-medium w-48">ความคืบหน้า</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, i) => (
                <>
                  <DropZone key={`drop-${i}`} id={`drop-${i}`} />
                  <DraggableRow key={t.id} task={t} projectId={projectId} canEdit={canEdit} members={members} />
                </>
              ))}
              <DropZone key={`drop-${tasks.length}`} id={`drop-${tasks.length}`} />
            </tbody>
          </table>
        </div>
      </DndContext>

      {/* Gantt */}
      {dated.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Gantt View</h3>
          <div className="rounded-xl border p-4 overflow-x-auto">
            <div className="space-y-2 min-w-[500px]">
              {dated.map((t) => {
                const left = (Math.round((new Date(t.start_date!).getTime() - new Date(minDate).getTime()) / 86400000) / totalDays) * 100;
                const width = Math.max((Math.round((new Date(t.end_date!).getTime() - new Date(t.start_date!).getTime()) / 86400000) / totalDays) * 100, 2);
                const overdue = t.end_date! < now && t.progress < 100;
                return (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="text-xs w-32 truncate shrink-0">{t.name}</span>
                    <div className="flex-1 h-6 bg-muted rounded relative">
                      <div className={`absolute h-full rounded text-xs text-white flex items-center px-2 overflow-hidden
                        ${overdue ? "bg-red-500" : t.progress === 100 ? "bg-green-500" : "bg-blue-500"}`}
                        style={{ left: `${left}%`, width: `${width}%` }}>
                        {t.progress}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2 min-w-[500px]">
              <span>{minDate}</span><span>{maxDate}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
