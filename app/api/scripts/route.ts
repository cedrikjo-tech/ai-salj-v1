import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("sales_scripts")
    .select(`
      id,
      created_at,
      input,
      raw_output,
      session_id,
      sessions:session_id (
        company_name,
        status
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("SCRIPTS ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const scripts = (data ?? []).map((s: any) => ({
    id: s.id,
    created_at: s.created_at,
    input: s.input ?? null,
    raw_output: s.raw_output ?? null,
    session_id: s.session_id ?? null,
    company_name: s.sessions?.company_name ?? null,
    status: s.sessions?.status ?? "active",
  }));

  return NextResponse.json({ scripts });
}