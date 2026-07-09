"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
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
        <form action={async (fd) => { await createProject(fd); setOpen(false); }} className="space-y-4">
          <Input name="name" placeholder="ชื่อโครงการ" required />
          <Input name="contract_no" placeholder="เลขสัญญา (ถ้ามี)" />
          <select name="status" defaultValue="future"
            className="w-full h-9 rounded-md border bg-transparent px-3 text-sm">
            <option value="future">Future Pipeline</option>
            <option value="in_progress">In-Progress</option>
            <option value="completed">Completed</option>
          </select>
          <DialogFooter>
            <Button type="submit">สร้าง</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
