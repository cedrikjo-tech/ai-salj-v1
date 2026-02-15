"use client";

import { useMemo, useState, useEffect } from "react";
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
              active === k
                ? "bg-black text-white"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200",
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
const [sessionId, setSessionId] = useState<string | null>(null);
  // ✅ NYA STATES
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
const [companyName, setCompanyName] = useState("");
const [sessionCompany, setSessionCompany] = useState<string | null>(null);


  // 🔹 Hämta senaste script
  useEffect(() => {
    async function fetchLatest() {
      const res = await fetch("/api/latest-script");
      const data = await res.json();

      if (data?.script?.raw_output) {
        setOutput(data.script.raw_output);
      }
    }

    fetchLatest();
  }, []);

  // 🔹 Hämta historik
useEffect(() => {
  async function fetchHistory() {
    try {
      const res = await fetch("/api/scripts");
      const data = await res.json();
      setHistory(data?.scripts ?? []);
    } catch {
      console.error("Kunde inte hämta historik");
    }
  }

  fetchHistory();
}, []);

async function createSession(companyName: string) {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company_name: companyName }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Could not create session");
  }

  setSessionId(data.session.id);
  setSessionCompany(companyName); // 🔥 spara vilket bolag sessionen gäller

  return data.session.id;
}


  async function onGenerate() {
  if (!input.trim()) return;
  if (!companyName.trim()) {
    setError("Du måste ange kundbolag.");
    return;
  }

  let currentSessionId = sessionId;

  // 🔥 Om inget session finns ELLER bolaget har ändrats → skapa ny session
  if (!currentSessionId || sessionCompany !== companyName) {
    currentSessionId = await createSession(companyName);
  }

    setLoading(true);
    setError(null);
    setOutput(null);

    try {
      const res = await fetch("/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    input,
    session_id: currentSessionId,
  }),
});


      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Något gick fel. Försök igen.");
      }

      const text = (
        data?.output ??
        data?.result ??
        data?.raw_output ??
        data?.text ??
        ""
      ).toString();

      setOutput(text);

      // 🔥 uppdatera historik direkt efter generate
      const historyRes = await fetch("/api/scripts");
      const historyData = await historyRes.json();
      setHistory(historyData?.scripts ?? []);
    } catch (e: any) {
      setError(e?.message || "Något gick fel. Försök igen.");
    } finally {
      setLoading(false);
    }
  }
const groupedHistory = history.reduce((acc: any, item: any) => {
  const sessionId = item.session_id;

  if (!acc[sessionId]) {
    acc[sessionId] = {
      companyName: item.sessions?.company_name || "Utan namn",
      scripts: [],
      scriptCount: 0,
      firstCreated: item.created_at,
      lastCreated: item.created_at,
    };
  }

  acc[sessionId].scripts.push(item);
  acc[sessionId].scriptCount += 1;

  if (item.created_at < acc[sessionId].firstCreated) {
    acc[sessionId].firstCreated = item.created_at;
  }

  if (item.created_at > acc[sessionId].lastCreated) {
    acc[sessionId].lastCreated = item.created_at;
  }

  return acc;
}, {});


  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* ☰ Historik-knapp */}
      <div className="absolute top-4 left-4">
        <button
          onClick={() => setHistoryOpen(true)}
          className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
        >
          ☰ Historik
        </button>
      </div>

      {/* Drawer */}
      {historyOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setHistoryOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white border-r z-50 transform transition-transform duration-200 ${
          historyOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col`}
      >
        <div className="p-4 border-b font-semibold flex justify-between">
          Historik
          <button onClick={() => setHistoryOpen(false)}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-3">
  {Object.entries(groupedHistory).map(([sessionKey, session]: any) => (
    <div key={sessionKey} className="space-y-1">
      <div className="font-semibold text-sm px-2 pt-2">
        {session.companyName}
      </div>

      {session.scripts.map((item: any) => (
        <button
          key={item.id}
          onClick={() => {
            setOutput(item.raw_output);
            setHistoryOpen(false);
          }}
          className="w-full text-left p-2 rounded hover:bg-gray-100 text-xs text-gray-600"
        >
          {new Date(item.created_at).toLocaleDateString()} –{" "}
          {new Date(item.created_at).toLocaleTimeString()}
        </button>
      ))}
    </div>
  ))}
</div>
</aside>

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
              <div className="space-y-2">
  <Label>Kundbolag *</Label>
  <input
    type="text"
    value={companyName}
    onChange={(e) => setCompanyName(e.target.value)}
    placeholder="Ex: Volvo AB"
    className="w-full rounded-md border px-3 py-2 text-sm"
  />
</div>

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

            {output !== null && <TabsView rawText={output || ""} />}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
