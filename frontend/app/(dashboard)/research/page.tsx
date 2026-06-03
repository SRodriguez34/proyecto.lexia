"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

interface ResearchSession {
  id: string;
  query: string;
  status: "planning" | "running" | "complete" | "failed";
  plan: Array<{ step: number; source: string; search_terms: string[]; expected_info: string }> | null;
  result_memo: string | null;
  sources: Array<{ rank: number; title: string; source: string; url: string | null; relevance: number; excerpt: string }> | null;
  created_at: string;
  completed_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  planning: "Generando plan de investigación…",
  running: "Ejecutando búsquedas en paralelo…",
  complete: "Investigación completada",
  failed: "Error durante la investigación",
};

const STATUS_COLORS: Record<string, string> = {
  planning: "text-gold",
  running: "text-gold",
  complete: "text-green-400",
  failed: "text-red-400",
};

export default function ResearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<ResearchSession | null>(null);
  const [history, setHistory] = useState<ResearchSession[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadHistory();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function loadHistory() {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`${BASE_URL}/research`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const body = await res.json();
      setHistory(body.data || []);
    }
  }

  async function pollSession(sessionId: string) {
    const token = await getToken();
    const res = await fetch(`${BASE_URL}/research/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const body = await res.json();
    const s: ResearchSession = body.data;
    setSession(s);
    if (s.status === "complete" || s.status === "failed") {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      loadHistory();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().split(" ").length < 5) {
      setError("La consulta debe tener al menos 5 palabras.");
      return;
    }
    setLoading(true);
    setError("");
    setSession(null);

    const token = await getToken();
    const res = await fetch(`${BASE_URL}/research/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.detail ?? "Error al iniciar la investigación");
      setLoading(false);
      return;
    }

    const sessionId = body.data.session_id;
    setSession({ id: sessionId, query, status: "planning", plan: null, result_memo: null, sources: null, created_at: new Date().toISOString(), completed_at: null });
    setLoading(false);

    pollRef.current = setInterval(() => pollSession(sessionId), 3000);
  }

  function downloadMemo() {
    if (!session?.result_memo) return;
    const blob = new Blob([session.result_memo], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memo-${session.id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display text-cream mb-2">Deep Research</h1>
        <p className="text-slate text-sm font-body">
          Investigación jurídica multi-paso sobre SAIJ, InfoLEG y los documentos del estudio.
          Recibe un memo estructurado con fuentes verificables.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="bg-navy-mid border border-[var(--color-border)] rounded-lg p-6">
          <label className="block text-xs font-body font-medium text-slate uppercase tracking-widest mb-2">
            Consulta de investigación
          </label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
            placeholder="Ej: ¿Cuál es la jurisprudencia actual de la CSJN sobre el cómputo de intereses en contratos de consumo?"
            className="w-full bg-navy border border-[var(--color-border)] px-3 py-2 text-sm font-body text-cream rounded-[4px] focus:outline-none focus:border-gold resize-none mb-4"
          />
          {error && <p className="text-red-400 text-xs font-body mb-3">{error}</p>}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-gold text-navy px-6 py-2 text-sm font-body font-semibold uppercase tracking-widest rounded-[6px] hover:bg-gold-soft transition-colors disabled:opacity-40"
          >
            {loading ? "Iniciando…" : "Iniciar investigación"}
          </button>
        </div>
      </form>

      {session && (
        <div className="bg-navy-mid border border-[var(--color-border)] rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className={`text-sm font-body font-medium ${STATUS_COLORS[session.status]}`}>
              {STATUS_LABELS[session.status]}
            </span>
            {session.status === "complete" && (
              <button
                onClick={downloadMemo}
                className="text-xs font-body text-gold hover:text-gold-soft border border-[var(--color-border)] hover:border-[var(--color-border-hover)] px-3 py-1.5 rounded-[4px] transition-colors"
              >
                Descargar memo (.md)
              </button>
            )}
          </div>

          {session.plan && (session.status === "running" || session.status === "complete") && (
            <div className="mb-4">
              <p className="text-xs font-body text-slate uppercase tracking-widest mb-2">Plan de investigación</p>
              <div className="space-y-1">
                {session.plan.map((step) => (
                  <div key={step.step} className="flex items-start gap-2 text-sm font-body">
                    <span className="text-gold shrink-0">Paso {step.step}</span>
                    <span className="text-slate">{step.expected_info}</span>
                    <span className="text-slate-dark ml-auto shrink-0">({step.source})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {session.result_memo && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <p className="text-xs font-body text-slate uppercase tracking-widest mb-3">Memo de investigación</p>
              <div className="prose prose-invert max-w-none text-sm font-body text-slate whitespace-pre-wrap leading-relaxed">
                {session.result_memo}
              </div>
            </div>
          )}

          {session.sources && session.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <p className="text-xs font-body text-slate uppercase tracking-widest mb-3">
                {session.sources.length} fuentes consultadas
              </p>
              <div className="space-y-2">
                {session.sources.slice(0, 5).map((src) => (
                  <div key={src.rank} className="text-xs font-body">
                    <span className="text-gold">[{src.rank}]</span>{" "}
                    {src.url ? (
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-cream hover:text-gold">
                        {src.title}
                      </a>
                    ) : (
                      <span className="text-cream">{src.title}</span>
                    )}
                    {" "}<span className="text-slate-dark">({src.source})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="text-sm font-body font-medium text-slate uppercase tracking-widest mb-3">
            Investigaciones recientes
          </h2>
          <div className="space-y-2">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => setSession(h)}
                className="w-full text-left bg-navy-mid border border-[var(--color-border)] hover:border-[var(--color-border-hover)] rounded-lg p-4 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-body text-cream truncate">{h.query}</p>
                  <span className={`text-xs font-body shrink-0 ${STATUS_COLORS[h.status]}`}>
                    {h.status}
                  </span>
                </div>
                <p className="text-xs font-body text-slate-dark mt-1">
                  {new Date(h.created_at).toLocaleDateString("es-AR")}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
