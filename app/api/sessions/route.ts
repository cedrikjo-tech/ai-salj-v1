import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
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

  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    return NextResponse.json({ error: "No team connected to user" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const company_name =
    typeof body?.company_name === "string" && body.company_name.trim()
      ? body.company_name.trim()
      : null;

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      team_id: membership.team_id,
      created_by: user.id,
      company_name,
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ session });
}