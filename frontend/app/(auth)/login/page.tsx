"use client";

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
    <main className="min-h-screen flex items-center justify-center bg-[#0A0F1E]">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-serif text-[#F59E0B] tracking-tight">LEXIA</h1>
          <p className="text-[#94A3B8] text-sm mt-1">Plataforma Legal IA</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#111827] border border-[#1E2A3D] p-8 space-y-4"
        >
          <div>
            <label className="block text-xs text-[#94A3B8] uppercase tracking-widest mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0A0F1E] border border-[#1E2A3D] px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#94A3B8] uppercase tracking-widest mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0A0F1E] border border-[#1E2A3D] px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F59E0B] text-[#0A0F1E] py-2 text-sm font-semibold uppercase tracking-widest hover:bg-amber-400 transition disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
