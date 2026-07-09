"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { uploadDocument } from "@/app/(dashboard)/projects/[id]/actions";

export type DocCategory = "contract" | "engineering" | "report";
export type DocVersion = { version: number; url: string; file_type: string | null; uploaded_at: string };
export type Doc = { id: string; title: string; category: DocCategory; versions: DocVersion[] };

const CATEGORIES: { key: DocCategory; label: string }[] = [
  { key: "contract",    label: "📂 สัญญาและจัดซื้อจัดจ้าง" },
  { key: "engineering", label: "📂 แบบวิศวกรรมและพิมพ์เขียว" },
  { key: "report",      label: "📂 รายงานและการตรวจรับ" },
];

// ponytail: filename keyword guess — a hint only, user always overrides. Extend keywords as needed.
function guessCategory(name: string): DocCategory {
  const n = name.toLowerCase();
  if (/(tor|สัญญา|contract|quotation|ใบเสนอราคา|ราคากลาง|po|จัดซื้อ)/.test(n)) return "contract";
  if (/(wiring|as.?built|drawing|แบบ|diagram|dwg|blueprint)/.test(n)) return "engineering";
  return "report";
}

export function DocumentsTab({ projectId, docs, canUpload }: {
  projectId: string; docs: Doc[]; canUpload: boolean;
}) {
  const [category, setCategory] = useState<DocCategory>("report");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-6">
      {canUpload && (
        <form
          action={async (fd) => {
            setBusy(true);
            try { await uploadDocument(projectId, fd); setTitle(""); }
            finally { setBusy(false); }
          }}
          className="rounded-xl border p-4 space-y-3"
        >
          <p className="font-semibold text-sm">อัปโหลดเอกสาร</p>
          <input
            type="file" name="file" required
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setCategory(guessCategory(f.name)); if (!title) setTitle(f.name); }
            }}
            className="block text-sm"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="category" value={category}
              onChange={(e) => setCategory(e.target.value as DocCategory)}
              className="h-9 rounded-md border bg-transparent px-3 text-sm">
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <Input name="title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="ชื่อเอกสาร (อัปชื่อเดิม = เวอร์ชันใหม่)" />
          </div>
          <Button type="submit" disabled={busy}>{busy ? "กำลังอัปโหลด..." : "อัปโหลด"}</Button>
        </form>
      )}

      {CATEGORIES.map((cat) => {
        const items = docs.filter((d) => d.category === cat.key);
        return (
          <div key={cat.key} className="space-y-2">
            <h3 className="font-semibold">{cat.label} <span className="text-muted-foreground text-sm">({items.length})</span></h3>
            {items.length === 0 && <p className="text-sm text-muted-foreground pl-6">— ว่าง —</p>}
            {items.map((d) => {
              const latest = d.versions[0];
              return (
                <div key={d.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <a href={latest.url} target="_blank" rel="noopener" className="font-medium hover:underline">
                      {d.title}
                    </a>
                    <Badge variant="secondary">v{latest.version}</Badge>
                  </div>
                  {d.versions.length > 1 && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="text-muted-foreground">ประวัติ:</span>
                      {d.versions.map((v) => (
                        <a key={v.version} href={v.url} target="_blank" rel="noopener"
                          className="text-blue-600 hover:underline">v{v.version}</a>
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
