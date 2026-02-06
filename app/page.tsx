"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [form, setForm] = useState({
    product: "",
    audience: "",
    objections: "",
    advantage: "",
  });

  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [dark, setDark] = useState(false);

  // Ladda tema + historik
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") setDark(true);

    const savedHistory = localStorage.getItem("scriptHistory");
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // Spara tema
  useEffect(() => {
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  function copy(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  }

  async function generate() {
    setLoading(true);
    setResult("");

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    const text = data.result || "";

    setResult(text);

    const updated = [text, ...history].slice(0, 5);
    setHistory(updated);
    localStorage.setItem("scriptHistory", JSON.stringify(updated));

    setLoading(false);
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: 20,
        background: dark ? "#111" : "#fff",
        color: dark ? "#f5f5f5" : "#111",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: 32 }}>AI‑Säljscript</h1>

      <button
        onClick={() => setDark(!dark)}
        style={{
          marginBottom: 20,
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid #ccc",
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
        }}
      >
        {dark ? "🌞 Ljust läge" : "🌙 Mörkt läge"}
      </button>

      <textarea
        placeholder="Produkt / tjänst"
        value={form.product}
        onChange={(e) => setForm({ ...form, product: e.target.value })}
        style={{ width: "100%", marginTop: 10 }}
      />

      <textarea
        placeholder="Målgrupp"
        value={form.audience}
        onChange={(e) => setForm({ ...form, audience: e.target.value })}
        style={{ width: "100%", marginTop: 10 }}
      />

      <textarea
        placeholder="Vanliga invändningar"
        value={form.objections}
        onChange={(e) => setForm({ ...form, objections: e.target.value })}
        style={{ width: "100%", marginTop: 10 }}
      />

      <textarea
        placeholder="Varför är ni bättre?"
        value={form.advantage}
        onChange={(e) => setForm({ ...form, advantage: e.target.value })}
        style={{ width: "100%", marginTop: 10 }}
      />

      <button
        onClick={generate}
        disabled={loading}
        style={{ marginTop: 16 }}
      >
        {loading ? "Genererar…" : "Generera säljscript"}
      </button>

      {result && (
        <section style={{ marginTop: 32, display: "grid", gap: 16 }}>
          {result.split("\n\n").map((block, i) => (
            <div
  key={i}
  style={{
    padding: 16,
    background: dark ? "#1e1e1e" : "#f5f5f5",
    borderRadius: 8,
    position: "relative",
    lineHeight: 1.6,
    border: dark ? "1px solid #333" : "1px solid #ddd",
    boxShadow: dark
      ? "0 4px 10px rgba(0,0,0,0.6)"
      : "0 2px 6px rgba(0,0,0,0.1)",
  }}
>

              <button
                onClick={() => copy(block, i)}
                style={{
                  position: "absolute",
                  top: -12,
                  right: -12,
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #ddd",
                  background:
                    copiedIndex === i ? "#d1fae5" : "white",
                  cursor: "pointer",
                }}
              >
                {copiedIndex === i ? "Kopierat!" : "Kopiera"}
              </button>

              {block}
            </div>
          ))}
        </section>
      )}

      {history.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <h3>Tidigare script</h3>
          <ul style={{ marginTop: 12, paddingLeft: 16 }}>
            {history.map((item, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                <button
                  onClick={() => setResult(item)}
                  style={{
                    textDecoration: "underline",
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "inherit",
                  }}
                >
                  Visa script #{i + 1}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
