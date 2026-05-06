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
    } catch (err) {
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
      <div className="flex gap-4 px-4 py-2 border-b border-[#1E2A3D] text-xs text-[#94A3B8]">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useHyde}
            onChange={(e) => setUseHyde(e.target.checked)}
            className="accent-[#F59E0B]"
          />
          HyDE activado
          <span className="text-[#94A3B8]" title="Genera un documento hipotético para mejorar búsquedas coloquiales">(?)</span>
        </label>
        {!matterId && <span className="text-[#94A3B8]">Buscando en toda la firma</span>}
        {matterId && <span className="text-[#F59E0B]">Solo esta causa</span>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-[#94A3B8] text-sm text-center mt-8">
            Realizá una consulta sobre los documentos indexados
          </p>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-2xl ${msg.role === "user" ? "bg-[#1E2A3D]" : "bg-[#111827] border border-[#1E2A3D]"} p-4`}>
              <p className="text-sm text-[#F1F5F9] whitespace-pre-wrap">{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => toggleSources(idx)}
                    className="text-xs text-[#F59E0B] hover:underline"
                  >
                    {expandedSources.has(idx) ? "Ocultar" : "Ver"} fuentes ({msg.sources.length})
                  </button>
                  {expandedSources.has(idx) && (
                    <div className="mt-2 space-y-2">
                      {msg.sources.map((src, si) => (
                        <div key={si} className="bg-[#0A0F1E] border border-[#1E2A3D] p-3">
                          <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                            <span className="font-medium text-[#F1F5F9]">{src.document_name}</span>
                            {src.clause_number && <span>Cláusula {src.clause_number}</span>}
                            <span>Score: {(src.relevance_score * 100).toFixed(1)}%</span>
                          </div>
                          <p className="text-xs text-[#94A3B8] font-mono">{src.chunk_content}</p>
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
            <div className="bg-[#111827] border border-[#1E2A3D] p-4">
              <span className="text-[#F59E0B] text-sm">Consultando...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1E2A3D] p-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Consultá sobre los documentos..."
          className="flex-1 bg-[#111827] border border-[#1E2A3D] px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#F59E0B]"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-[#F59E0B] text-[#0A0F1E] px-4 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-amber-400 transition"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
