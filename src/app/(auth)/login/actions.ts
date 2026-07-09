"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function loginWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin")!;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect("/login?error=" + encodeURIComponent(error.message));
  redirect(data.url); // Supabase → Google consent screen
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
