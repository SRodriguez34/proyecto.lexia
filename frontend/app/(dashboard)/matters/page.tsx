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
    const result = await api.createMatter(form);
    if (result.data) setMatters((p) => [result.data, ...p]);
    setCreating(false);
    setForm({ caratula: "", client_name: "", matter_type: "civil" });
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-serif text-[#F1F5F9]">Causas</h1>
        <button
          onClick={() => setCreating(true)}
          className="bg-[#F59E0B] text-[#0A0F1E] px-4 py-2 text-sm font-semibold uppercase tracking-widest hover:bg-amber-400 transition"
        >
          Nueva causa
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-[#111827] border border-[#1E2A3D] p-6 mb-6 space-y-4">
          <input
            required
            placeholder="Carátula"
            value={form.caratula}
            onChange={(e) => setForm((p) => ({ ...p, caratula: e.target.value }))}
            className="w-full bg-[#0A0F1E] border border-[#1E2A3D] px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#F59E0B]"
          />
          <input
            required
            placeholder="Cliente"
            value={form.client_name}
            onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))}
            className="w-full bg-[#0A0F1E] border border-[#1E2A3D] px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#F59E0B]"
          />
          <select
            value={form.matter_type}
            onChange={(e) => setForm((p) => ({ ...p, matter_type: e.target.value }))}
            className="w-full bg-[#0A0F1E] border border-[#1E2A3D] px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none"
          >
            {["civil", "laboral", "comercial", "penal", "administrativo", "familia"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="bg-[#F59E0B] text-[#0A0F1E] px-4 py-2 text-sm font-semibold">Crear</button>
            <button type="button" onClick={() => setCreating(false)} className="border border-[#1E2A3D] px-4 py-2 text-sm text-[#94A3B8] hover:text-[#F1F5F9]">Cancelar</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {matters.map((m) => (
          <Link key={m.id} href={`/matters/${m.id}`}>
            <div className="flex justify-between items-center bg-[#111827] border border-[#1E2A3D] px-5 py-4 hover:border-[#F59E0B] transition cursor-pointer">
              <div>
                <p className="text-sm text-[#F1F5F9]">{m.caratula}</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">{m.client_name} · {m.matter_type}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-1 ${m.status === "active" ? "text-green-400 bg-green-900/20" : "text-[#94A3B8]"}`}>
                  {m.status}
                </span>
                <p className="text-xs text-[#94A3B8] mt-1">{m.document_count ?? 0} docs</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
