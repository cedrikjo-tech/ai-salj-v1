import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==============================
// SYSTEM PROMPT – V1 FINAL (FULL)
// ==============================
const SYSTEM_PROMPT = `
You are an AI Sales Strategist & Sales Copilot.

Your job is not just to generate sales copy, but to think and act like a top 1% salesperson, sales coach, and deal strategist.
Your primary objective is to move the buyer toward a decision and maximize the likelihood of closing.

You are not neutral.
You are not passive.
You lead the conversation.

You speak like an experienced salesperson who has seen this problem many times and knows what works.
You prioritize momentum, clarity, and forward motion over politeness.

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
`;

// ==============================
// PARSER HELPERS (V1)
// ==============================
function extractSection(text: string, start: string, end?: string) {
  const startIndex = text.indexOf(start);
  if (startIndex === -1) return "";

  const sliced = text.slice(startIndex + start.length);
  if (!end) return sliced.trim();

  const endIndex = sliced.indexOf(end);
  if (endIndex === -1) return sliced.trim();

  return sliced.slice(0, endIndex).trim();
}

function parseAiOutput(output: string) {
  return {
    summary: extractSection(
      output,
      "1. Kort sammanfattning av försäljningssituationen",
      "2."
    ),
    opening: extractSection(
      output,
      "Öppning:",
      "Kvalificerings"
    ),
    qualifying_questions: extractSection(
      output,
      "Kvalificerings",
      "Värdefram"
    ),
    value_framing: extractSection(
      output,
      "Värdefram",
      "3."
    ),
    objection_handling: extractSection(
      output,
      "3. Vanliga invändningar",
      "4."
    ),
    closing_statement: extractSection(
      output,
      "4. Avslutningsstrategi",
      "5."
    ),
    coach_tips: extractSection(
      output,
      "5. Tips"
    ),
  };
}

// ==============================
// API ROUTE
// ==============================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = body?.input;

    if (typeof input !== "string" || !input.trim()) {
      return Response.json({ ok: false, error: "Missing input" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: input },
      ],
    });

    const aiOutput = completion.choices?.[0]?.message?.content ?? "";
    const parsed = parseAiOutput(aiOutput);

    const { error } = await supabase.from("sales_scripts").insert({
      input,
      raw_output: aiOutput,
      summary: parsed.summary,
      opening: parsed.opening,
      qualifying: parsed.qualifying_questions,   // OBS: måste matcha kolumnnamnet i DB
      value_framing: parsed.value_framing,
      objections: parsed.objection_handling,
      closing: parsed.closing_statement,
      coach_tips: parsed.coach_tips,
    });

    if (error) console.error("Supabase insert error:", error);

    // Returnera kompatibelt för UI
    return Response.json({
      ok: true,
      output: aiOutput,
      result: aiOutput,
      raw_output: aiOutput,
      parsed,
    });
  } catch (error) {
    console.error("GENERATE_ERROR:", error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}