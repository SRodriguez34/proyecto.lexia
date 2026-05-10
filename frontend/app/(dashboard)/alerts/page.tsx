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
        <h1 className="text-3xl font-display font-semibold text-cream leading-[1.2]">Alertas Normativa</h1>
        <div className="flex gap-2">
          {(["", "pending", "reviewed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-body px-3 py-1.5 rounded-[6px] transition-colors ${
                filter === f
                  ? "bg-gold text-navy font-semibold"
                  : "border border-[var(--color-border)] text-slate hover:text-cream"
              }`}
            >
              {f === "" ? "Todas" : f === "pending" ? "Pendientes" : "Revisadas"}
            </button>
          ))}
        </div>
      </div>

      {alerts.length === 0 && (
        <p className="text-slate text-sm font-body">
          No hay alertas {filter ? `con estado "${filter}"` : ""}.
        </p>
      )}

      <div className="space-y-3">
        {alerts.map((alert) => {
          const item = alert.normativa_items;
          return (
            <div
              key={alert.id}
              className={`bg-navy-mid border p-5 rounded-lg ${
                alert.status === "pending"
                  ? "border-gold"
                  : "border-[var(--color-border)]"
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  {item && (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-body font-medium text-slate uppercase tracking-widest">
                          {SOURCE_LABELS[item.source] ?? item.source}
                        </span>
                        {item.published_at && (
                          <span className="text-xs font-body text-slate-dark">
                            · {new Date(item.published_at).toLocaleDateString("es-AR")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-body text-cream mb-2">{item.title}</p>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-body text-gold hover:underline"
                        >
                          Ver fuente
                        </a>
                      )}
                    </>
                  )}
                  <p className="text-xs font-body text-slate-dark mt-2">
                    {alert.affected_documents.length} documento{alert.affected_documents.length !== 1 ? "s" : ""} afectado{alert.affected_documents.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {alert.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleStatus(alert.id, "reviewed")}
                        className="text-xs font-body text-green-400 border border-green-700 px-3 py-1 rounded-[6px] hover:bg-green-900/20 transition-colors"
                      >
                        Marcar revisada
                      </button>
                      <button
                        onClick={() => handleStatus(alert.id, "dismissed")}
                        className="text-xs font-body text-slate border border-[var(--color-border)] px-3 py-1 rounded-[6px] hover:text-cream transition-colors"
                      >
                        Descartar
                      </button>
                    </>
                  )}
                  {alert.status !== "pending" && (
                    <span className="text-xs font-body text-slate-dark uppercase tracking-widest">{alert.status}</span>
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
