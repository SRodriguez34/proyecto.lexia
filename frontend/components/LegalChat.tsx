"use client";

import { useState, useRef, useEffect } from "react";
import { api, QueryResult, Source } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export function LegalChat({ matterId }: { matterId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [useHyde, setUseHyde] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((p) => [...p, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const result = await api.query({ query: userMsg, matter_id: matterId, use_hyde: useHyde });
      const data: QueryResult = result.data;
      setMessages((p) => [
        ...p,
        { role: "assistant", content: data.answer, sources: data.sources },
      ]);
    } catch {
      setMessages((p) => [
        ...p,
        { role: "assistant", content: "Error al consultar. Intente nuevamente." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function toggleSources(idx: number) {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toggles */}
      <div className="flex gap-4 px-4 py-2 border-b border-[var(--color-border)] text-xs font-body text-slate">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useHyde}
            onChange={(e) => setUseHyde(e.target.checked)}
            className="accent-gold"
          />
          HyDE activado
          <span className="text-slate-dark" title="Genera un documento hipotético para mejorar búsquedas coloquiales">(?)</span>
        </label>
        {!matterId && <span className="text-slate-dark">Buscando en toda la firma</span>}
        {matterId  && <span className="text-gold">Solo esta causa</span>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-slate text-sm font-body text-center mt-8">
            Realizá una consulta sobre los documentos indexados
          </p>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-2xl rounded-lg ${
              msg.role === "user"
                ? "bg-navy-light"
                : "bg-navy-mid border border-[var(--color-border)]"
            } p-4`}>
              <p className="text-sm font-body text-cream whitespace-pre-wrap">{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => toggleSources(idx)}
                    className="text-xs font-body text-gold hover:underline"
                  >
                    {expandedSources.has(idx) ? "Ocultar" : "Ver"} fuentes ({msg.sources.length})
                  </button>
                  {expandedSources.has(idx) && (
                    <div className="mt-2 space-y-2">
                      {msg.sources.map((src, si) => (
                        <div key={si} className="bg-navy border border-[var(--color-border)] p-3 rounded-lg">
                          <div className="flex justify-between text-xs font-body text-slate mb-1">
                            <span className="font-medium text-cream">{src.document_name}</span>
                            {src.clause_number && <span>Cláusula {src.clause_number}</span>}
                            <span>Score: {(src.relevance_score * 100).toFixed(1)}%</span>
                          </div>
                          <p className="text-xs font-mono text-slate">{src.chunk_content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-navy-mid border border-[var(--color-border)] p-4 rounded-lg">
              <span className="text-gold text-sm font-body">Consultando...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--color-border)] p-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Consultá sobre los documentos..."
          className="flex-1 bg-navy-mid border border-[var(--color-border)] px-3 py-2 text-sm font-body text-cream rounded-[4px] focus:outline-none focus:border-gold"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-gold text-navy px-4 py-2 text-sm font-body font-semibold rounded-[6px] disabled:opacity-50 hover:bg-gold-soft transition-colors"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
