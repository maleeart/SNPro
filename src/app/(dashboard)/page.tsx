import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const soon = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const [
    { count: future }, { count: inProgress }, { count: completed },
    { data: dueSoon }, { data: overdue },
  ] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "future"),
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("tasks").select("id,name,end_date,progress,project:projects(id,name)")
      .gte("end_date", today).lte("end_date", soon).lt("progress", 100).order("end_date").limit(10),
    supabase.from("tasks").select("id,name,end_date,progress,project:projects(id,name)")
      .lt("end_date", today).lt("progress", 100).order("end_date", { ascending: false }).limit(10),
  ]);

  const nameOf = (p: unknown) => (Array.isArray(p) ? (p as {name:string}[])[0]?.name : (p as {name:string}|null)?.name) ?? "—";
  const idOf = (p: unknown) => (Array.isArray(p) ? (p as {id:string}[])[0]?.id : (p as {id:string}|null)?.id) ?? "#";

  const stats = [
    { label: "Future Pipeline", value: future ?? 0, href: "/projects?status=future" },
    { label: "In-Progress", value: inProgress ?? 0, href: "/projects?status=in_progress" },
    { label: "Completed", value: completed ?? 0, href: "/projects?status=completed" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:bg-muted/20 transition-colors">
              <CardHeader><CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle></CardHeader>
              <CardContent className="text-4xl font-bold">{s.value}</CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* overdue */}
        <div className="space-y-3">
          <h2 className="font-semibold text-red-600">งานเกินกำหนด ({overdue?.length ?? 0})</h2>
          {(overdue ?? []).length === 0
            ? <p className="text-sm text-muted-foreground">ไม่มี</p>
            : (overdue ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <Link href={`/projects/${idOf(t.project)}`} className="text-xs text-muted-foreground hover:underline">
                    {nameOf(t.project)}
                  </Link>
                </div>
                <div className="text-right">
                  <Badge variant="destructive" className="text-xs">{t.end_date}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{t.progress}%</p>
                </div>
              </div>
            ))}
        </div>

        {/* due soon */}
        <div className="space-y-3">
          <h2 className="font-semibold text-amber-600">ครบกำหนดใน 7 วัน ({dueSoon?.length ?? 0})</h2>
          {(dueSoon ?? []).length === 0
            ? <p className="text-sm text-muted-foreground">ไม่มี</p>
            : (dueSoon ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <Link href={`/projects/${idOf(t.project)}`} className="text-xs text-muted-foreground hover:underline">
                    {nameOf(t.project)}
                  </Link>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-xs">{t.end_date}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{t.progress}%</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
