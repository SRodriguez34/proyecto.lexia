"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [firmName, setFirmName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firm_name: firmName }),
    });

    const body = await res.json();

    if (!res.ok) {
      setError(body.detail ?? "Error al registrarse");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-navy">
        <div className="w-full max-w-sm text-center bg-navy-mid border border-[var(--color-border)] p-8 rounded-lg">
          <h1 className="text-xl font-display text-cream mb-3">Revisá tu email</h1>
          <p className="text-slate text-sm font-body">
            Te enviamos un enlace de verificación a <strong className="text-cream">{email}</strong>.
            Hacé click en el enlace para activar tu cuenta y luego ingresá.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-gold text-sm font-body hover:text-gold-soft"
          >
            Ir al login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-navy">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-display text-gold tracking-tight">LEXIA</h1>
          <p className="text-slate text-sm font-body mt-1">Creá tu cuenta</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-navy-mid border border-[var(--color-border)] p-8 space-y-4 rounded-lg"
        >
          <div>
            <label className="block text-xs font-body font-medium text-slate uppercase tracking-widest mb-1">
              Nombre del estudio
            </label>
            <input
              type="text"
              required
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              className="w-full bg-navy border border-[var(--color-border)] px-3 py-2 text-sm font-body text-cream rounded-[4px] focus:outline-none focus:border-gold"
              placeholder="Ej. García & Asociados"
            />
          </div>

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-navy border border-[var(--color-border)] px-3 py-2 text-sm font-body text-cream rounded-[4px] focus:outline-none focus:border-gold"
            />
          </div>

          {error && <p className="text-red-400 text-xs font-body">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-navy py-2 text-sm font-body font-semibold uppercase tracking-widest rounded-[6px] hover:bg-gold-soft transition-colors disabled:opacity-50"
          >
            {loading ? "Registrando…" : "Crear cuenta"}
          </button>

          <p className="text-center text-slate text-xs font-body pt-2">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-gold hover:text-gold-soft">
              Ingresar
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
