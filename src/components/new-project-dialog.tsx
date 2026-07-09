"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createProject } from "@/app/(dashboard)/projects/actions";

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>+ โครงการใหม่</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>สร้างโครงการใหม่</DialogTitle></DialogHeader>
        <form action={async (fd) => { await createProject(fd); setOpen(false); }} className="space-y-3">
          <Input name="name" placeholder="ชื่อโครงการ *" required />
          <div className="grid grid-cols-2 gap-3">
            <Input name="contract_no" placeholder="เลขสัญญา" />
            <Input name="client" placeholder="ลูกค้า / เจ้าของงาน" />
          </div>
          <Input name="location" placeholder="สถานที่ / พิกัด" />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">วันเริ่ม</label>
              <Input name="start_date" type="date" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">วันสิ้นสุด</label>
              <Input name="end_date" type="date" />
            </div>
          </div>
          <Input name="budget" type="number" placeholder="งบประมาณ (บาท)" />
          <select name="status" defaultValue="future"
            className="w-full h-9 rounded-md border bg-transparent px-3 text-sm">
            <option value="future">Future Pipeline</option>
            <option value="in_progress">In-Progress</option>
            <option value="completed">Completed</option>
          </select>
          <textarea name="description" placeholder="รายละเอียดโครงการ"
            className="w-full min-h-16 rounded-md border bg-transparent px-3 py-2 text-sm" />
          <DialogFooter>
            <Button type="submit">สร้าง</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
