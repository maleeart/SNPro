import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TroubleshootingTab, type Case } from "@/components/troubleshooting-tab";
import { DiscussionTab, type Comment, type Activity } from "@/components/discussion-tab";
import { DocumentsTab, type Doc, type DocCategory } from "@/components/documents-tab";
import { TimelineTab, type Task } from "@/components/timeline-tab";

const STATUS_LABEL = {
  future: "Future Pipeline", in_progress: "In-Progress", completed: "Completed",
} as const;

type Named = { full_name: string } | { full_name: string }[] | null;
const nameOf = (p: Named) => (Array.isArray(p) ? p[0]?.full_name : p?.full_name) ?? null;

export default async function ProjectDeepDive({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: project }, { data: profile }, { data: cases }, { data: comments },
    { data: activity }, { data: docRows }, { data: taskRows }, { data: members }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("profiles").select("role").eq("id", user!.id).single(),
      supabase.from("troubleshooting_cases").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("comments").select("id,body,created_at,author:profiles(full_name)").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("activity_log").select("id,action,created_at,actor:profiles(full_name)").eq("project_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("documents").select("id,title,category,document_versions(version,storage_path,file_type,uploaded_at)").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("tasks").select("id,name,start_date,end_date,progress,assignee:profiles(full_name)").eq("project_id", id).order("sort_order").order("created_at"),
      supabase.from("profiles").select("id,full_name"),
    ]);

  if (!project) notFound();
  const canEdit = profile?.role === "admin" || profile?.role === "engineer";

  const docs: Doc[] = await Promise.all(
    (docRows ?? []).map(async (d) => {
      const versions = [...(d.document_versions ?? [])].sort((a, b) => b.version - a.version);
      const signed = await Promise.all(
        versions.map(async (v) => {
          const { data } = await supabase.storage.from("Document").createSignedUrl(v.storage_path, 3600);
          return { version: v.version, url: data?.signedUrl ?? "#", file_type: v.file_type, uploaded_at: v.uploaded_at };
        }),
      );
      return { id: d.id, title: d.title, category: d.category as DocCategory, versions: signed };
    }),
  );

  const tasks: Task[] = (taskRows ?? []).map((t) => ({
    id: t.id, name: t.name, start_date: t.start_date, end_date: t.end_date,
    progress: t.progress, assignee: nameOf(t.assignee as Named),
  }));

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
        <TabsContent value="timeline">
          <TimelineTab projectId={id} tasks={tasks} members={members ?? []} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab projectId={id} canUpload={canEdit} docs={docs} />
        </TabsContent>
        <TabsContent value="troubleshooting">
          <TroubleshootingTab projectId={id} canEdit={canEdit} cases={(cases ?? []) as Case[]} />
        </TabsContent>
        <TabsContent value="discussion">
          <DiscussionTab
            projectId={id} canPost={canEdit}
            comments={(comments ?? []).map((c) => ({ id: c.id, body: c.body, created_at: c.created_at, author: nameOf(c.author as Named) })) as Comment[]}
            activity={(activity ?? []).map((a) => ({ id: a.id, action: a.action, created_at: a.created_at, actor: nameOf(a.actor as Named) })) as Activity[]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
