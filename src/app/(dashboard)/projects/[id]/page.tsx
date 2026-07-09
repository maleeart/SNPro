import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TroubleshootingTab, type Case } from "@/components/troubleshooting-tab";
import { DiscussionTab, type Comment, type Activity } from "@/components/discussion-tab";
import { DocumentsTab, type Doc, type DocCategory } from "@/components/documents-tab";
import { TimelineTab, type Task } from "@/components/timeline-tab";
import { PrintButton } from "@/components/print-button";

const STATUS_LABEL = {
  future: "Future Pipeline", in_progress: "In-Progress", completed: "Completed",
} as const;
const STATUS_COLOR = {
  future: "bg-slate-500", in_progress: "bg-blue-600", completed: "bg-green-600",
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
      supabase.from("troubleshooting_cases")
        .select("id,title,problem_desc,symptoms,solution_desc,parts_used,tags,before_images,after_images")
        .eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("comments").select("id,body,created_at,author:profiles(full_name)").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("activity_log").select("id,action,created_at,actor:profiles(full_name)").eq("project_id", id).order("created_at", { ascending: false }).limit(100),
      supabase.from("documents").select("id,title,category,document_versions(version,storage_path,file_type,uploaded_at)").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("tasks").select("id,name,start_date,end_date,progress,photos,assignee:profiles(full_name)").eq("project_id", id).order("sort_order").order("created_at"),
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
    progress: t.progress, assignee: nameOf(t.assignee as Named), photos: t.photos ?? [],
  }));

  // KPI
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.progress === 100).length;
  const avgProgress = totalTasks ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / totalTasks) : 0;
  const today = new Date();
  const daysLeft = project.end_date ? Math.round((new Date(project.end_date).getTime() - today.getTime()) / 86400000) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="print:hidden">
        <Link href="/projects" className="text-sm text-muted-foreground hover:underline">← All Projects</Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <Badge className={`${STATUS_COLOR[project.status as keyof typeof STATUS_COLOR]} text-white`}>
              {STATUS_LABEL[project.status as keyof typeof STATUS_LABEL]}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {project.contract_no && <span>สัญญา: {project.contract_no}</span>}
            {project.client && <span>ลูกค้า: {project.client}</span>}
            {project.location && <span>📍 {project.location}</span>}
            {project.start_date && project.end_date && (
              <span>{project.start_date} → {project.end_date}</span>
            )}
          </div>
          {project.description && <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>}
        </div>
        <PrintButton />
      </div>

      {/* KPI row */}
      {totalTasks > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">งานทั้งหมด</p>
            <p className="text-2xl font-bold">{totalTasks}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">เสร็จแล้ว</p>
            <p className="text-2xl font-bold text-green-600">{doneTasks}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">ความคืบหน้าเฉลี่ย</p>
            <p className="text-2xl font-bold">{avgProgress}%</p>
            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${avgProgress}%` }} />
            </div>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">วันที่เหลือ</p>
            <p className={`text-2xl font-bold ${daysLeft !== null && daysLeft < 0 ? "text-red-600" : daysLeft !== null && daysLeft <= 7 ? "text-amber-600" : ""}`}>
              {daysLeft === null ? "—" : daysLeft < 0 ? `เกิน ${Math.abs(daysLeft)}ว` : `${daysLeft} วัน`}
            </p>
          </div>
          {project.budget && (
            <div className="rounded-xl border p-3 col-span-2">
              <p className="text-xs text-muted-foreground">งบประมาณ</p>
              <p className="text-lg font-bold">{Number(project.budget).toLocaleString()} บาท</p>
              {project.budget_actual && (
                <p className="text-sm text-muted-foreground">ใช้ไป: {Number(project.budget_actual).toLocaleString()} ({Math.round(project.budget_actual / project.budget * 100)}%)</p>
              )}
            </div>
          )}
        </div>
      )}

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
