import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const CAT_LABEL = {
  contract: "📂 สัญญาและจัดซื้อ", engineering: "📂 แบบวิศวกรรม", report: "📂 รายงาน",
} as const;

const CAT_KEYS = ["contract", "engineering", "report"] as const;

export default async function CentralDocumentPage({ searchParams }: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const { q, cat } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("documents")
    .select("id,title,category,created_at,project:projects(id,name),document_versions(version,storage_path,file_type,uploaded_at)")
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("title", `%${q}%`);
  if (cat && CAT_KEYS.includes(cat as typeof CAT_KEYS[number])) query = query.eq("category", cat);

  const { data: docs } = await query;

  // sign latest version for each doc
  const signed = await Promise.all((docs ?? []).map(async (d) => {
    const latest = [...(d.document_versions ?? [])].sort((a, b) => b.version - a.version)[0];
    if (!latest) return { ...d, url: "#", version: 0 };
    const { data } = await supabase.storage.from("Document").createSignedUrl(latest.storage_path, 3600);
    return { ...d, url: data?.signedUrl ?? "#", version: latest.version, file_type: latest.file_type };
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Central Document</h1>

      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="ค้นหาชื่อเอกสาร..."
          className="h-9 rounded-md border bg-transparent px-3 text-sm w-64" />
        <select name="cat" defaultValue={cat ?? ""}
          className="h-9 rounded-md border bg-transparent px-3 text-sm">
          <option value="">— ทุกหมวด —</option>
          {CAT_KEYS.map((k) => <option key={k} value={k}>{CAT_LABEL[k]}</option>)}
        </select>
        <button type="submit" className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm">กรอง</button>
      </form>

      {signed.length === 0 && <p className="text-muted-foreground">ไม่พบเอกสาร</p>}

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">ชื่อเอกสาร</th>
              <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">หมวด</th>
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">โครงการ</th>
              <th className="text-left px-4 py-2 font-medium">เวอร์ชัน</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {signed.map((d) => {
              const proj = Array.isArray(d.project) ? d.project[0] : d.project;
              return (
                <tr key={d.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <a href={d.url} target="_blank" rel="noopener" className="font-medium hover:underline">{d.title}</a>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {CAT_LABEL[d.category as keyof typeof CAT_LABEL]}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {proj ? <Link href={`/projects/${proj.id}`} className="hover:underline text-blue-600">{proj.name}</Link> : "—"}
                  </td>
                  <td className="px-4 py-3"><Badge variant="secondary">v{d.version}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
