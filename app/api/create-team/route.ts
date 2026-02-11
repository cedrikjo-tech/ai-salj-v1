import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { teamName, userId } = await req.json();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({ name: teamName, owner_id: userId })
    .select()
    .single();

  if (teamError) {
    return NextResponse.json({ error: teamError.message }, { status: 500 });
  }

  await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: userId,
    role: "owner",
  });

  return NextResponse.json({ ok: true });
}
