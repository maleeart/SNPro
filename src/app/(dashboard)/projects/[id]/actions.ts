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

const BUCKET = "documents";

// Upload a file. If a document with the same title+category exists, this adds a NEW version;
// otherwise it creates the document at version 1. (Version Control)
export async function uploadDocument(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("ไม่พบไฟล์");
  const category = String(formData.get("category"));
  const title = String(formData.get("title")) || file.name;

  // find or create the document
  const { data: existing } = await supabase
    .from("documents").select("id").eq("project_id", projectId)
    .eq("category", category).eq("title", title).maybeSingle();

  let documentId = existing?.id;
  if (!documentId) {
    const { data, error } = await supabase.from("documents")
      .insert({ project_id: projectId, category, title, created_by: user?.id })
      .select("id").single();
    if (error) throw new Error(error.message);
    documentId = data.id;
  }

  // next version number
  const { data: last } = await supabase.from("document_versions")
    .select("version").eq("document_id", documentId)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (last?.version ?? 0) + 1;

  const path = `${projectId}/${documentId}/v${version}-${file.name}`;
  const { error: upErr } = await supabase.storage.from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined });
  if (upErr) throw new Error(upErr.message);

  const { error: verErr } = await supabase.from("document_versions").insert({
    document_id: documentId, version, storage_path: path,
    file_type: file.type, size_bytes: file.size, uploaded_by: user?.id,
  });
  if (verErr) throw new Error(verErr.message);

  await log(projectId, version === 1 ? "อัปโหลดเอกสาร" : `อัปโหลดเวอร์ชัน v${version}`, "documents", documentId);
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
