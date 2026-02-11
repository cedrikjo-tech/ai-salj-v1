import { supabase } from "@/lib/supabaseClient";

export async function getProfile() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .single();

  return profile;
}
