"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const PROVINCIAS = [
  "Buenos Aires","CABA","Catamarca","Chaco","Chubut","Córdoba","Corrientes",
  "Entre Ríos","Formosa","Jujuy","La Pampa","La Rioja","Mendoza","Misiones",
  "Neuquén","Río Negro","Salta","San Juan","San Luis","Santa Cruz","Santa Fe",
  "Santiago del Estero","Tierra del Fuego","Tucumán",
];

export default function OnboardingStep1() {
  const router = useRouter();
  const [provincia, setProvincia] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    if (!provincia) return;
    setLoading(true);
    await api.saveOnboardingStep({ step: 1, provincia });
    router.push("/onboarding/step-2");
  }

  return (
    <div className="bg-navy-mid border border-[var(--color-border)] rounded-lg p-8">
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n === 1 ? "bg-gold" : "bg-navy-light"}`} />
        ))}
      </div>

      <h1 className="text-xl font-display text-cream mb-1">¿En qué provincia ejerce el estudio?</h1>
      <p className="text-slate text-sm font-body mb-6">
        Esto nos permite calibrar la búsqueda de jurisprudencia y normativa local.
      </p>

      <select
        value={provincia}
        onChange={(e) => setProvincia(e.target.value)}
        className="w-full bg-navy border border-[var(--color-border)] px-3 py-2 text-sm font-body text-cream rounded-[4px] focus:outline-none focus:border-gold mb-6"
      >
        <option value="">Seleccionar provincia…</option>
        {PROVINCIAS.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      <button
        onClick={handleNext}
        disabled={!provincia || loading}
        className="w-full bg-gold text-navy py-2 text-sm font-body font-semibold uppercase tracking-widest rounded-[6px] hover:bg-gold-soft transition-colors disabled:opacity-40"
      >
        {loading ? "Guardando…" : "Siguiente"}
      </button>
    </div>
  );
}
