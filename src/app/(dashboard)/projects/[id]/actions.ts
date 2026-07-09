"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function log(projectId: string, action: string, entity: string, entityId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("activity_log").insert({
    project_id: projectId, actor_id: user?.id, action, entity, entity_id: entityId,
  });
}

export async function addCase(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("troubleshooting_cases").insert({
    project_id: projectId,
    title: String(formData.get("title")),
    problem_desc: String(formData.get("problem_desc")) || null,
    symptoms: String(formData.get("symptoms")) || null,
    solution_desc: String(formData.get("solution_desc")) || null,
    parts_used: String(formData.get("parts_used")) || null,
    tags: String(formData.get("tags")).split(",").map((t) => t.trim()).filter(Boolean),
    created_by: user?.id,
  }).select("id").single();
  if (error) throw new Error(error.message);
  await log(projectId, "เปิดเคสปัญหา", "troubleshooting_cases", data.id);
  revalidatePath(`/projects/${projectId}`);
}

export async function addComment(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("comments").insert({
    project_id: projectId, author_id: user?.id, body: String(formData.get("body")),
  });
  if (error) throw new Error(error.message);
  await log(projectId, "แสดงความคิดเห็น", "comments");
  revalidatePath(`/projects/${projectId}`);
}
