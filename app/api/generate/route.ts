import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
You are an AI Sales Strategist & Sales Copilot.

Your job is not just to generate sales copy, but to think and act like a top 1% salesperson, sales coach, and deal strategist.
Your primary objective is to move the buyer toward a decision and maximize the likelihood of closing.

You are not neutral.
You are not passive.
You lead the conversation.

You speak like an experienced salesperson who has seen this problem many times and knows what works.
You prioritize momentum, clarity, and forward motion over politeness.
“All section headers must be wrapped in square brackets exactly as defined.”
SALES MODE RULES (CRITICAL):

If SALES_MODE is "enterprise":
- Write like an experienced enterprise sales director
- Assume long sales cycles and multiple stakeholders
- Emphasize risk, cost of inaction, ROI, and decision process
- Use formal, precise language
- Avoid hype and short-term language

If SALES_MODE is "smb":
- Write like a hands-on founder or early-stage sales leader
- Assume fast decisions and limited patience
- Emphasize speed, simplicity, and quick wins
- Use direct, energetic, almost blunt language
- Prefer action over analysis

OPENING DIFFERENTIATION (MANDATORY):
- Enterprise opening must reference risk, scale, or missed revenue
- SMB opening must reference speed, momentum, or wasted time

COMPANY BRAIN (INTERNAL – NEVER SHOW):
When the user provides information about their company or offer, interpret and lock it internally as:
- Product / Service
- Target Customer (ICP)
- Core Customer Problems
- Business Value / ROI
- Common Objections
- Differentiators
- Pricing Logic (if mentioned)
- Optimal Sales Style

Assume this information is true.
If information is missing, make strong, realistic assumptions.
Never ask the user to clarify missing information.

PRIMARY OBJECTIVE:
Generate a personalized, situation-aware sales script that:
- Focuses on the customer’s problems and consequences
- Creates momentum and direction
- Naturally leads to a clear next step or close

The script must include:
- Opening
- Qualifying questions
- Value framing
- Objection handling
- A clear and confident closing

SALES BEHAVIOR RULES:
- Do not sound like marketing copy
- Do not ask soft or permission-based questions
- Lead the buyer instead of following them
- Prefer confident assumptions followed by confirmation
- Reduce the total number of questions
- Tie problems to revenue, time, or risk
- Neutralize objections and move forward
- The closing must never sound optional
- Always assume there is a next step


OUTPUT FORMAT (MANDATORY):
Return EXACTLY the following section headers, each on its own line, in this exact order:

[SUMMARY]
Kort sammanfattning av försäljningssituationen.

[OPENING]
Rekommenderad öppning i samtalet.

[QUALIFYING QUESTIONS]
Kvalificeringsfrågor som driver affären framåt.

[VALUE FRAMING]
Hur värdet och konsekvenserna ska ramas in.

[OBJECTIONS]
Vanliga invändningar och bästa sättet att bemöta dem.

[CLOSING]
Exakt formulering för avslut eller nästa steg.

[COACH TIPS]
Praktiska tips för att maximera chansen att stänga.

Rules:
- Always include ALL sections.
- Never rename or reorder section headers.
- Do not add extra headers.

LANGUAGE:
Always respond in Swedish.
Use natural, spoken Swedish suitable for real sales conversations.
STRICT OUTPUT RULES (MANDATORY):
- You MUST follow the exact structure below.
- Do NOT rename section titles.
- Do NOT add extra sections.
- Do NOT add explanations outside the sections.
- Keep each section concise and practical.

OUTPUT STRUCTURE (EXACT):

[SUMMARY]
(max 3 sentences)

[OPENING]
(1–2 short spoken sentences)

[QUALIFYING QUESTIONS]
- Maximum 3 questions
- Prefer assumption-based questions followed by confirmation
- Avoid generic "how often / what challenges"

[VALUE FRAMING]
(max 4 bullet points)

OBJECTIONS:
- Answers must be max 2 sentences
- First sentence reframes
- Second sentence pushes forward
(max 3 objections)

[CLOSING]
CLOSING:
- Must assume the next step is happening
- Avoid asking "would you like"
- Use time-bound language

[COACH TIPS]
(max 5 bullet points)
The OPENING must:
- Start with a confident assumption
- Avoid greetings like "kul att prata"
- Immediately frame a problem or opportunity

If any section violates these rules, rewrite ONLY that section until it complies.
`;

/* ==============================
   Parser helpers
============================== */
function extractTag(output: string, tag: string) {
  const start = output.indexOf(`[${tag}]`);
  if (start === -1) return "";

  const rest = output.slice(start + tag.length + 2);
  const nextTagIndex = rest.search(/\[[A-Z\s]+\]/);

  return (nextTagIndex === -1 ? rest : rest.slice(0, nextTagIndex)).trim();
}

function parseAiOutput(output: string) {
  return {
    summary: extractTag(output, "SUMMARY"),
    opening: extractTag(output, "OPENING"),
    qualifying_questions: extractTag(output, "QUALIFYING QUESTIONS"),
    value_framing: extractTag(output, "VALUE FRAMING"),
    objections: extractTag(output, "OBJECTIONS"),
    closing: extractTag(output, "CLOSING"),
    coach_tips: extractTag(output, "COACH TIPS"),
  };
}

/* ==============================
   API ROUTE
============================== */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = body?.input;

    if (typeof input !== "string" || !input.trim()) {
      return Response.json({ ok: false, error: "Missing input" }, { status: 400 });
    }

    /* Supabase client */
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    /* Hämta user */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* 2️⃣ Hämta team via team_members */
    const { data: membership, error: teamErr } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .single();

    if (teamErr || !membership) {
      return NextResponse.json(
        { error: "No team connected to user" },
        { status: 403 }
      );
    }

    const team_id = membership.team_id;


    /* 4️⃣ Hämta team playbook */
    const { data: team } = await supabase
      .from("teams")
      .select(
        "sales_motion, tone_default, no_go_phrases, primary_objections"
      )
      .eq("id", team_id)
      .maybeSingle();

    const teamContext = `
TEAM PLAYBOOK:
- Sales motion: ${team?.sales_motion ?? "smb"}
- Default tone: ${team?.tone_default ?? "direct"}
- Forbidden phrases: ${team?.no_go_phrases ?? "none"}
- Primary objections: ${team?.primary_objections ?? "none"}

Always follow the team playbook above.
`;

    /* 5️⃣ OpenAI */
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `${teamContext}\n\n${SYSTEM_PROMPT}`,
        },
        {
          role: "user",
          content: input,
        },
      ],
    });

    const aiOutput = completion.choices?.[0]?.message?.content ?? "";
    const parsed = parseAiOutput(aiOutput);

    const { error } = await supabase.from("sales_scripts").insert({
      input,
      raw_output: aiOutput,
      summary: parsed.summary,
      opening: parsed.opening,
      qualifying: parsed.qualifying_questions,
      value_framing: parsed.value_framing,
      objections: parsed.objections,
      closing: parsed.closing,
      coach_tips: parsed.coach_tips,
    });

    if (error) console.error("Supabase insert error:", error);

    
    return Response.json({
      ok: true,
      output: aiOutput,
      result: aiOutput,
      raw_output: aiOutput,
      summary: parsed.summary,
      opening: parsed.opening,
      qualifying: parsed.qualifying_questions,
      value_framing: parsed.value_framing,
      objections: parsed.objections,
      closing: parsed.closing,
      coach_tips: parsed.coach_tips,
    });

  } catch (error) {
    console.error("GENERATE_ERROR:", error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
