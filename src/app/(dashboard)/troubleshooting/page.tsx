import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function TroubleshootingHubPage({ searchParams }: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("troubleshooting_cases")
    .select("id,title,problem_desc,solution_desc,tags,created_at,project:projects(id,name)")
    .order("created_at", { ascending: false });

  if (q) query = query.or(`title.ilike.%${q}%,problem_desc.ilike.%${q}%,solution_desc.ilike.%${q}%`);

  const { data: cases } = await query;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Troubleshooting Hub</h1>

      <form className="flex gap-2 max-w-md">
        <input name="q" defaultValue={q} placeholder="ค้นหาเคส / อาการ / การแก้ไข..."
          className="flex-1 h-9 rounded-md border bg-transparent px-3 text-sm" />
        <button type="submit" className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm">ค้นหา</button>
      </form>

      {(cases ?? []).length === 0 && <p className="text-muted-foreground">ไม่พบเคส</p>}

      <div className="space-y-4">
        {(cases ?? []).map((c) => {
          const proj = Array.isArray(c.project) ? c.project[0] : c.project;
          return (
            <div key={c.id} className="rounded-xl border">
              <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
                <div>
                  <Link href={`/projects/${proj?.id}/`}
                    className="text-sm text-muted-foreground hover:underline">{proj?.name}</Link>
                  <p className="font-medium">{c.title}</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {(c.tags ?? []).map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
              </div>
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x text-sm">
                <div className="p-4">
                  <p className="text-xs font-semibold text-red-600 mb-1">BEFORE</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{c.problem_desc ?? "—"}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-green-600 mb-1">AFTER</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{c.solution_desc ?? "—"}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
