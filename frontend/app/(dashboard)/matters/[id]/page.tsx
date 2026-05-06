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

  if (!matter) return <div className="p-8 text-[#94A3B8]">Cargando...</div>;

  const docs = matter.documents ?? [];
  const deadlines: { description: string; date?: string; is_critical?: boolean }[] = [];
  docs.forEach((d) => {
    const dl = (d.metadata?.deadlines as typeof deadlines) ?? [];
    deadlines.push(...dl);
  });

  const TABS: { key: Tab; label: string }[] = [
    { key: "documentos", label: "Documentos" },
    { key: "chat", label: "Chat" },
    { key: "plazos", label: "Plazos" },
    { key: "resumen", label: "Resumen IA" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#1E2A3D]">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-serif text-[#F1F5F9]">{matter.caratula}</h1>
            <p className="text-sm text-[#94A3B8] mt-1">{matter.client_name} · {matter.matter_type}</p>
          </div>
          <span className={`text-xs px-3 py-1 border ${
            matter.status === "active" ? "border-green-500 text-green-400" : "border-[#1E2A3D] text-[#94A3B8]"
          }`}>
            {matter.status}
          </span>
        </div>

        <div className="flex gap-1 mt-4">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm transition ${
                tab === key
                  ? "bg-[#F59E0B] text-[#0A0F1E] font-semibold"
                  : "text-[#94A3B8] hover:text-[#F1F5F9]"
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
                <div key={doc.id} className="flex justify-between bg-[#111827] border border-[#1E2A3D] px-4 py-3">
                  <span className="text-sm text-[#F1F5F9] font-mono">{doc.filename}</span>
                  <span className={`text-xs ${
                    doc.status === "indexed" ? "text-green-400" :
                    doc.status === "failed" ? "text-red-400" : "text-[#94A3B8]"
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
              <p className="text-[#94A3B8] text-sm">No se extrajeron plazos de los documentos.</p>
            ) : (
              <div className="relative border-l border-[#1E2A3D] pl-6 space-y-4">
                {deadlines.map((dl, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-8 w-3 h-3 rounded-full border-2 ${
                      dl.is_critical ? "border-red-400 bg-red-900" : "border-[#F59E0B] bg-[#111827]"
                    }`} />
                    <div className="bg-[#111827] border border-[#1E2A3D] p-4">
                      <p className="text-sm text-[#F1F5F9]">{dl.description}</p>
                      {dl.date && <p className="text-xs text-[#94A3B8] mt-1">{dl.date}</p>}
                      {dl.is_critical && <p className="text-xs text-red-400 mt-1">CRÍTICO</p>}
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
              <h2 className="text-sm text-[#94A3B8] uppercase tracking-widest">Resumen generado por IA</h2>
              <button
                onClick={loadSummary}
                disabled={loadingSummary}
                className="text-xs text-[#F59E0B] border border-[#F59E0B] px-3 py-1.5 hover:bg-[#F59E0B] hover:text-[#0A0F1E] transition disabled:opacity-50"
              >
                {loadingSummary ? "Generando..." : "Generar / Actualizar"}
              </button>
            </div>
            {summary ? (
              <div className="bg-[#111827] border border-[#1E2A3D] p-6 text-sm text-[#F1F5F9] whitespace-pre-wrap font-mono">
                {summary}
              </div>
            ) : (
              <p className="text-[#94A3B8] text-sm">Hacé click en "Generar" para crear el resumen de esta causa.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
