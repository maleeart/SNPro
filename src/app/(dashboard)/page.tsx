import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

async function count(status: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("projects").select("*", { count: "exact", head: true }).eq("status", status);
  return count ?? 0;
}

export default async function DashboardPage() {
  const [future, inProgress, completed] = await Promise.all([
    count("future"), count("in_progress"), count("completed"),
  ]);
  const stats = [
    { label: "Future Pipeline", value: future },
    { label: "In-Progress",     value: inProgress },
    { label: "Completed",       value: completed },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle></CardHeader>
            <CardContent className="text-4xl font-bold">{s.value}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
