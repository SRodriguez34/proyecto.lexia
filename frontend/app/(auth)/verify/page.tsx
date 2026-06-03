"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token no válido.");
      return;
    }
    fetch(`${BASE_URL}/auth/verify/${token}`, { method: "POST" })
      .then((r) => r.json())
      .then((body) => {
        if (body.error) {
          setStatus("error");
          setMessage(body.error);
        } else {
          setStatus("ok");
          setMessage(body.data?.message ?? "Email verificado.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Error de conexión. Intentá de nuevo.");
      });
  }, [token, BASE_URL]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-navy">
      <div className="w-full max-w-sm text-center bg-navy-mid border border-[var(--color-border)] p-8 rounded-lg">
        {status === "loading" && (
          <p className="text-slate text-sm font-body">Verificando…</p>
        )}
        {status === "ok" && (
          <>
            <h1 className="text-xl font-display text-cream mb-3">¡Cuenta activada!</h1>
            <p className="text-slate text-sm font-body mb-6">{message}</p>
            <Link
              href="/login"
              className="inline-block bg-gold text-navy px-6 py-2 text-sm font-body font-semibold uppercase tracking-widest rounded-[6px] hover:bg-gold-soft transition-colors"
            >
              Ingresar
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-xl font-display text-red-400 mb-3">Error</h1>
            <p className="text-slate text-sm font-body">{message}</p>
          </>
        )}
      </div>
    </main>
  );
}
