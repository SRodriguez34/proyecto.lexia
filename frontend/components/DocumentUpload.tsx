"use client";

import { useState, useRef, DragEvent } from "react";
import { api } from "@/lib/api";

interface Props {
  matterId?: string;
  onUploaded?: (documentId: string) => void;
}

type UploadStatus = "idle" | "uploading" | "processing" | "indexing" | "done" | "error";

const STATUS_LABELS: Record<UploadStatus, string> = {
  idle: "",
  uploading: "Subiendo...",
  processing: "Procesando...",
  indexing: "Indexando...",
  done: "Listo",
  error: "Error",
};

const STATUS_STEPS: UploadStatus[] = ["uploading", "processing", "indexing", "done"];

export function DocumentUpload({ matterId, onUploaded }: Props) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setStatus("uploading");
    setErrorMsg("");
    try {
      const result = await api.uploadDocument(file, matterId);
      if (result.error) throw new Error(result.error);
      setStatus("processing");
      await new Promise((r) => setTimeout(r, 800));
      setStatus("indexing");
      await new Promise((r) => setTimeout(r, 1200));
      setStatus("done");
      onUploaded?.(result.data?.document_id);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "doc"].includes(ext ?? "")) {
      setStatus("error");
      setErrorMsg("Solo se aceptan archivos PDF y DOCX");
      return;
    }
    upload(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  const currentStepIdx = STATUS_STEPS.indexOf(status);

  return (
    <div>
      <div
        onClick={() => status === "idle" && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition ${
          dragging ? "border-[#F59E0B] bg-[#F59E0B]/5" : "border-[#1E2A3D] hover:border-[#94A3B8]"
        } ${status !== "idle" ? "pointer-events-none" : ""}`}
      >
        {status === "idle" && (
          <>
            <p className="text-[#94A3B8] text-sm">Arrastrá un archivo o hacé click para seleccionar</p>
            <p className="text-[#94A3B8] text-xs mt-1">PDF, DOCX — máx. 50MB</p>
          </>
        )}
        {status !== "idle" && status !== "error" && (
          <div className="space-y-3">
            <p className="text-sm text-[#F59E0B]">{STATUS_LABELS[status]}</p>
            <div className="flex justify-center gap-2">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      i < currentStepIdx ? "bg-green-400" :
                      i === currentStepIdx ? "bg-[#F59E0B] animate-pulse" :
                      "bg-[#1E2A3D]"
                    }`}
                  />
                  <span className={`text-xs ${i <= currentStepIdx ? "text-[#F1F5F9]" : "text-[#94A3B8]"}`}>
                    {STATUS_LABELS[step]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {status === "error" && (
          <div>
            <p className="text-red-400 text-sm">{errorMsg}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setStatus("idle"); }}
              className="mt-2 text-xs text-[#F59E0B] underline"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
