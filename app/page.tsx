"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const ORDER = [
  "SUMMARY",
  "OPENING",
  "QUALIFYING QUESTIONS",
  "VALUE FRAMING",
  "OBJECTIONS",
  "CLOSING",
  "COACH TIPS",
] as const;

const LABELS: Record<string, string> = {
  SUMMARY: "Sammanfattning",
  OPENING: "Öppning",
  "QUALIFYING QUESTIONS": "Kvalificeringsfrågor",
  "VALUE FRAMING": "Värdeframing",
  OBJECTIONS: "Invändningar",
  CLOSING: "Avslut",
  "COACH TIPS": "Coach-tips",
};

function splitTaggedSections(text: string) {
  const sections: Record<string, string> = {};
  for (let i = 0; i < ORDER.length; i++) {
    const start = `[${ORDER[i]}]`;
    const end = i < ORDER.length - 1 ? `[${ORDER[i + 1]}]` : undefined;

    const startIdx = text.indexOf(start);
    if (startIdx === -1) continue;

    const sliced = text.slice(startIdx + start.length);
    const endIdx = end ? sliced.indexOf(end) : -1;

    sections[ORDER[i]] = (endIdx === -1 ? sliced : sliced.slice(0, endIdx)).trim();
  }
  return sections;
}

function TabsView({ rawText }: { rawText: string }) {
  const sections = useMemo(() => splitTaggedSections(rawText), [rawText]);
  const keys = useMemo(() => ORDER.filter((k) => sections[k]?.trim()), [sections]);

  const [active, setActive] = useState<(typeof ORDER)[number]>(keys[0] ?? "SUMMARY");

  if (!keys.length) {
    return (
      <div className="rounded-md border bg-white p-4 text-sm whitespace-pre-wrap">
        {rawText || "(Tomt svar)"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => setActive(k)}
            className={[
              "rounded-full px-3 py-1 text-sm transition",
              active === k ? "bg-black text-white" : "bg-slate-100 text-slate-800 hover:bg-slate-200",
            ].join(" ")}
          >
            {LABELS[k] ?? k}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500">
          {LABELS[active] ?? active}
        </div>
        <div className="whitespace-pre-wrap text-sm leading-6 text-slate-900">
          {sections[active]}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    setOutput(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Något gick fel. Försök igen.");
      }

      // viktigt: output kan komma som output eller text
      const text = (data?.output ?? data?.result ?? data?.raw_output ?? data?.text ?? "").toString();
      setOutput(text);
    } catch (e: any) {
      setError(e?.message || "Något gick fel. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">AI Säljcoach</h1>
          <p className="mt-2 text-slate-600">
            Skapa ett skräddarsytt samtalsunderlag inför varje kundmöte.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Beskriv kund & mål</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Kundföretag, mål & kontext</Label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ex: Jag säljer X till Y... Målet är att boka demo…"
                rows={6}
              />
            </div>

            <Button className="w-full" onClick={onGenerate} disabled={loading}>
              {loading ? "AI tänker…" : "Skapa samtalsunderlag"}
            </Button>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* viktigt: visa även om output är tom sträng */}
            {output !== null && (
  <TabsView rawText={output || ""} />
)}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
  