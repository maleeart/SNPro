import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const stats = [
  { label: "Future Pipeline", value: 0 },
  { label: "In-Progress",     value: 0 },
  { label: "Completed",       value: 0 },
];

export default function DashboardPage() {
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
