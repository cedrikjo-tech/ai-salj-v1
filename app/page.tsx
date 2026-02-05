"use client";
import { useState } from "react";

export default function Home() {
  const [form, setForm] = useState({
    product: "",
    audience: "",
    objections: "",
    advantage: "",
  });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setResult(data.result);
    setLoading(false);
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Skapa säljscript</h1>

      <textarea
        className="w-full border p-2 rounded"
        placeholder="Vad säljer ni?"
        onChange={(e) => setForm({ ...form, product: e.target.value })}
      />
      <textarea
        className="w-full border p-2 rounded"
        placeholder="Målgrupp?"
        onChange={(e) => setForm({ ...form, audience: e.target.value })}
      />
      <textarea
        className="w-full border p-2 rounded"
        placeholder="Vanliga invändningar?"
        onChange={(e) => setForm({ ...form, objections: e.target.value })}
      />
      <textarea
        className="w-full border p-2 rounded"
        placeholder="Varför är ni bättre?"
        onChange={(e) => setForm({ ...form, advantage: e.target.value })}
      />

      <button
        onClick={generate}
        className="bg-black text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? "Genererar..." : "Generera säljscript"}
      </button>

      {result && (
        <pre className="whitespace-pre-wrap border p-4 rounded bg-gray-50">
          {result}
        </pre>
      )}
    </main>
  );
}
