"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Matter } from "@/lib/api";

export default function MattersPage() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ caratula: "", client_name: "", matter_type: "civil" });

  useEffect(() => { api.listMatters().then((r) => setMatters(r.data ?? [])); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const result = await api.createMatter(form) as { data?: Matter };
    if (result.data) setMatters((p) => [result.data!, ...p]);
    setCreating(false);
    setForm({ caratula: "", client_name: "", matter_type: "civil" });
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-display font-semibold text-cream leading-[1.2]">Causas</h1>
        <button
          onClick={() => setCreating(true)}
          className="bg-gold text-navy px-4 py-2 text-sm font-body font-semibold uppercase tracking-widest rounded-[6px] hover:bg-gold-soft transition-colors"
        >
          Nueva causa
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-navy-mid border border-[var(--color-border)] p-6 mb-6 space-y-4 rounded-lg">
          <input
            required
            placeholder="Carátula"
            value={form.caratula}
            onChange={(e) => setForm((p) => ({ ...p, caratula: e.target.value }))}
            className="w-full bg-navy border border-[var(--color-border)] px-3 py-2 text-sm font-body text-cream rounded-[4px] focus:outline-none focus:border-gold"
          />
          <input
            required
            placeholder="Cliente"
            value={form.client_name}
            onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))}
            className="w-full bg-navy border border-[var(--color-border)] px-3 py-2 text-sm font-body text-cream rounded-[4px] focus:outline-none focus:border-gold"
          />
          <select
            value={form.matter_type}
            onChange={(e) => setForm((p) => ({ ...p, matter_type: e.target.value }))}
            className="w-full bg-navy border border-[var(--color-border)] px-3 py-2 text-sm font-body text-cream rounded-[4px] focus:outline-none"
          >
            {["civil", "laboral", "comercial", "penal", "administrativo", "familia"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="bg-gold text-navy px-4 py-2 text-sm font-body font-semibold rounded-[6px] hover:bg-gold-soft transition-colors">
              Crear
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="border border-[var(--color-border)] px-4 py-2 text-sm font-body text-slate hover:text-cream rounded-[6px] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {matters.map((m) => (
          <Link key={m.id} href={`/matters/${m.id}`}>
            <div className="flex justify-between items-center bg-navy-mid border border-[var(--color-border)] px-5 py-4 rounded-lg hover:border-gold transition-colors cursor-pointer">
              <div>
                <p className="text-sm font-body text-cream">{m.caratula}</p>
                <p className="text-xs font-body text-slate mt-0.5">{m.client_name} · {m.matter_type}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-body px-2 py-1 rounded-[4px] ${m.status === "active" ? "text-green-400 bg-green-900/20" : "text-slate"}`}>
                  {m.status}
                </span>
                <p className="text-xs font-body text-slate-dark mt-1">{m.document_count ?? 0} docs</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
