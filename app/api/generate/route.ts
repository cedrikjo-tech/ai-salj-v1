import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

 const prompt = `
Skapa ett säljscript med EXAKT följande struktur och rubriker:

INTRO:
(begränsa till 2 meningar)

BEHOVSANALYS:
(max 3 punkter)

VÄRDE & FÖRDELAR:
(max 3 punkter)

HANTERA INVÄNDNINGAR:
(kort stycke)

AVSLUT:
(1–2 meningar, tydlig CTA)

Produkt: ${body.product}
Målgrupp: ${body.audience}
Invändningar: ${body.objections}
Fördel: ${body.advantage}
`;


  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();

  return NextResponse.json({
    result: data.choices?.[0]?.message?.content ?? "",
  });
}
