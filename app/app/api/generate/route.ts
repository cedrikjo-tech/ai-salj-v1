import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { product, audience, objections, advantage } = body;

  const prompt = `
Du är en senior säljcoach.
Skapa ett kort säljscript baserat på:
Produkt: ${product}
Målgrupp: ${audience}
Invändningar: ${objections}
Fördelar: ${advantage}

Returnera:
1) Kort pitch
2) 3 starka argument
3) Svar på invändningar
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
    result: data.choices[0].message.content,
  });
}

