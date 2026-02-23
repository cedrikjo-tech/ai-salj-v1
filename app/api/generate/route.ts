import OpenAI from "openai";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/* ==============================
   OpenAI client
============================== */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/* ==============================
   SYSTEM PROMPT
============================== */
const SYSTEM_PROMPT = `
You are an AI Sales Strategist operating like a top 1% enterprise seller.
Your objective is to move the deal forward and increase the probability of a committed next step.

Return ONLY valid JSON in this exact structure:

{
  "script_output": {
    "summary": "",
    "opening": "",
    "qualifying_questions": [],
    "value_framing": [],
    "objections": [],
    "closing": "",
    "coach_tips": []
  },
  "deal_analysis": {
    "deal_stage": "",
    "probability": 0,
    "next_step": "",
    "risk_score": 0
  }
}

Rules:
- All text must be in Swedish.
- Arrays must be arrays of strings.
- No explanations.
- No extra keys.
- No markdown.
`;

/* ==============================
   SALES BRAIN
============================== */
const SALES_BRAIN = `
[SALES BRAIN – VÄRDEKEDJA & KUNDPROCESS]
- Kartlägg kundens interna värdekedja: inflöde → arbete → beslut → leverans → uppföljning.
- Identifiera var tid, pengar eller risk läcker.
- Driv kundens beslutsprocess: stakeholders, kriterier, risker, tidslinje.
- Använd hypotesbaserade frågor.

[STIL]
- Börja med en tydlig diagnostisk hypotes.
- Koppla alltid till pengar, tid, tillväxt eller risk.
- Var direkt och beslutsdrivande.
`;

/* ==============================
   API ROUTE
============================== */
export async function POST(req: Request) {
  try {
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

    const { input, session_id } = await req.json();

    if (!session_id) {
      return Response.json({ ok: false, error: "Missing session_id" }, { status: 400 });
    }

    if (!input || typeof input !== "string") {
      return Response.json({ ok: false, error: "Missing input" }, { status: 400 });
    }

    /* 🔐 1️⃣ User */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* 🔐 2️⃣ Team */
    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id, role")
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return Response.json({ error: "No team found" }, { status: 403 });
    }

    if (membership.role === "viewer") {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const team_id = membership.team_id;

    const { data: team } = await supabase
      .from("teams")
      .select("sales_motion, closing_style, risk_tolerance")
      .eq("id", team_id)
      .maybeSingle();

    /* 🔐 3️⃣ Session check */
    const { data: session } = await supabase
      .from("sessions")
      .select("team_id, probability")
      .eq("id", session_id)
      .single();

    if (!session || session.team_id !== team_id) {
      return Response.json({ error: "Invalid session" }, { status: 403 });
    }

    /* 🧠 Team Context */
    const teamContext = `
TEAM STRATEGY PROFILE:
Sales motion: ${team?.sales_motion ?? "smb"}
Closing style: ${team?.closing_style ?? "assumptive"}
Risk tolerance: ${team?.risk_tolerance ?? "medium"}
`;

    /* 🤖 4️⃣ Run OpenAI */
    const start = Date.now();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
${SALES_BRAIN}

${teamContext}

${SYSTEM_PROMPT}
          `,
        },
        {
          role: "user",
          content: input,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 900,
      temperature: 0.7,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "{}";

    let parsedResponse: any;

    try {
      parsedResponse = JSON.parse(raw);
    } catch (err) {
      console.error("JSON PARSE ERROR:", raw);
      return Response.json(
        { ok: false, error: "Invalid AI JSON response" },
        { status: 500 }
      );
    }

    const script = parsedResponse.script_output;
    const dealAnalysis = parsedResponse.deal_analysis;

    const duration = Date.now() - start;
    console.log("AI latency:", duration, "ms");

    /* 💾 5️⃣ Save script */
    await supabase.from("sales_scripts").insert({
      session_id,
      team_id,
      user_id: user.id,
      input,
      raw_output: JSON.stringify(script),
      summary: script.summary,
      opening: script.opening,
      qualifying: script.qualifying_questions,
      value_framing: script.value_framing,
      objections: script.objections,
      closing: script.closing,
      coach_tips: script.coach_tips,
    });

    /* 🧠 6️⃣ Update session intelligence */
    const currentProbability = session.probability ?? 20;
    let newProbability = dealAnalysis?.probability ?? currentProbability;

    newProbability = Math.max(0, Math.min(100, newProbability));

    const maxChange = 10;

    if (newProbability > currentProbability + maxChange) {
      newProbability = currentProbability + maxChange;
    }

    if (newProbability < currentProbability - maxChange) {
      newProbability = currentProbability - maxChange;
    }

    await supabase
      .from("sessions")
      .update({
        deal_stage: dealAnalysis?.deal_stage,
        probability: newProbability,
        next_step: dealAnalysis?.next_step,
        risk_score: dealAnalysis?.risk_score,
      })
      .eq("id", session_id);

    /* ✅ Final response */
    return Response.json({
      ok: true,
      script,
      deal_analysis: dealAnalysis,
    });

  } catch (error: any) {
    console.error("GENERATE_ERROR_FULL:", error);

    return Response.json(
      { ok: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}