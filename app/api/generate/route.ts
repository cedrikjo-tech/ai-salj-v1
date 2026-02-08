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
1. Kort sammanfattning av försäljningssituationen
2. Rekommenderat försäljningsmanus
   - Öppning
   - Kvalificeringsfrågor
   - Värdeframing
3. Vanliga invändningar + bästa svar
4. Avslutningsstrategi (exakt formulering)
5. Tips för att maximera chansen att stänga

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
    const input: string = body.input;

    if (!input) {
      return Response.json({ error: "Missing input" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: input },
      ],
    });

    const aiOutput = completion.choices[0].message.content || "";
    const parsed = parseAiOutput(aiOutput);

const { error } = await supabase.from("sales_scripts").insert({
  input,
  raw_output: aiOutput,

  summary: parsed.summary,
  opening: parsed.opening,
  qualifying: parsed.qualifying_questions,
  value_framing: parsed.value_framing,
  objections: parsed.objection_handling,
  closing: parsed.closing_statement,
  coach_tips: parsed.coach_tips,
});

if (error) {
  console.error("Supabase insert error:", error);
}


await supabase.from("sales_scripts").insert({
  input,
  raw_output: aiOutput,
});

return Response.json({
  raw_output: aiOutput,
  parsed,
});
    // V1: returnera för debug + UI
    return Response.json({
      raw_output: aiOutput,
      parsed,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
