"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addCase } from "@/app/(dashboard)/projects/[id]/actions";

export type Case = {
  id: string;
  title: string;
  problem_desc: string | null;
  symptoms: string | null;
  solution_desc: string | null;
  parts_used: string | null;
  tags: string[] | null;
};

export function TroubleshootingTab({ projectId, cases, canEdit }: {
  projectId: string; cases: Case[]; canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      {canEdit && (
        <div>
          {!open ? (
            <Button onClick={() => setOpen(true)}>+ เปิดเคสใหม่</Button>
          ) : (
            <form
              action={async (fd) => { await addCase(projectId, fd); setOpen(false); }}
              className="grid gap-4 md:grid-cols-2 rounded-xl border p-4"
            >
              <div className="space-y-2">
                <p className="font-semibold text-red-600">Before — ปัญหา</p>
                <Input name="title" placeholder="หัวข้อเคส" required />
                <textarea name="problem_desc" placeholder="รายละเอียดปัญหา" className={ta} />
                <textarea name="symptoms" placeholder="อาการ / error log" className={ta} />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-green-600">After — การแก้ไข</p>
                <textarea name="solution_desc" placeholder="แนวทางแก้ไข" className={ta} />
                <Input name="parts_used" placeholder="อุปกรณ์/พัสดุที่ใช้" />
                <Input name="tags" placeholder="แท็ก (คั่นด้วย ,)" />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit">บันทึกเคส</Button>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>ยกเลิก</Button>
              </div>
            </form>
          )}
        </div>
      )}

      {cases.length === 0 && <p className="text-muted-foreground py-6 text-center">ยังไม่มีเคส</p>}
      {cases.map((c) => (
        <div key={c.id} className="rounded-xl border">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="font-medium">{c.title}</span>
            <div className="flex gap-1">{c.tags?.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
          </div>
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
            <div className="p-4 space-y-1">
              <p className="text-xs font-semibold text-red-600">BEFORE</p>
              <p className="text-sm whitespace-pre-wrap">{c.problem_desc}</p>
              {c.symptoms && <p className="text-xs text-muted-foreground whitespace-pre-wrap">อาการ: {c.symptoms}</p>}
            </div>
            <div className="p-4 space-y-1">
              <p className="text-xs font-semibold text-green-600">AFTER</p>
              <p className="text-sm whitespace-pre-wrap">{c.solution_desc}</p>
              {c.parts_used && <p className="text-xs text-muted-foreground">พัสดุ: {c.parts_used}</p>}
            </div>
          </div>
        </div>
      ))}
      {/* ponytail: images (before/after photos) skipped until Supabase Storage bucket is set up */}
    </div>
  );
}

const ta = "w-full min-h-16 rounded-md border bg-transparent px-3 py-2 text-sm";
