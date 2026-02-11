"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1️⃣ Skapa user via Supabase Auth (CLIENT-SIDE)
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError || !data.user) {
        throw authError ?? new Error("Kunde inte skapa konto");
      }

      // 2️⃣ Skapa team via backend (ENKEL route)
      const res = await fetch("/api/create-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName,
          userId: data.user.id,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Kunde inte skapa team");
      }

      // 3️⃣ Klart 🎉
      window.location.href = "/login";
    } catch (err: any) {
      setError(err.message || "Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Skapa konto för ditt säljteam
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Kom igång med din säljassistent på några minuter.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">E‑postadress</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Lösenord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="space-y-1 pt-2">
            <label className="text-sm font-medium">Team‑namn</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password || !teamName}
            className="mt-2 w-full rounded-md bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Skapar konto…" : "Skapa konto"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Har du redan ett konto?{" "}
          <a href="/login" className="font-medium text-slate-900 underline">
            Logga in
          </a>
        </p>
      </div>
    </main>
  );
}
