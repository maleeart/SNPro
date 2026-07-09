"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProjectStatus = "future" | "in_progress" | "completed";

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("projects").insert({
    name: String(formData.get("name")),
    contract_no: String(formData.get("contract_no")) || null,
    status: (String(formData.get("status")) || "future") as ProjectStatus,
    client: String(formData.get("client")) || null,
    location: String(formData.get("location")) || null,
    budget: Number(formData.get("budget")) || null,
    start_date: String(formData.get("start_date")) || null,
    end_date: String(formData.get("end_date")) || null,
    description: String(formData.get("description")) || null,
    created_by: user?.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}

export async function updateProjectStatus(id: string, status: ProjectStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}
