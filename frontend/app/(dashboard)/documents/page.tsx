"use client";

import { useEffect, useState } from "react";
import { api, Document, Matter } from "@/lib/api";
import { DocumentUpload } from "@/components/DocumentUpload";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [selectedMatter, setSelectedMatter] = useState("");

  function reload() {
    api.listDocuments().then((r) => setDocuments(r.data ?? []));
  }

  useEffect(() => {
    reload();
    api.listMatters().then((r) => setMatters(r.data ?? []));
  }, []);

  async function handleDelete(id: string) {
    await api.deleteDocument(id);
    reload();
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-display font-semibold text-cream mb-6 leading-[1.2]">Documentos</h1>

      <div className="mb-4">
        <label className="text-xs font-body font-medium text-slate uppercase tracking-widest block mb-1">
          Asignar a causa (opcional)
        </label>
        <select
          value={selectedMatter}
          onChange={(e) => setSelectedMatter(e.target.value)}
          className="bg-navy-mid border border-[var(--color-border)] px-3 py-2 text-sm font-body text-cream rounded-[4px] focus:outline-none w-72"
        >
          <option value="">Sin causa</option>
          {matters.map((m) => (
            <option key={m.id} value={m.id}>{m.caratula}</option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <DocumentUpload matterId={selectedMatter || undefined} onUploaded={reload} />
      </div>

      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex justify-between items-center bg-navy-mid border border-[var(--color-border)] px-4 py-3 rounded-lg">
            <div>
              <span className="text-sm font-mono text-cream">{doc.filename}</span>
              <p className="text-xs font-body text-slate mt-0.5">
                {doc.file_type.toUpperCase()} · {new Date(doc.created_at).toLocaleDateString("es-AR")}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-xs font-body ${
                doc.status === "indexed"    ? "text-green-400" :
                doc.status === "failed"     ? "text-red-400"   :
                doc.status === "processing" ? "text-yellow-400" : "text-slate"
              }`}>
                {doc.status}
              </span>
              <button
                onClick={() => handleDelete(doc.id)}
                className="text-xs font-body text-slate hover:text-red-400 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
