"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addTask, updateProgress } from "@/app/(dashboard)/projects/[id]/task-actions";

export type Task = {
  id: string; name: string; start_date: string | null; end_date: string | null;
  progress: number; assignee: string | null;
};

function ProgressBar({ task, projectId, canEdit }: { task: Task; projectId: string; canEdit: boolean }) {
  const [val, setVal] = useState(task.progress);
  const [saving, setSaving] = useState(false);

  async function save(next: number) {
    setSaving(true);
    setVal(next);
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
        <select value={val} disabled={saving}
          onChange={(e) => save(Number(e.target.value))}
          className="h-7 rounded border text-xs px-1 bg-transparent">
          {[0,10,20,30,40,50,60,70,80,90,100].map((n) => <option key={n} value={n}>{n}%</option>)}
        </select>
      )}
    </div>
  );
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function TimelineTab({ projectId, tasks, members, canEdit }: {
  projectId: string; tasks: Task[]; members: { id: string; full_name: string }[]; canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const now = new Date().toISOString().split("T")[0];

  // simple Gantt: find date range
  const dated = tasks.filter((t) => t.start_date && t.end_date);
  const minDate = dated.length ? dated.reduce((m, t) => t.start_date! < m ? t.start_date! : m, dated[0].start_date!) : now;
  const maxDate = dated.length ? dated.reduce((m, t) => t.end_date! > m ? t.end_date! : m, dated[0].end_date!) : now;
  const totalDays = Math.max(daysBetween(minDate, maxDate), 1);

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
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">วันเริ่ม</label>
                <Input name="start_date" type="date" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">วันสิ้นสุด</label>
                <Input name="end_date" type="date" />
              </div>
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

      {/* Task list + progress */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">งาน</th>
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">ผู้รับผิดชอบ</th>
              <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">วันที่</th>
              <th className="text-left px-4 py-2 font-medium w-48">ความคืบหน้า</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tasks.map((t) => (
              <tr key={t.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                  {t.assignee ?? "—"}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                  {t.start_date && t.end_date
                    ? `${t.start_date} → ${t.end_date}`
                    : t.start_date ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <ProgressBar task={t} projectId={projectId} canEdit={canEdit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gantt bar chart */}
      {dated.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Gantt View</h3>
          <div className="rounded-xl border p-4 overflow-x-auto">
            <div className="space-y-2 min-w-[500px]">
              {dated.map((t) => {
                const left = (daysBetween(minDate, t.start_date!) / totalDays) * 100;
                const width = Math.max((daysBetween(t.start_date!, t.end_date!) / totalDays) * 100, 2);
                const overdue = t.end_date! < now && t.progress < 100;
                return (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="text-xs w-32 truncate shrink-0">{t.name}</span>
                    <div className="flex-1 h-6 bg-muted rounded relative">
                      <div
                        className={`absolute h-full rounded text-xs text-white flex items-center px-2 overflow-hidden
                          ${overdue ? "bg-red-500" : t.progress === 100 ? "bg-green-500" : "bg-blue-500"}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      >
                        {t.progress}%
                      </div>
                    </div>
                    {overdue && <Badge variant="destructive" className="text-xs shrink-0">เกินกำหนด</Badge>}
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
