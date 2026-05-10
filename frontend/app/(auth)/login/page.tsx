"use client";

export const dynamic = "force-dynamic";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.session) {
      setError(authError?.message ?? "Error al iniciar sesión");
      setLoading(false);
      return;
    }

    const firmId = data.user.user_metadata?.firm_id;
    if (firmId) sessionStorage.setItem("firm_id", firmId);

    router.push("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-navy">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-display text-gold tracking-tight">LEXIA</h1>
          <p className="text-slate text-sm font-body mt-1">Plataforma Legal IA</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-navy-mid border border-[var(--color-border)] p-8 space-y-4 rounded-lg"
        >
          <div>
            <label className="block text-xs font-body font-medium text-slate uppercase tracking-widest mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-navy border border-[var(--color-border)] px-3 py-2 text-sm font-body text-cream rounded-[4px] focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-slate uppercase tracking-widest mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-navy border border-[var(--color-border)] px-3 py-2 text-sm font-body text-cream rounded-[4px] focus:outline-none focus:border-gold"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs font-body">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-navy py-2 text-sm font-body font-semibold uppercase tracking-widest rounded-[6px] hover:bg-gold-soft transition-colors disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
