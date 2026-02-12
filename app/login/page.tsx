"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const supabase = createSupabaseBrowser();
  const router = useRouter(); // ✅ hook här uppe

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // ✅ Inloggad – redirect korrekt
      router.refresh();
      router.push("/");

    } catch (err: any) {
      setError(err.message || "Fel e‑post eller lösenord");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Logga in till ditt säljteam
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Din säljassistent för varje samtal.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">E‑postadress</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@epost.se"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Lösenord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
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
            disabled={loading || !email || !password}
            className="mt-2 w-full rounded-md bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Loggar in…" : "Fortsätt"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Har du inget konto?{" "}
          <a href="/signup" className="font-medium text-slate-900 underline">
            Skapa ett här
          </a>
        </p>
      </div>
    </main>
  );
}
