"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addCase } from "@/app/(dashboard)/projects/[id]/actions";
import { createClient } from "@/lib/supabase/client";

export type Case = {
  id: string; title: string; problem_desc: string | null; symptoms: string | null;
  solution_desc: string | null; parts_used: string | null; tags: string[] | null;
  before_images: string[] | null; after_images: string[] | null;
};

const ta = "w-full min-h-16 rounded-md border bg-transparent px-3 py-2 text-sm";

function ImageUploadStrip({ label, name, color }: { label: string; name: string; color: string }) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const ref = useRef<HTMLInputElement>(null);

  function pick(fl: FileList) {
    const arr = Array.from(fl);
    setPreviews((p) => [...p, ...arr.map((f) => URL.createObjectURL(f))]);
    setFiles((p) => [...p, ...arr]);
  }

  // Store files on the hidden input as a data-transfer via a custom approach:
  // We'll store the File objects in a ref and the parent form uses a hidden input
  // ponytail: simplest — just render previews + actual file inputs for the form
  return (
    <div className="space-y-2">
      <p className={`text-xs font-semibold ${color}`}>{label}</p>
      <div className="flex gap-2 flex-wrap">
        {previews.map((p, i) => <img key={i} src={p} alt="" className="h-16 w-16 object-cover rounded border" />)}
        <button type="button" onClick={() => ref.current?.click()}
          className="h-16 w-16 rounded border-2 border-dashed text-muted-foreground hover:border-primary text-2xl flex items-center justify-center">+</button>
        <input ref={ref} type="file" multiple accept="image/*" className="hidden"
          onChange={(e) => e.target.files && pick(e.target.files)} />
        {/* actual file inputs for form submission */}
        {files.map((f, i) => {
          const dt = new DataTransfer(); dt.items.add(f);
          return <input key={i} type="file" name={name} className="hidden"
            ref={(el) => { if (el) { el.files = dt.files; } }} />;
        })}
      </div>
    </div>
  );
}

function CaseImages({ paths, label, color }: { paths: string[]; label: string; color: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

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

  if (!urls.length) return null;
  return (
    <div className="space-y-1">
      <p className={`text-xs font-semibold ${color}`}>{label}</p>
      <div className="flex gap-2 flex-wrap">
        {urls.map((u, i) => (
          <img key={i} src={u} alt="" onClick={() => setPreview(u)}
            className="h-16 w-16 object-cover rounded border cursor-pointer hover:opacity-80" />
        ))}
      </div>
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={() => setPreview(null)}>
          <img src={preview} alt="" className="max-h-[90vh] max-w-[90vw] rounded-lg" />
        </div>
      )}
    </div>
  );
}

export function TroubleshootingTab({ projectId, cases, canEdit }: {
  projectId: string; cases: Case[]; canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(fd: FormData) {
    // upload images first, then save case with paths
    const supabase = createClient();
    const uploadGroup = async (inputName: string): Promise<string[]> => {
      const files = fd.getAll(inputName) as File[];
      const paths: string[] = [];
      for (const file of files) {
        if (!file.size) continue;
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `cases/${projectId}/${Date.now()}-${safe}`;
        await supabase.storage.from("Document").upload(path, file, { contentType: file.type });
        paths.push(path);
      }
      return paths;
    };
    const [beforePaths, afterPaths] = await Promise.all([
      uploadGroup("before_images"), uploadGroup("after_images"),
    ]);
    fd.set("before_images_json", JSON.stringify(beforePaths));
    fd.set("after_images_json", JSON.stringify(afterPaths));
    await addCase(projectId, fd);
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div>
          {!open ? (
            <Button onClick={() => setOpen(true)}>+ เปิดเคสใหม่</Button>
          ) : (
            <form action={handleSubmit} className="grid gap-4 md:grid-cols-2 rounded-xl border p-4">
              <div className="space-y-2">
                <p className="font-semibold text-red-600">Before — ปัญหา</p>
                <Input name="title" placeholder="หัวข้อเคส" required />
                <textarea name="problem_desc" placeholder="รายละเอียดปัญหา" className={ta} />
                <textarea name="symptoms" placeholder="อาการ / error log" className={ta} />
                <ImageUploadStrip label="รูปก่อนแก้ไข" name="before_images" color="text-red-600" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-green-600">After — การแก้ไข</p>
                <textarea name="solution_desc" placeholder="แนวทางแก้ไข" className={ta} />
                <Input name="parts_used" placeholder="อุปกรณ์/พัสดุที่ใช้" />
                <Input name="tags" placeholder="แท็ก (คั่นด้วย ,)" />
                <ImageUploadStrip label="รูปหลังแก้ไข" name="after_images" color="text-green-600" />
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
            <div className="p-4 space-y-2">
              <p className="text-xs font-semibold text-red-600">BEFORE</p>
              <p className="text-sm whitespace-pre-wrap">{c.problem_desc}</p>
              {c.symptoms && <p className="text-xs text-muted-foreground whitespace-pre-wrap">อาการ: {c.symptoms}</p>}
              {c.before_images?.length ? <CaseImages paths={c.before_images} label="รูปก่อนแก้ไข" color="text-red-600" /> : null}
            </div>
            <div className="p-4 space-y-2">
              <p className="text-xs font-semibold text-green-600">AFTER</p>
              <p className="text-sm whitespace-pre-wrap">{c.solution_desc}</p>
              {c.parts_used && <p className="text-xs text-muted-foreground">พัสดุ: {c.parts_used}</p>}
              {c.after_images?.length ? <CaseImages paths={c.after_images} label="รูปหลังแก้ไข" color="text-green-600" /> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
