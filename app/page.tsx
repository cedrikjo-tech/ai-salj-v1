"use client";

import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    if (!keys.length) return;
    if (!keys.includes(active)) setActive(keys[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawText]);

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

type MenuView = "home" | "history";

type ScriptItem = {
  id: string;
  created_at: string;
  raw_output?: string | null;
  output?: string | null;
  result?: string | null;
  text?: string | null;
  input?: string | null;
  company_name?: string | null;
};

export default function Page() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ Sessions
  const [sessionId, setSessionId] = useState<string | null>(null);

  // ✅ Historik
  const [history, setHistory] = useState<ScriptItem[]>([]);

  // ✅ Drawer state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>("home");

  // Hämta senaste script vid load
  useEffect(() => {
    async function fetchLatest() {
      try {
        const res = await fetch("/api/latest-script");
        const data = await res.json().catch(() => ({}));

        const raw =
          data?.script?.raw_output ??
          data?.script?.output ??
          data?.script?.result ??
          data?.script?.text ??
          "";

        const text = raw ? raw.toString() : "";
        setOutput(text ? text : null);
      } catch {
        setOutput(null);
      }
    }

    fetchLatest();
  }, []);

  // Hämta historik vid load
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/scripts");
        const data = await res.json().catch(() => ({}));
        setHistory(Array.isArray(data?.scripts) ? data.scripts : []);
      } catch {
        setHistory([]);
      }
    }

    fetchHistory();
  }, []);

  async function refreshHistory() {
    try {
      const res = await fetch("/api/scripts");
      const data = await res.json().catch(() => ({}));
      setHistory(Array.isArray(data?.scripts) ? data.scripts : []);
    } catch {
      // ignore
    }
  }

  async function createSession(companyName?: string) {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: companyName || null }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Could not create session");

    setSessionId(data.session.id);
    return data.session.id as string;
  }

  async function updateSession(status: "won" | "lost" | "demo_booked") {
    if (!sessionId) return;

    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Kunde inte uppdatera session");
  }

  async function onGenerate() {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // ✅ Se till att vi har en session
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = await createSession("Okänt bolag");
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, session_id: currentSessionId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Något gick fel. Försök igen.");
      }

      const text = (data?.output ?? data?.result ?? data?.raw_output ?? data?.text ?? "").toString();
      setOutput(text);

      // 🔄 uppdatera historik efter generate
      await refreshHistory();
    } catch (e: any) {
      setError(e?.message || "Något gick fel. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* ✅ Meny-knapp längst ut till vänster */}
      <div className="fixed top-0 left-0 z-50 p-4">
        <button
          onClick={() => {
            setMenuView("home");
            setHistoryOpen(true);
          }}
          className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50 bg-white"
        >
          ☰ Meny
        </button>
      </div>

      {/* ✅ Overlay */}
      {historyOpen && (
        <button
          aria-label="Stäng meny"
          onClick={() => setHistoryOpen(false)}
          className="fixed inset-0 bg-black/30 z-40"
        />
      )}

      {/* ✅ Drawer (Meny) */}
      <aside
        className={[
          "fixed top-0 left-0 h-full w-72 bg-white border-r z-50",
          "transform transition-transform duration-200",
          historyOpen ? "translate-x-0" : "-translate-x-full",
          "flex flex-col",
        ].join(" ")}
      >
        <div className="p-4 border-b font-semibold flex items-center justify-between">
          Meny
          <button
            onClick={() => setHistoryOpen(false)}
            className="rounded-md px-2 py-1 text-sm hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Menyval */}
        <div className="p-3 space-y-2 border-b">
          <button
            onClick={() => setMenuView("home")}
            className={[
              "w-full text-left p-2 rounded text-sm",
              menuView === "home" ? "bg-slate-100" : "hover:bg-gray-100",
            ].join(" ")}
          >
            Hem
          </button>

          <button
            onClick={() => setMenuView("history")}
            className={[
              "w-full text-left p-2 rounded text-sm",
              menuView === "history" ? "bg-slate-100" : "hover:bg-gray-100",
            ].join(" ")}
          >
            Historik
          </button>
        </div>

        {/* Innehåll under menyval */}
        {menuView === "home" && (
          <div className="p-4 text-sm text-slate-600">
            Välj en rubrik i menyn.
          </div>
        )}

        {menuView === "history" && (
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {history.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">Ingen historik än.</div>
            ) : (
              history.map((item) => {
                const raw =
                  item.raw_output ?? item.output ?? item.result ?? item.text ?? "";
                const title =
                  item.company_name ||
                  (item.input ? item.input.slice(0, 28) + (item.input.length > 28 ? "…" : "") : "Utan namn");

                return (
                  <button
                    key={item.id}
                    className="w-full text-left p-2 rounded hover:bg-gray-100 text-sm"
                    onClick={() => {
                      setOutput(raw ? raw.toString() : "");
                      setHistoryOpen(false);
                    }}
                  >
                    <div className="font-medium">{title}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </aside>

      {/* ✅ Main */}
      <main className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="mb-10">
            <h1 className="text-3xl font-semibold tracking-tight">Cebrion Solutions</h1>
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
                {loading ? "Cebrion tänker…" : "Skapa samtalsunderlag"}
              </Button>

              {/* ✅ Outcome-knappar (syns när en session finns) */}
              {sessionId && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button variant="outline" onClick={() => updateSession("demo_booked")}>
                    📅 Demo bokad
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => updateSession("won")}
                  >
                    ✅ Vunnen affär
                  </Button>
                  <Button variant="destructive" onClick={() => updateSession("lost")}>
                    ❌ Förlorad
                  </Button>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}

              {output !== null && <TabsView rawText={output || ""} />}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}