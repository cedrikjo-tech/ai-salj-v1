"use client";

import { useState } from "react";

export default function Home() {
  const [dark, setDark] = useState(false);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!input) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      const data = await res.json();
      setResult(data.raw_output);
    } catch (e) {
      console.error(e);
      setResult("Något gick fel. Försök igen.");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

 return (
  <main
    style={{
      maxWidth: 900,
      margin: "40px auto",
      padding: 24,
      fontFamily: "system-ui, sans-serif",
    }}
  >
    <h1 style={{ fontSize: 32, marginBottom: 8 }}>AI‑Sälj</h1>
    <p style={{ color: "#555", marginBottom: 20 }}>
      Generera ett färdigt säljscript baserat på din situation
    </p>

    <textarea
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder="Beskriv kund, erbjudande och situation…"
      style={{
        width: "100%",
        minHeight: 140,
        padding: 12,
        fontSize: 15,
        borderRadius: 6,
        border: "1px solid #ccc",
      }}
    />

    <button
      onClick={generate}
      disabled={loading}
      style={{
        marginTop: 16,
        padding: "10px 16px",
        fontSize: 15,
        borderRadius: 6,
        border: "none",
        cursor: "pointer",
        background: loading ? "#9ca3af" : "#2563eb",
        color: "white",
      }}
    >
      {loading ? "AI tänker…" : "Generera säljscript"}
    </button>

    {result && (
      <section
        style={{
          marginTop: 32,
          background: "#f9fafb",
          padding: 20,
          borderRadius: 8,
          position: "relative",
          lineHeight: 1.6,
        }}
      >
        <button
          onClick={() => navigator.clipboard.writeText(result)}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            padding: "6px 10px",
            fontSize: 13,
            borderRadius: 6,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer",
          }}
        >
          Kopiera
        </button>

        <pre
          style={{
            whiteSpace: "pre-wrap",
            margin: 0,
            fontFamily: "inherit",
          }}
        >
          {result}
        </pre>
      </section>
    )}
  </main>
);

}
