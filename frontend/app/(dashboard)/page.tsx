"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Matter, Alert } from "@/lib/api";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-[#111827] border border-[#1E2A3D] p-5">
      <p className="text-xs text-[#94A3B8] uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-serif text-[#F59E0B] mt-1">{value}</p>
    </div>
  );
}

function MatterCard({ matter }: { matter: Matter }) {
  const statusColor: Record<string, string> = {
    active: "text-green-400",
    closed: "text-[#94A3B8]",
    suspended: "text-yellow-400",
  };
  return (
    <Link href={`/matters/${matter.id}`}>
      <div className="bg-[#111827] border border-[#1E2A3D] p-5 hover:border-[#F59E0B] transition cursor-pointer">
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-medium text-[#F1F5F9] line-clamp-2">{matter.caratula}</h3>
          <span className={`text-xs ml-2 shrink-0 ${statusColor[matter.status] ?? ""}`}>
            {matter.status}
          </span>
        </div>
        <p className="text-xs text-[#94A3B8] mt-1">{matter.client_name}</p>
        <p className="text-xs text-[#94A3B8] mt-2">{matter.document_count ?? 0} docs</p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    api.listMatters().then((r) => setMatters(r.data ?? []));
    api.listAlerts("pending").then((r) => setAlerts(r.data ?? []));
  }, []);

  const activeMatters = matters.filter((m) => m.status === "active");
  const totalDocs = matters.reduce((s, m) => s + (m.document_count ?? 0), 0);

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-serif text-[#F1F5F9] mb-6">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Causas activas" value={activeMatters.length} />
        <StatCard label="Documentos indexados" value={totalDocs} />
        <StatCard label="Alertas pendientes" value={alerts.length} />
        <StatCard label="Total causas" value={matters.length} />
      </div>

      {alerts.length > 0 && (
        <div className="mb-6 p-4 bg-[#92400E] border border-[#F59E0B] text-sm text-[#F1F5F9]">
          <span className="font-semibold text-[#F59E0B]">{alerts.length} alerta{alerts.length > 1 ? "s" : ""} de normativa</span>
          {" "}— nueva normativa puede afectar causas activas.{" "}
          <Link href="/alerts" className="underline hover:text-[#F59E0B]">Ver alertas</Link>
        </div>
      )}

      <h2 className="text-sm text-[#94A3B8] uppercase tracking-widest mb-3">Causas activas</h2>
      {activeMatters.length === 0 ? (
        <p className="text-[#94A3B8] text-sm">No hay causas activas. <Link href="/matters" className="text-[#F59E0B] underline">Crear causa</Link></p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {activeMatters.slice(0, 9).map((m) => <MatterCard key={m.id} matter={m} />)}
        </div>
      )}
    </div>
  );
}
