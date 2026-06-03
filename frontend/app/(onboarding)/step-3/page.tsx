"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function OnboardingStep3() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    await api.uploadDocument(file);
    setUploaded(true);
    setLoading(false);
  }

  async function handleFinish() {
    setLoading(true);
    await api.saveOnboardingStep({ step: 3, completed: true });
    router.push("/dashboard");
  }

  return (
    <div className="bg-navy-mid border border-[var(--color-border)] rounded-lg p-8">
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-1 flex-1 rounded-full bg-gold" />
        ))}
      </div>

      <h1 className="text-xl font-display text-cream mb-1">Subí tu primer documento</h1>
      <p className="text-slate text-sm font-body mb-6">
        Opcional. Podés subir un contrato, sentencia o cualquier documento legal
        para probarlo de inmediato. También podés hacerlo después desde el dashboard.
      </p>

      {!uploaded ? (
        <div className="mb-6">
          <label className="block w-full border border-dashed border-[var(--color-border)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--color-border-hover)] transition-colors">
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <span className="text-cream text-sm font-body">{file.name}</span>
            ) : (
              <span className="text-slate text-sm font-body">
                PDF, DOCX o DOC — hasta 50 MB
              </span>
            )}
          </label>
          {file && !uploaded && (
            <button
              onClick={handleUpload}
              disabled={loading}
              className="mt-3 w-full bg-navy border border-[var(--color-border)] text-cream py-2 text-sm font-body rounded-[6px] hover:border-[var(--color-border-hover)] transition-colors disabled:opacity-40"
            >
              {loading ? "Subiendo…" : "Subir documento"}
            </button>
          )}
        </div>
      ) : (
        <div className="mb-6 bg-navy border border-green-800 rounded-lg p-4 text-green-400 text-sm font-body">
          Documento subido correctamente. Se indexará en los próximos minutos.
        </div>
      )}

      <button
        onClick={handleFinish}
        disabled={loading}
        className="w-full bg-gold text-navy py-2 text-sm font-body font-semibold uppercase tracking-widest rounded-[6px] hover:bg-gold-soft transition-colors disabled:opacity-40"
      >
        {loading ? "Iniciando…" : "Ir al dashboard"}
      </button>
    </div>
  );
}
