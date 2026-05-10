"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, Matter, Alert } from "@/lib/api";

const cardStagger = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};
const cardItem = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <motion.div
      variants={cardItem}
      className="bg-navy-mid border border-[var(--color-border)] p-5 rounded-lg"
    >
      <p className="text-xs font-body font-medium text-slate uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-display text-gold mt-1">{value}</p>
    </motion.div>
  );
}

function MatterCard({ matter }: { matter: Matter }) {
  const statusColor: Record<string, string> = {
    active: "text-green-400",
    closed: "text-slate",
    suspended: "text-yellow-400",
  };
  return (
    <motion.div variants={cardItem}>
      <Link href={`/matters/${matter.id}`}>
        <motion.div
          whileHover={{ y: -4, borderColor: "var(--color-border-hover)" }}
          transition={{ duration: 0.2 }}
          className="bg-navy-mid border border-[var(--color-border)] p-5 rounded-lg cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-body font-medium text-cream line-clamp-2">{matter.caratula}</h3>
            <span className={`text-xs ml-2 shrink-0 font-body ${statusColor[matter.status] ?? ""}`}>
              {matter.status}
            </span>
          </div>
          <p className="text-xs font-body text-slate mt-1">{matter.client_name}</p>
          <p className="text-xs font-body text-slate-dark mt-2">{matter.document_count ?? 0} docs</p>
        </motion.div>
      </Link>
    </motion.div>
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
      <h1 className="text-3xl font-display font-semibold text-cream mb-6 leading-[1.2]">Dashboard</h1>

      <motion.div
        variants={cardStagger}
        initial="initial"
        animate="animate"
        className="grid grid-cols-4 gap-4 mb-8"
      >
        <StatCard label="Causas activas" value={activeMatters.length} />
        <StatCard label="Documentos indexados" value={totalDocs} />
        <StatCard label="Alertas pendientes" value={alerts.length} />
        <StatCard label="Total causas" value={matters.length} />
      </motion.div>

      {alerts.length > 0 && (
        <div className="mb-6 p-4 bg-gold/10 border border-gold text-sm font-body text-cream rounded-lg">
          <span className="font-semibold text-gold">
            {alerts.length} alerta{alerts.length > 1 ? "s" : ""} de normativa
          </span>
          {" "}— nueva normativa puede afectar causas activas.{" "}
          <Link href="/alerts" className="underline hover:text-gold transition-colors">Ver alertas</Link>
        </div>
      )}

      <h2 className="text-xs font-body font-medium text-slate uppercase tracking-widest mb-3">
        Causas activas
      </h2>
      {activeMatters.length === 0 ? (
        <p className="text-slate text-sm font-body">
          No hay causas activas.{" "}
          <Link href="/matters" className="text-gold underline hover:text-gold-soft transition-colors">
            Crear causa
          </Link>
        </p>
      ) : (
        <motion.div
          variants={cardStagger}
          initial="initial"
          animate="animate"
          className="grid grid-cols-3 gap-4"
        >
          {activeMatters.slice(0, 9).map((m) => (
            <MatterCard key={m.id} matter={m} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
