"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const MATERIAS = [
  { value: "civil",           label: "Civil" },
  { value: "comercial",       label: "Comercial" },
  { value: "laboral",         label: "Laboral" },
  { value: "penal",           label: "Penal" },
  { value: "familia",         label: "Familia" },
  { value: "administrativo",  label: "Administrativo" },
  { value: "constitucional",  label: "Constitucional" },
  { value: "otro",            label: "Otra" },
];

export default function OnboardingStep2() {
  const router = useRouter();
  const [materia, setMateria] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    if (!materia) return;
    setLoading(true);
    await api.saveOnboardingStep({ step: 2, materia_principal: materia });
    router.push("/onboarding/step-3");
  }

  return (
    <div className="bg-navy-mid border border-[var(--color-border)] rounded-lg p-8">
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= 2 ? "bg-gold" : "bg-navy-light"}`} />
        ))}
      </div>

      <h1 className="text-xl font-display text-cream mb-1">¿Cuál es la materia principal del estudio?</h1>
      <p className="text-slate text-sm font-body mb-6">
        Usamos esto para priorizar jurisprudencia y normativa relevante.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {MATERIAS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setMateria(value)}
            className={`py-3 text-sm font-body rounded-[6px] border transition-colors ${
              materia === value
                ? "bg-gold text-navy border-gold font-semibold"
                : "bg-navy border-[var(--color-border)] text-slate hover:text-cream hover:border-[var(--color-border-hover)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={handleNext}
        disabled={!materia || loading}
        className="w-full bg-gold text-navy py-2 text-sm font-body font-semibold uppercase tracking-widest rounded-[6px] hover:bg-gold-soft transition-colors disabled:opacity-40"
      >
        {loading ? "Guardando…" : "Siguiente"}
      </button>
    </div>
  );
}
