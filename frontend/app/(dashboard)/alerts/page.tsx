"use client";

import { useEffect, useState } from "react";
import { api, Alert } from "@/lib/api";

const SOURCE_LABELS: Record<string, string> = {
  infoleg: "InfoLEG",
  saij: "SAIJ",
  scba: "SCBA",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<"" | "pending" | "reviewed">("");

  function reload() {
    api.listAlerts(filter || undefined).then((r) => setAlerts(r.data ?? []));
  }

  useEffect(() => { reload(); }, [filter]);

  async function handleStatus(id: string, status: string) {
    await api.updateAlertStatus(id, status);
    reload();
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-serif text-[#F1F5F9]">Alertas Normativa</h1>
        <div className="flex gap-2">
          {(["", "pending", "reviewed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 transition ${
                filter === f
                  ? "bg-[#F59E0B] text-[#0A0F1E]"
                  : "border border-[#1E2A3D] text-[#94A3B8] hover:text-[#F1F5F9]"
              }`}
            >
              {f === "" ? "Todas" : f === "pending" ? "Pendientes" : "Revisadas"}
            </button>
          ))}
        </div>
      </div>

      {alerts.length === 0 && (
        <p className="text-[#94A3B8] text-sm">No hay alertas {filter ? `con estado "${filter}"` : ""}.</p>
      )}

      <div className="space-y-3">
        {alerts.map((alert) => {
          const item = alert.normativa_items;
          return (
            <div key={alert.id} className={`bg-[#111827] border p-5 ${
              alert.status === "pending" ? "border-[#F59E0B]" : "border-[#1E2A3D]"
            }`}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  {item && (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-[#94A3B8] uppercase tracking-widest">
                          {SOURCE_LABELS[item.source] ?? item.source}
                        </span>
                        {item.published_at && (
                          <span className="text-xs text-[#94A3B8]">
                            · {new Date(item.published_at).toLocaleDateString("es-AR")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#F1F5F9] mb-2">{item.title}</p>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#F59E0B] hover:underline"
                        >
                          Ver fuente
                        </a>
                      )}
                    </>
                  )}
                  <p className="text-xs text-[#94A3B8] mt-2">
                    {alert.affected_documents.length} documento{alert.affected_documents.length !== 1 ? "s" : ""} afectado{alert.affected_documents.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {alert.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleStatus(alert.id, "reviewed")}
                        className="text-xs text-green-400 border border-green-700 px-3 py-1 hover:bg-green-900/20 transition"
                      >
                        Marcar revisada
                      </button>
                      <button
                        onClick={() => handleStatus(alert.id, "dismissed")}
                        className="text-xs text-[#94A3B8] border border-[#1E2A3D] px-3 py-1 hover:text-[#F1F5F9] transition"
                      >
                        Descartar
                      </button>
                    </>
                  )}
                  {alert.status !== "pending" && (
                    <span className="text-xs text-[#94A3B8] uppercase tracking-widest">{alert.status}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
