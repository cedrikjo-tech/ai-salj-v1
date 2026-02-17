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
        <div className="whitespace-pre-wrap text-sm leading-6 text-slate-900">{sections[active]}</div>
      </div>
    </div>
  );
}

type MenuView = "home" | "generate" | "history";
type HistoryFilter = "all" | "active" | "demo_booked" | "won" | "lost";
type ViewMode = "new" | "history";

type ScriptItem = {
  id: string;
  created_at: string;
  session_id?: string | null;
  status?: "active" | "demo_booked" | "won" | "lost" | string | null;
  raw_output?: string | null;
  output?: string | null;
  result?: string | null;
  text?: string | null;
  input?: string | null;
  company_name?: string | null;
};

function statusBadge(status?: string | null) {
  const s = (status ?? "active").toString();
  if (s === "won") return { label: "VUNNEN", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  if (s === "demo_booked") return { label: "DEMO", cls: "bg-amber-100 text-amber-800 border-amber-200" };
  if (s === "lost") return { label: "FÖRLORAD", cls: "bg-rose-100 text-rose-800 border-rose-200" };
  return { label: "AKTIV", cls: "bg-sky-100 text-sky-800 border-sky-200" };
}

export default function Page() {
  const [companyName, setCompanyName] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<ScriptItem[]>([]);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>("home");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("new");

  function resetForNewMeeting() {
    setSessionId(null);
    setCompanyName("");
    setInput("");
    setOutput(null);
    setError(null);
  }

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

  async function createSession(name?: string) {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: name || null }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Could not create session");

    const id = data?.session?.id as string | undefined;
    if (!id) throw new Error("Session ID saknas från backend");

    setSessionId(id);
    return id;
  }

  const currentSessionMeta = useMemo(() => {
    if (!sessionId) return { status: "active", company: "" };
    const found = history.find((h) => (h.session_id ?? "") === sessionId);
    return {
      status: (found?.status ?? "active").toString(),
      company: (found?.company_name ?? "").toString(),
    };
  }, [history, sessionId]);

  const activeCompanyLabel = useMemo(() => {
    const typed = companyName.trim();
    if (typed) return typed;
    if (currentSessionMeta.company) return currentSessionMeta.company;
    return "Okänt bolag";
  }, [companyName, currentSessionMeta.company]);

  const isClosedSession =
    currentSessionMeta.status === "won" ||
    currentSessionMeta.status === "lost" ||
    currentSessionMeta.status === "demo_booked";

  async function updateSession(status: "won" | "lost" | "demo_booked", opts?: { closeAfter?: boolean }) {
    if (!sessionId) {
      setError("Ingen session vald. Generera underlag eller välj ett möte i historiken först.");
      return;
    }

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Kunde inte uppdatera session");

      await refreshHistory();

      if (opts?.closeAfter) {
        resetForNewMeeting();
        setViewMode("new");
      }
    } catch (e: any) {
      setError(e?.message || "Kunde inte uppdatera session");
    }
  }

  async function onGenerate() {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);

    try {
      let currentSessionId = sessionId;

      if (!currentSessionId) {
        currentSessionId = await createSession(companyName.trim() || "Okänt bolag");
        setSessionId(currentSessionId);
      } else {
        const name = companyName.trim();
        if (name) {
          await fetch(`/api/sessions/${currentSessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ company_name: name }),
          });
        }
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, session_id: currentSessionId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Något gick fel. Försök igen.");

      const text = (data?.output ?? data?.result ?? data?.raw_output ?? data?.text ?? "").toString();
      setOutput(text);
      setViewMode("new");

      await refreshHistory();
    } catch (e: any) {
      setError(e?.message || "Något gick fel. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  const filteredHistory =
    historyFilter === "all"
      ? history
      : history.filter((x) => ((x.status ?? "active") as string) === historyFilter);

  const filterBtn = (key: HistoryFilter, label: string) => (
    <button
      onClick={() => setHistoryFilter(key)}
      className={[
        "rounded-full px-3 py-1 text-xs border transition",
        historyFilter === key ? "bg-black text-white border-black" : "bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      {label}
    </button>
  );

  const stats = useMemo(() => {
    const won = history.filter((h) => (h.status ?? "active") === "won").length;
    const demo = history.filter((h) => (h.status ?? "active") === "demo_booked").length;
    const lost = history.filter((h) => (h.status ?? "active") === "lost").length;

    const denom = won + lost;
    const winRate = denom > 0 ? Math.round((won / denom) * 100) : 0;

    return { won, demo, lost, winRate };
  }, [history]);

  const shouldShowMeetingCard = menuView === "generate" || viewMode === "history";

  return (
    <div className="h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Meny-knapp */}
      <div className="fixed top-0 left-0 z-50 p-4">
        <button
          onClick={() => setHistoryOpen(true)}
          className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50 bg-white"
        >
          ☰ Meny
        </button>
      </div>

      {/* Overlay */}
      {historyOpen && (
        <button
          aria-label="Stäng meny"
          onClick={() => setHistoryOpen(false)}
          className="fixed inset-0 bg-black/30 z-40"
        />
      )}

      {/* Drawer */}
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

        {/* ✅ 3 flikar */}
        <div className="p-3 space-y-2 border-b">
          <button
            onClick={() => {
              setMenuView("home");
              setViewMode("new");
              setHistoryOpen(false);
            }}
            className={[
              "w-full text-left p-2 rounded text-sm",
              menuView === "home" ? "bg-slate-100" : "hover:bg-gray-100",
            ].join(" ")}
          >
            Hem
          </button>

          <button
            onClick={() => {
              resetForNewMeeting();
              setMenuView("generate");
              setViewMode("new");
              setHistoryOpen(false);
            }}
            className={[
              "w-full text-left p-2 rounded text-sm",
              menuView === "generate" ? "bg-slate-100" : "hover:bg-gray-100",
            ].join(" ")}
          >
            Generera
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

        {/* Home/Generate text */}
        {menuView === "home" && (
          <div className="p-4 text-sm text-slate-600">Hem visar dashboard + senaste aktivitet.</div>
        )}

        {menuView === "generate" && (
          <div className="p-4 text-sm text-slate-600">Öppna Generera för att skapa nytt underlag.</div>
        )}

        {/* Historik */}
        {menuView === "history" && (
          <>
            <div className="px-2 pt-2">
              <div className="flex flex-wrap gap-2">
                {filterBtn("all", "Alla")}
                {filterBtn("active", "Aktiva")}
                {filterBtn("demo_booked", "Demo")}
                {filterBtn("won", "Vunna")}
                {filterBtn("lost", "Förlorade")}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredHistory.length === 0 ? (
                <div className="p-3 text-sm text-slate-500">Ingen historik för filtret.</div>
              ) : (
                filteredHistory.map((item) => {
                  const raw = item.raw_output ?? item.output ?? item.result ?? item.text ?? "";
                  const title =
                    item.company_name ||
                    (item.input ? item.input.slice(0, 28) + (item.input.length > 28 ? "…" : "") : "Utan namn");

                  const b = statusBadge(item.status);

                  return (
                    <button
                      key={item.id}
                      className="w-full text-left p-2 rounded hover:bg-gray-100 text-sm"
                      onClick={() => {
                        const text = raw ? raw.toString() : "";
                        setOutput(text);
                        setSessionId(item.session_id ?? null);
                        setViewMode("history");
                        setMenuView("history");
                        setHistoryOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">{title}</div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${b.cls}`}>
                          {b.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </aside>

      {/* Main */}
      <main className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold tracking-tight">Cebrion Solutions</h1>
            <p className="mt-2 text-slate-600">Skapa ett skräddarsytt samtalsunderlag inför varje kundmöte.</p>
          </div>

          {/* ✅ Dashboard visas BARA på Hem */}
          {menuView === "home" && (
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-slate-500">Vunna</div>
                  <div className="text-2xl font-semibold">{stats.won}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-slate-500">Demo</div>
                  <div className="text-2xl font-semibold">{stats.demo}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-slate-500">Förlorade</div>
                  <div className="text-2xl font-semibold">{stats.lost}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-slate-500">Win rate</div>
                  <div className="text-2xl font-semibold">{stats.winRate}%</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ✅ Hem: Senaste aktivitet + snabbknapp */}
          {menuView === "home" && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-base">Senaste aktivitet</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => {
                    resetForNewMeeting();
                    setMenuView("generate");
                    setViewMode("new");
                  }}
                >
                  + Generera nytt möte
                </Button>

                <div className="space-y-2">
                  {(history ?? []).slice(0, 5).map((item) => {
                    const title =
                      item.company_name ||
                      (item.input
                        ? item.input.slice(0, 40) + (item.input.length > 40 ? "…" : "")
                        : "Utan namn");

                    const b = statusBadge(item.status);
                    const raw = item.raw_output ?? item.output ?? item.result ?? item.text ?? "";

                    return (
                      <button
                        key={item.id}
                        className="w-full text-left rounded-md border p-3 hover:bg-slate-50"
                        onClick={() => {
                          setOutput(raw ? raw.toString() : "");
                          setSessionId(item.session_id ?? null);
                          setViewMode("history"); // ✅ READ ONLY
                          setMenuView("history");
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium truncate">{title}</div>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${b.cls}`}>
                            {b.label}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </button>
                    );
                  })}

                  {history.length === 0 && (
                    <div className="text-sm text-slate-500">
                      Ingen aktivitet än. Klicka “Generera nytt möte” för att komma igång.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meeting Card: bara Generera eller read-only */}
          {shouldShowMeetingCard && (
            <Card>
              <CardHeader className="space-y-3">
                <CardTitle>Beskriv kund & mål</CardTitle>

                {viewMode === "history" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetForNewMeeting();
                      setViewMode("new");
                      setMenuView("generate");
                    }}
                  >
                    ← Tillbaka (nytt möte)
                  </Button>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Aktivt möte-indikator */}
                {menuView === "generate" && viewMode === "new" && sessionId && (
                  <div className="rounded-md border bg-sky-50 px-3 py-2 text-sm text-sky-900">
                    🔵 Aktivt möte: <span className="font-semibold">{activeCompanyLabel}</span>
                    {isClosedSession && (
                      <span className="ml-2 text-xs text-sky-700">
                        (stängt: {statusBadge(currentSessionMeta.status).label.toLowerCase()})
                      </span>
                    )}
                  </div>
                )}

                {/* ✅ Generator syns BARA i Generera */}
                {menuView === "generate" && viewMode === "new" && (
                  <>
                    <div className="space-y-2">
                      <Label>Företagsnamn</Label>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 text-sm"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Ex: Acme AB"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Kundföretag, mål & kontext</Label>
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ex: Jag säljer X till Y... Målet är att boka demo…"
                        rows={6}
                      />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Button
                        className="w-full sm:w-auto sm:flex-1"
                        onClick={onGenerate}
                        disabled={loading || (sessionId ? isClosedSession : false)}
                        title={sessionId && isClosedSession ? "Detta möte är stängt. Skapa ett nytt möte." : undefined}
                      >
                        {loading ? "Cebrion tänker…" : "Skapa samtalsunderlag"}
                      </Button>

                      {sessionId && (
                        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto sm:flex-nowrap">
                          <Button
                            variant="outline"
                            disabled={loading || isClosedSession}
                            onClick={() => updateSession("demo_booked", { closeAfter: true })}
                          >
                            📅 Demo bokad
                          </Button>

                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={loading || isClosedSession}
                            onClick={() => updateSession("won", { closeAfter: true })}
                          >
                            ✅ Vunnen affär
                          </Button>

                          <Button
                            variant="destructive"
                            disabled={loading || isClosedSession}
                            onClick={() => updateSession("lost", { closeAfter: true })}
                          >
                            ❌ Förlorad
                          </Button>
                        </div>
                      )}
                    </div>

                    {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
                  </>
                )}

                {/* Tabs syns när det finns output */}
                {output !== null && <TabsView rawText={output || ""} />}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}