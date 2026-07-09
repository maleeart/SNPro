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

  const beforeImages = JSON.parse(String(formData.get("before_images_json") ?? "[]"));
  const afterImages = JSON.parse(String(formData.get("after_images_json") ?? "[]"));

  const { data, error } = await supabase.from("troubleshooting_cases").insert({
    project_id: projectId,
    title: String(formData.get("title")),
    problem_desc: String(formData.get("problem_desc")) || null,
    symptoms: String(formData.get("symptoms")) || null,
    before_images: beforeImages,
    solution_desc: String(formData.get("solution_desc")) || null,
    parts_used: String(formData.get("parts_used")) || null,
    after_images: afterImages,
    tags: String(formData.get("tags")).split(",").map((t) => t.trim()).filter(Boolean),
    created_by: user?.id,
  }).select("id").single();
  if (error) throw new Error(error.message);
  await log(projectId, "เปิดเคสปัญหา", "troubleshooting_cases", data.id);
  revalidatePath(`/projects/${projectId}`);
}

export async function saveDocumentVersion(opts: {
  projectId: string; category: string; title: string;
  storagePath: string; fileType: string; sizeBytes: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("documents").select("id").eq("project_id", opts.projectId)
    .eq("category", opts.category).eq("title", opts.title).maybeSingle();

  let documentId = existing?.id;
  if (!documentId) {
    const { data, error } = await supabase.from("documents")
      .insert({ project_id: opts.projectId, category: opts.category, title: opts.title, created_by: user?.id })
      .select("id").single();
    if (error) throw new Error(error.message);
    documentId = data.id;
  }

  const { data: last } = await supabase.from("document_versions")
    .select("version").eq("document_id", documentId)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (last?.version ?? 0) + 1;

  const { error: verErr } = await supabase.from("document_versions").insert({
    document_id: documentId, version, storage_path: opts.storagePath,
    file_type: opts.fileType, size_bytes: opts.sizeBytes, uploaded_by: user?.id,
  });
  if (verErr) throw new Error(verErr.message);

  await log(opts.projectId, version === 1 ? "อัปโหลดเอกสาร" : `อัปโหลดเวอร์ชัน v${version}`, "documents", documentId);
  revalidatePath(`/projects/${opts.projectId}`);
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
