"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { saveDocumentVersion } from "@/app/(dashboard)/projects/[id]/actions";

export type DocCategory = "contract" | "engineering" | "report";
export type DocVersion = { version: number; url: string; file_type: string | null; uploaded_at: string };
export type Doc = { id: string; title: string; category: DocCategory; versions: DocVersion[] };

const CATEGORIES: { key: DocCategory; label: string }[] = [
  { key: "contract",    label: "📂 สัญญาและจัดซื้อจัดจ้าง" },
  { key: "engineering", label: "📂 แบบวิศวกรรมและพิมพ์เขียว" },
  { key: "report",      label: "📂 รายงานและการตรวจรับ" },
];

function guessCategory(name: string): DocCategory {
  const n = name.toLowerCase();
  if (/(tor|สัญญา|contract|quotation|ใบเสนอราคา|ราคากลาง|po|จัดซื้อ)/.test(n)) return "contract";
  if (/(wiring|as.?built|drawing|แบบ|diagram|dwg|blueprint)/.test(n)) return "engineering";
  return "report";
}

// ── File preview modal ────────────────────────────────────────────────────
function PreviewModal({ url, fileType, onClose }: { url: string; fileType: string | null; onClose: () => void }) {
  const isImage = fileType?.startsWith("image/");
  const isPdf = fileType === "application/pdf";
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <span className="text-sm font-medium">ดูไฟล์</span>
          <div className="flex gap-2">
            <a href={url} target="_blank" rel="noopener" className="text-sm text-blue-600 hover:underline">เปิดในแท็บใหม่</a>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-4">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {isImage && <img src={url} alt="" className="max-w-full mx-auto" />}
          {isPdf && <iframe src={url} className="w-full h-[75vh]" title="preview" />}
          {!isImage && !isPdf && (
            <div className="p-8 text-center text-muted-foreground space-y-3">
              <p>ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้</p>
              <a href={url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">ดาวน์โหลด</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DocumentsTab({ projectId, docs, canUpload }: {
  projectId: string; docs: Doc[]; canUpload: boolean;
}) {
  const [category, setCategory] = useState<DocCategory>("report");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ url: string; fileType: string | null } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true); setError("");
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${projectId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("Document")
        .upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw new Error(upErr.message);
      await saveDocumentVersion({ projectId, category, title: title || file.name, storagePath: path, fileType: file.type, sizeBytes: file.size });
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {preview && <PreviewModal {...preview} onClose={() => setPreview(null)} />}

      {canUpload && (
        <form onSubmit={handleUpload} className="rounded-xl border p-4 space-y-3">
          <p className="font-semibold text-sm">อัปโหลดเอกสาร</p>
          <input ref={fileRef} type="file" name="file" required
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setCategory(guessCategory(f.name)); if (!title) setTitle(f.name); }
            }}
            className="block text-sm" />
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={category} onChange={(e) => setCategory(e.target.value as DocCategory)}
              className="h-9 rounded-md border bg-transparent px-3 text-sm">
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ชื่อเอกสาร" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? "กำลังอัปโหลด..." : "อัปโหลด"}</Button>
        </form>
      )}

      {CATEGORIES.map((cat) => {
        const items = docs.filter((d) => d.category === cat.key);
        return (
          <div key={cat.key} className="space-y-2">
            <h3 className="font-semibold">{cat.label}
              <span className="text-muted-foreground text-sm ml-2">({items.length})</span>
            </h3>
            {items.length === 0 && <p className="text-sm text-muted-foreground pl-6">— ว่าง —</p>}
            {items.map((d) => {
              const latest = d.versions[0];
              return (
                <div key={d.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPreview({ url: latest.url, fileType: latest.file_type })}
                        className="font-medium hover:underline text-left">{d.title}</button>
                      <Badge variant="secondary">v{latest.version}</Badge>
                    </div>
                    <a href={latest.url} target="_blank" rel="noopener"
                      className="text-xs text-blue-600 hover:underline">ดาวน์โหลด</a>
                  </div>
                  {d.versions.length > 1 && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="text-muted-foreground">ประวัติ:</span>
                      {d.versions.map((v) => (
                        <button key={v.version} onClick={() => setPreview({ url: v.url, fileType: v.file_type })}
                          className="text-blue-600 hover:underline">v{v.version}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
