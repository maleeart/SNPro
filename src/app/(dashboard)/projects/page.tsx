import { createClient } from "@/lib/supabase/server";
import { KanbanBoard, type Project } from "@/components/kanban-board";
import { NewProjectDialog } from "@/components/new-project-dialog";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: projects }, { data: profile }] = await Promise.all([
    supabase.from("projects").select("id,name,contract_no,status").order("created_at", { ascending: false }),
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
  ]);

  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">All Projects</h1>
        {isAdmin && <NewProjectDialog />}
      </div>
      <KanbanBoard initial={(projects ?? []) as Project[]} canMove={isAdmin} />
    </div>
  );
}
