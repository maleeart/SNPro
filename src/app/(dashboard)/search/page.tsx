import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();

  if (!q?.trim()) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">ค้นหา</h1>
        <form>
          <input name="q" autoFocus placeholder="ค้นหาโครงการ งาน เอกสาร เคส..."
            className="w-full max-w-xl h-10 rounded-md border bg-transparent px-4 text-sm" />
        </form>
      </div>
    );
  }

  const term = `%${q}%`;

  const [{ data: projects }, { data: tasks }, { data: cases }, { data: docs }] = await Promise.all([
    supabase.from("projects").select("id,name,contract_no,status,client").or(`name.ilike.${term},contract_no.ilike.${term},client.ilike.${term},description.ilike.${term}`).limit(10),
    supabase.from("tasks").select("id,name,project:projects(id,name)").ilike("name", term).limit(10),
    supabase.from("troubleshooting_cases").select("id,title,project:projects(id,name)").or(`title.ilike.${term},problem_desc.ilike.${term},solution_desc.ilike.${term}`).limit(10),
    supabase.from("documents").select("id,title,project:projects(id,name)").ilike("title", term).limit(10),
  ]);

  const nameOf = (p: unknown) => (Array.isArray(p) ? (p as {name:string}[])[0]?.name : (p as {name:string}|null)?.name) ?? "—";
  const idOf = (p: unknown) => (Array.isArray(p) ? (p as {id:string}[])[0]?.id : (p as {id:string}|null)?.id) ?? "#";
  const total = (projects?.length ?? 0) + (tasks?.length ?? 0) + (cases?.length ?? 0) + (docs?.length ?? 0);

  const STATUS_COLOR: Record<string, string> = { future: "secondary", in_progress: "default", completed: "secondary" };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">ค้นหา</h1>
      <form>
        <input name="q" defaultValue={q}
          className="w-full max-w-xl h-10 rounded-md border bg-transparent px-4 text-sm" />
      </form>

      <p className="text-sm text-muted-foreground">พบ {total} รายการสำหรับ "<strong>{q}</strong>"</p>

      {total === 0 && <p className="text-muted-foreground">ไม่พบผลลัพธ์</p>}

      {!!projects?.length && (
        <Section title="โครงการ">
          {projects.map((p) => (
            <ResultRow key={p.id} href={`/projects/${p.id}`} title={p.name}
              sub={[p.contract_no, p.client].filter(Boolean).join(" · ")}
              badge={<Badge variant={STATUS_COLOR[p.status] as "secondary"|"default"}>{p.status}</Badge>} />
          ))}
        </Section>
      )}
      {!!tasks?.length && (
        <Section title="งาน (Tasks)">
          {tasks.map((t) => (
            <ResultRow key={t.id} href={`/projects/${idOf(t.project)}`} title={t.name} sub={nameOf(t.project)} />
          ))}
        </Section>
      )}
      {!!cases?.length && (
        <Section title="เคสแก้ปัญหา">
          {cases.map((c) => (
            <ResultRow key={c.id} href={`/projects/${idOf(c.project)}`} title={c.title} sub={nameOf(c.project)} />
          ))}
        </Section>
      )}
      {!!docs?.length && (
        <Section title="เอกสาร">
          {docs.map((d) => (
            <ResultRow key={d.id} href={`/projects/${idOf(d.project)}`} title={d.title} sub={nameOf(d.project)} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{title}</h2>
      <div className="rounded-xl border divide-y">{children}</div>
    </div>
  );
}

function ResultRow({ href, title, sub, badge }: { href: string; title: string; sub?: string; badge?: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20">
      <div>
        <p className="font-medium">{title}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      {badge}
    </Link>
  );
}
