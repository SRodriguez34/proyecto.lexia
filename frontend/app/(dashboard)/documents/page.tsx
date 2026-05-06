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
      <h1 className="text-2xl font-serif text-[#F1F5F9] mb-6">Documentos</h1>

      <div className="mb-4">
        <label className="text-xs text-[#94A3B8] uppercase tracking-widest block mb-1">Asignar a causa (opcional)</label>
        <select
          value={selectedMatter}
          onChange={(e) => setSelectedMatter(e.target.value)}
          className="bg-[#111827] border border-[#1E2A3D] px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none w-72"
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
          <div key={doc.id} className="flex justify-between items-center bg-[#111827] border border-[#1E2A3D] px-4 py-3">
            <div>
              <span className="text-sm text-[#F1F5F9] font-mono">{doc.filename}</span>
              <p className="text-xs text-[#94A3B8] mt-0.5">{doc.file_type.toUpperCase()} · {new Date(doc.created_at).toLocaleDateString("es-AR")}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-xs ${
                doc.status === "indexed" ? "text-green-400" :
                doc.status === "failed" ? "text-red-400" :
                doc.status === "processing" ? "text-yellow-400" : "text-[#94A3B8]"
              }`}>
                {doc.status}
              </span>
              <button
                onClick={() => handleDelete(doc.id)}
                className="text-xs text-[#94A3B8] hover:text-red-400 transition"
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
