"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addTask(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    name: String(formData.get("name")),
    start_date: String(formData.get("start_date")) || null,
    end_date: String(formData.get("end_date")) || null,
    assignee_id: String(formData.get("assignee_id")) || null,
    progress: 0,
    created_by: user?.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateProgress(taskId: string, projectId: string, progress: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ progress }).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}
