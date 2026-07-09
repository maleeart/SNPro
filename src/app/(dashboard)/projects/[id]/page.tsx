import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL = {
  future: "Future Pipeline", in_progress: "In-Progress", completed: "Completed",
} as const;

export default async function ProjectDeepDive({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects").select("*").eq("id", id).single();
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="text-sm text-muted-foreground hover:underline">← All Projects</Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <Badge variant="secondary">{STATUS_LABEL[project.status as keyof typeof STATUS_LABEL]}</Badge>
        </div>
        {project.contract_no && <p className="text-sm text-muted-foreground">เลขสัญญา: {project.contract_no}</p>}
      </div>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline"><Placeholder t="Gantt Chart + Task Dependency" /></TabsContent>
        <TabsContent value="documents"><Placeholder t="Document Library (3 หมวด + versioning)" /></TabsContent>
        <TabsContent value="troubleshooting"><Placeholder t="Before / After" /></TabsContent>
        <TabsContent value="discussion"><Placeholder t="Comments + Activity Log" /></TabsContent>
      </Tabs>
    </div>
  );
}

function Placeholder({ t }: { t: string }) {
  return <div className="py-10 text-center text-muted-foreground">{t} — coming soon</div>;
}
