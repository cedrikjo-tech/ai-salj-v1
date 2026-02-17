import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const ALLOWED = ["won", "lost", "demo_booked", "active"] as const;
type AllowedStatus = (typeof ALLOWED)[number];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ params är Promise i Next 16
) {
  const { id } = await params; // ✅ viktigt!

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    return NextResponse.json({ error: "No team connected to user" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const status = body?.status as AllowedStatus | undefined;
  const company_name = body?.company_name as string | undefined;

  if (typeof status !== "undefined" && !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (typeof status !== "undefined") updates.status = status;

  if (typeof company_name === "string") {
    const trimmed = company_name.trim();
    updates.company_name = trimmed.length ? trimmed : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  console.log("PATCH /api/sessions/[id]", {
    id,
    ...updates,
    team_id: membership.team_id,
    user_id: user.id,
  });

  const { data: session, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", id)
    .eq("team_id", membership.team_id)
    .select()
    .maybeSingle();

  if (error) {
    console.log("PATCH UPDATE ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!session) {
    return NextResponse.json({ error: "Session not found for this team" }, { status: 404 });
  }

  return NextResponse.json({ session });
}

