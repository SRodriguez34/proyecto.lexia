"use client";

import { useState, useEffect } from "react";
import { api, UsageSummary } from "@/lib/api";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-navy-mid border border-[var(--color-border)] rounded-lg p-5">
      <p className="text-xs font-body text-slate uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-display text-cream">{value}</p>
      {sub && <p className="text-xs font-body text-slate-dark mt-1">{sub}</p>}
    </div>
  );
}

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial",
  solo: "Solo",
  estudio: "Estudio",
  enterprise: "Enterprise",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.usageStats()
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <p className="text-slate text-sm font-body">Cargando métricas…</p>
    </div>
  );

  if (!data) return null;

  const limDocs = data.plan_limits.documents_per_month;
  const limQueries = data.plan_limits.queries_per_month;
  const usedDocs = data.this_month.documents_indexed;
  const usedQueries = data.this_month.queries;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display text-cream mb-1">{data.firm_name}</h1>
          <span className="text-xs font-body uppercase tracking-widest bg-navy-light border border-[var(--color-border)] text-gold px-3 py-1 rounded-full">
            Plan {PLAN_LABELS[data.plan] ?? data.plan}
          </span>
        </div>
      </div>

      <p className="text-sm font-body font-medium text-slate uppercase tracking-widest mb-4">Este mes</p>
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <StatCard label="Consultas" value={usedQueries} sub={limQueries > 0 ? `de ${limQueries}` : "ilimitadas"} />
        <StatCard label="Docs indexados" value={usedDocs} sub={limDocs > 0 ? `de ${limDocs}` : "ilimitados"} />
        <StatCard label="Alertas" value={data.this_month.alerts_generated} />
        <StatCard label="Horas ahorradas" value={`${data.this_month.estimated_hours_saved}h`} sub="estimado" />
      </div>

      {(limDocs > 0 || limQueries > 0) && (
        <>
          <p className="text-sm font-body font-medium text-slate uppercase tracking-widest mb-4">Uso del plan</p>
          <div className="space-y-4 mb-8">
            {limDocs > 0 && (
              <div>
                <div className="flex justify-between text-xs font-body text-slate mb-1">
                  <span>Documentos</span>
                  <span>{usedDocs} / {limDocs}</span>
                </div>
                <div className="h-2 bg-navy rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold rounded-full transition-all"
                    style={{ width: `${Math.min(100, (usedDocs / limDocs) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {limQueries > 0 && (
              <div>
                <div className="flex justify-between text-xs font-body text-slate mb-1">
                  <span>Consultas</span>
                  <span>{usedQueries} / {limQueries}</span>
                </div>
                <div className="h-2 bg-navy rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold rounded-full transition-all"
                    style={{ width: `${Math.min(100, (usedQueries / limQueries) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <p className="text-sm font-body font-medium text-slate uppercase tracking-widest mb-4">Totales acumulados</p>
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Documentos totales" value={data.totals.documents} />
        <StatCard label="Causas activas" value={data.totals.active_matters} />
      </div>
    </div>
  );
}
