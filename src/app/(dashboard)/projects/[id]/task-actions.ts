"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addTask(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    name: String(formData.get("name")),
    start_date: String(formData.get("start_date")) || null,
    end_date: String(formData.get("end_date")) || null,
    assignee_id: String(formData.get("assignee_id")) || null,
    progress: 0,
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

export async function renameTask(taskId: string, projectId: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ name }).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function reorderTasks(projectId: string, ids: string[]) {
  const supabase = await createClient();
  await Promise.all(ids.map((id, i) => supabase.from("tasks").update({ sort_order: i }).eq("id", id)));
  revalidatePath(`/projects/${projectId}`);
}

export async function addTaskPhotos(taskId: string, projectId: string, paths: string[]) {
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select("photos").eq("id", taskId).single();
  const existing: string[] = data?.photos ?? [];
  await supabase.from("tasks").update({ photos: [...existing, ...paths] }).eq("id", taskId);
  revalidatePath(`/projects/${projectId}`);
}
