import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function MasterTimelinePage() {
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id,name,start_date,end_date,progress,project:projects(id,name,status)")
    .not("start_date", "is", null)
    .not("end_date", "is", null)
    .order("start_date");

  const now = new Date().toISOString().split("T")[0];

  // group by project
  const byProject = new Map<string, { id: string; name: string; status: string; tasks: typeof tasks }>();
  for (const t of tasks ?? []) {
    const proj = Array.isArray(t.project) ? t.project[0] : t.project;
    if (!proj) continue;
    if (!byProject.has(proj.id)) byProject.set(proj.id, { ...proj, tasks: [] });
    byProject.get(proj.id)!.tasks!.push(t);
  }

  const groups = [...byProject.values()];

  // date range across all tasks
  const allTasks = tasks ?? [];
  const minDate = allTasks.length ? allTasks.reduce((m, t) => t.start_date! < m ? t.start_date! : m, allTasks[0].start_date!) : now;
  const maxDate = allTasks.length ? allTasks.reduce((m, t) => t.end_date! > m ? t.end_date! : m, allTasks[0].end_date!) : now;
  const totalDays = Math.max(Math.round((new Date(maxDate).getTime() - new Date(minDate).getTime()) / 86400000), 1);

  function pct(date: string) {
    return (Math.round((new Date(date).getTime() - new Date(minDate).getTime()) / 86400000) / totalDays) * 100;
  }

  const STATUS_COLOR: Record<string, string> = {
    future: "bg-slate-400", in_progress: "bg-blue-500", completed: "bg-green-500",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Master Timeline</h1>

      {groups.length === 0 && (
        <p className="text-muted-foreground">ยังไม่มี task ที่มีวันที่</p>
      )}

      <div className="rounded-xl border overflow-x-auto">
        <div className="min-w-[700px]">
          {/* date ruler */}
          <div className="flex items-center gap-0 border-b px-4 py-2 bg-muted/30">
            <span className="w-48 shrink-0 text-xs text-muted-foreground">โครงการ / งาน</span>
            <div className="flex-1 relative h-4">
              <span className="absolute left-0 text-xs text-muted-foreground">{minDate}</span>
              <span className="absolute right-0 text-xs text-muted-foreground">{maxDate}</span>
            </div>
          </div>

          {groups.map((g) => (
            <div key={g.id}>
              {/* project row */}
              <div className="flex items-center gap-0 border-b bg-muted/10 px-4 py-2">
                <div className="w-48 shrink-0 flex items-center gap-2">
                  <Link href={`/projects/${g.id}`} className="font-semibold text-sm hover:underline truncate">
                    {g.name}
                  </Link>
                  <Badge variant="secondary" className={`text-[10px] text-white ${STATUS_COLOR[g.status] ?? "bg-slate-400"}`}>
                    {g.status}
                  </Badge>
                </div>
                <div className="flex-1" />
              </div>

              {/* task rows */}
              {(g.tasks ?? []).map((t) => {
                const left = pct(t.start_date!);
                const width = Math.max(pct(t.end_date!) - left, 1);
                const overdue = t.end_date! < now && t.progress < 100;
                const barColor = overdue ? "bg-red-500" : t.progress === 100 ? "bg-green-500" : "bg-blue-400";
                return (
                  <div key={t.id} className="flex items-center gap-0 border-b px-4 py-2 hover:bg-muted/20">
                    <span className="w-48 shrink-0 text-sm pl-4 truncate text-muted-foreground">{t.name}</span>
                    <div className="flex-1 h-6 relative">
                      <div
                        className={`absolute h-5 rounded text-[11px] text-white flex items-center px-2 overflow-hidden ${barColor}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      >
                        {t.progress}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* today line legend */}
      <p className="text-xs text-muted-foreground">แดง = เกินกำหนด &nbsp;|&nbsp; เขียว = เสร็จแล้ว &nbsp;|&nbsp; น้ำเงิน = กำลังดำเนินการ</p>
    </div>
  );
}
