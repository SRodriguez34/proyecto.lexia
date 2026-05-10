"use client";

import { useEffect, useState, use } from "react";
import { api, Matter, Document } from "@/lib/api";
import { LegalChat } from "@/components/LegalChat";
import { DocumentUpload } from "@/components/DocumentUpload";

type Tab = "documentos" | "chat" | "plazos" | "resumen";

export default function MatterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [matter, setMatter] = useState<Matter & { documents?: Document[] } | null>(null);
  const [tab, setTab] = useState<Tab>("documentos");
  const [summary, setSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    api.getMatter(id).then((r) => setMatter(r.data as Matter & { documents?: Document[] }));
  }, [id]);

  async function loadSummary() {
    setLoadingSummary(true);
    const r = await api.getMatterSummary(id);
    setSummary(r.data.summary);
    setLoadingSummary(false);
  }

  if (!matter) return <div className="p-8 text-slate font-body">Cargando...</div>;

  const docs = matter.documents ?? [];
  const deadlines: { description: string; date?: string; is_critical?: boolean }[] = [];
  docs.forEach((d) => {
    const dl = (d.metadata?.deadlines as typeof deadlines) ?? [];
    deadlines.push(...dl);
  });

  const TABS: { key: Tab; label: string }[] = [
    { key: "documentos", label: "Documentos" },
    { key: "chat",       label: "Chat" },
    { key: "plazos",     label: "Plazos" },
    { key: "resumen",    label: "Resumen IA" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[var(--color-border)]">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-display font-semibold text-cream">{matter.caratula}</h1>
            <p className="text-sm font-body text-slate mt-1">{matter.client_name} · {matter.matter_type}</p>
          </div>
          <span className={`text-xs font-body px-3 py-1 border rounded-[6px] ${
            matter.status === "active"
              ? "border-green-500 text-green-400"
              : "border-[var(--color-border)] text-slate"
          }`}>
            {matter.status}
          </span>
        </div>

        <div className="flex gap-1 mt-4">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-body rounded-[6px] transition-colors ${
                tab === key
                  ? "bg-gold text-navy font-semibold"
                  : "text-slate hover:text-cream"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "documentos" && (
          <div className="p-6 max-w-3xl space-y-4">
            <DocumentUpload
              matterId={id}
              onUploaded={() => api.getMatter(id).then((r) => setMatter(r.data as Matter & { documents?: Document[] }))}
            />
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex justify-between bg-navy-mid border border-[var(--color-border)] px-4 py-3 rounded-lg">
                  <span className="text-sm font-mono text-cream">{doc.filename}</span>
                  <span className={`text-xs font-body ${
                    doc.status === "indexed" ? "text-green-400" :
                    doc.status === "failed"  ? "text-red-400"   : "text-slate"
                  }`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "chat" && (
          <div className="h-full flex flex-col" style={{ height: "calc(100vh - 200px)" }}>
            <LegalChat matterId={id} />
          </div>
        )}

        {tab === "plazos" && (
          <div className="p-6 max-w-2xl">
            {deadlines.length === 0 ? (
              <p className="text-slate text-sm font-body">No se extrajeron plazos de los documentos.</p>
            ) : (
              <div className="relative border-l border-[var(--color-border)] pl-6 space-y-4">
                {deadlines.map((dl, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-8 w-3 h-3 rounded-full border-2 ${
                      dl.is_critical ? "border-red-400 bg-red-900" : "border-gold bg-navy-mid"
                    }`} />
                    <div className="bg-navy-mid border border-[var(--color-border)] p-4 rounded-lg">
                      <p className="text-sm font-body text-cream">{dl.description}</p>
                      {dl.date && <p className="text-xs font-body text-slate mt-1">{dl.date}</p>}
                      {dl.is_critical && <p className="text-xs font-body text-red-400 mt-1 uppercase tracking-wider">Crítico</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "resumen" && (
          <div className="p-6 max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-body font-medium text-slate uppercase tracking-widest">
                Resumen generado por IA
              </h2>
              <button
                onClick={loadSummary}
                disabled={loadingSummary}
                className="text-xs font-body text-gold border border-gold px-3 py-1.5 rounded-[6px] hover:bg-gold hover:text-navy transition-colors disabled:opacity-50"
              >
                {loadingSummary ? "Generando..." : "Generar / Actualizar"}
              </button>
            </div>
            {summary ? (
              <div className="bg-navy-mid border border-[var(--color-border)] p-6 text-sm font-mono text-cream whitespace-pre-wrap rounded-lg">
                {summary}
              </div>
            ) : (
              <p className="text-slate text-sm font-body">
                Hacé click en &ldquo;Generar&rdquo; para crear el resumen de esta causa.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
