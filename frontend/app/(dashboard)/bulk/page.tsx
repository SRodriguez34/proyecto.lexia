"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const MATERIAS = ["civil","comercial","laboral","penal","familia","administrativo","constitucional","otro"];

export default function BulkPage() {
  const [documents, setDocuments] = useState<{id:string;filename:string}[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [checklist, setChecklist] = useState<string[]>([""]);
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<{id:string;name:string;checklist:{punto:string}[]}[]>([]);
  const [reviewId, setReviewId] = useState<string|null>(null);
  const [status, setStatus] = useState<string>("");
  const [results, setResults] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listDocuments().then(r => setDocuments((r as {data:{id:string;filename:string}[]}).data || []));
    api.listTemplates().then(r => setTemplates((r as {data:{id:string;name:string;checklist:{punto:string}[]}[]}).data || []));
  }, []);

  function applyTemplate(tid: string) {
    const t = templates.find(t => t.id === tid);
    if (t) setChecklist(t.checklist.map((p: {punto:string}) => p.punto));
    setTemplateId(tid);
  }

  function toggleDoc(id: string) {
    setSelectedDocs(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function handleStart() {
    const pts = checklist.filter(p => p.trim());
    if (selectedDocs.size === 0) { setError("Seleccioná al menos un documento"); return; }
    if (pts.length === 0) { setError("Agregá al menos un punto al checklist"); return; }
    setLoading(true); setError(""); setResults([]);
    const res = await api.startBulkReview({ document_ids: [...selectedDocs], checklist: pts });
    const rid = (res as {data:{review_id:string}}).data.review_id;
    setReviewId(rid);
    setStatus("queued");
    pollStatus(rid);
  }

  async function pollStatus(rid: string) {
    let tries = 0;
    const interval = setInterval(async () => {
      tries++;
      const r = await api.getBulkResults(rid);
      const d = (r as {data:{status:string;results:unknown[]}}).data;
      setStatus(d.status);
      if (d.results) setResults(d.results);
      if (d.status === "complete" || d.status === "failed" || tries > 120) {
        clearInterval(interval);
        setLoading(false);
      }
    }, 3000);
  }

  const pts = checklist.filter(p => p.trim());
  const rows = results as {document_name:string;results:Record<string,{presente:boolean|null;fragmento:string|null}>}[];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-display text-cream mb-2">Bulk Document Review</h1>
      <p className="text-slate text-sm font-body mb-8">
        Analizá múltiples documentos contra un checklist de puntos en paralelo.
      </p>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Left: document selector */}
        <div className="bg-navy-mid border border-[var(--color-border)] rounded-lg p-5">
          <p className="text-xs font-body text-slate uppercase tracking-widest mb-3">
            Documentos ({selectedDocs.size} seleccionados)
          </p>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {documents.map(d => (
              <label key={d.id} className="flex items-center gap-2 cursor-pointer text-sm font-body text-slate hover:text-cream py-1">
                <input type="checkbox" checked={selectedDocs.has(d.id)} onChange={() => toggleDoc(d.id)} className="accent-gold" />
                {d.filename}
              </label>
            ))}
          </div>
        </div>

        {/* Right: checklist builder */}
        <div className="bg-navy-mid border border-[var(--color-border)] rounded-lg p-5">
          <p className="text-xs font-body text-slate uppercase tracking-widest mb-3">Checklist</p>
          {templates.length > 0 && (
            <select
              value={templateId}
              onChange={e => applyTemplate(e.target.value)}
              className="w-full bg-navy border border-[var(--color-border)] px-3 py-2 text-xs font-body text-slate rounded-[4px] mb-3 focus:outline-none focus:border-gold"
            >
              <option value="">Usar template…</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {checklist.map((pt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={pt}
                  onChange={e => setChecklist(prev => prev.map((p, j) => j === i ? e.target.value : p))}
                  placeholder={`Punto ${i+1}…`}
                  className="flex-1 bg-navy border border-[var(--color-border)] px-3 py-1.5 text-xs font-body text-cream rounded-[4px] focus:outline-none focus:border-gold"
                />
                <button onClick={() => setChecklist(p => p.filter((_, j) => j !== i))} className="text-slate hover:text-red-400 text-sm">✕</button>
              </div>
            ))}
          </div>
          <button onClick={() => setChecklist(p => [...p, ""])} className="mt-2 text-xs font-body text-gold hover:text-gold-soft">
            + Agregar punto
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs font-body mb-4">{error}</p>}

      <div className="flex gap-3 mb-8">
        <button
          onClick={handleStart}
          disabled={loading}
          className="bg-gold text-navy px-6 py-2 text-sm font-body font-semibold uppercase tracking-widest rounded-[6px] hover:bg-gold-soft transition-colors disabled:opacity-40"
        >
          {loading ? `Procesando… (${status})` : "Iniciar revisión"}
        </button>
        {reviewId && status === "complete" && (
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL}/bulk/${reviewId}/export`}
            className="border border-[var(--color-border)] text-cream px-6 py-2 text-sm font-body font-semibold uppercase tracking-widest rounded-[6px] hover:border-[var(--color-border-hover)] transition-colors"
          >
            Exportar CSV
          </a>
        )}
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-body border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 pr-4 text-slate">Documento</th>
                {pts.map((p, i) => <th key={i} className="text-left py-2 pr-3 text-slate max-w-32 truncate" title={p}>{p.slice(0,30)}{p.length>30?"…":""}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-[var(--color-border)] hover:bg-navy-mid">
                  <td className="py-2 pr-4 text-cream max-w-48 truncate" title={row.document_name}>{row.document_name}</td>
                  {pts.map((p, pi) => {
                    const r = row.results?.[p];
                    return (
                      <td key={pi} className="py-2 pr-3" title={r?.fragmento ?? ""}>
                        <span className={r?.presente === true ? "text-green-400" : r?.presente === false ? "text-red-400" : "text-slate"}>
                          {r?.presente === true ? "✓ SI" : r?.presente === false ? "✗ NO" : "?"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
