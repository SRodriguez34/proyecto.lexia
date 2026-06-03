"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const MATERIAS = [
  { value: "civil", label: "Civil" },
  { value: "comercial", label: "Comercial" },
  { value: "laboral", label: "Laboral" },
  { value: "penal", label: "Penal" },
  { value: "familia", label: "Familia" },
  { value: "administrativo", label: "Administrativo" },
  { value: "constitucional", label: "Constitucional" },
  { value: "otro", label: "Otra" },
];

interface Template {
  id: string;
  name: string;
  description: string | null;
  materia: string | null;
  checklist: { punto: string }[];
  is_public: boolean;
  firm_id: string;
  use_count: number;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newMateria, setNewMateria] = useState("");
  const [newChecklist, setNewChecklist] = useState<string[]>([""]);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const PUBLIC_FIRM = "00000000-0000-0000-0000-000000000001";

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    const r = await api.listTemplates();
    setTemplates((r as { data: Template[] }).data || []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const pts = newChecklist.filter(p => p.trim());
    if (!newName.trim() || pts.length === 0) { setError("Nombre y al menos un punto requeridos"); return; }
    setLoading(true); setError("");
    await api.createTemplate({
      name: newName,
      description: newDesc || null,
      materia: newMateria || null,
      checklist: pts.map(p => ({ punto: p })),
      is_public: isPublic,
    });
    setCreating(false);
    setNewName(""); setNewDesc(""); setNewMateria(""); setNewChecklist([""]); setIsPublic(false);
    setLoading(false);
    loadTemplates();
  }

  async function handleClone(id: string) {
    await api.cloneTemplate(id);
    loadTemplates();
  }

  async function handleDelete(id: string) {
    await api.deleteTemplate(id);
    setSelected(null);
    loadTemplates();
  }

  const myTemplates = templates.filter(t => t.firm_id !== PUBLIC_FIRM);
  const publicTemplates = templates.filter(t => t.firm_id === PUBLIC_FIRM);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-cream mb-2">Workflow Templates</h1>
          <p className="text-slate text-sm font-body">Checklists reutilizables para revisión de documentos.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="bg-gold text-navy px-5 py-2 text-sm font-body font-semibold uppercase tracking-widest rounded-[6px] hover:bg-gold-soft transition-colors"
        >
          + Nuevo
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-navy-mid border border-[var(--color-border)] rounded-lg p-6 mb-8">
          <h2 className="text-base font-display text-cream mb-4">Nuevo template</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-body text-slate uppercase tracking-widest mb-1">Nombre</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} required
                className="w-full bg-navy border border-[var(--color-border)] px-3 py-2 text-sm font-body text-cream rounded-[4px] focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-body text-slate uppercase tracking-widest mb-1">Materia</label>
              <select value={newMateria} onChange={e => setNewMateria(e.target.value)}
                className="w-full bg-navy border border-[var(--color-border)] px-3 py-2 text-sm font-body text-cream rounded-[4px] focus:outline-none focus:border-gold">
                <option value="">Sin especificar</option>
                {MATERIAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-body text-slate uppercase tracking-widest mb-1">Descripción</label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Opcional…"
              className="w-full bg-navy border border-[var(--color-border)] px-3 py-2 text-sm font-body text-cream rounded-[4px] focus:outline-none focus:border-gold" />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-body text-slate uppercase tracking-widest mb-2">Puntos del checklist</label>
            <div className="space-y-2">
              {newChecklist.map((pt, i) => (
                <div key={i} className="flex gap-2">
                  <input value={pt} onChange={e => setNewChecklist(p => p.map((x, j) => j === i ? e.target.value : x))}
                    placeholder={`Punto ${i+1}…`}
                    className="flex-1 bg-navy border border-[var(--color-border)] px-3 py-1.5 text-sm font-body text-cream rounded-[4px] focus:outline-none focus:border-gold" />
                  <button type="button" onClick={() => setNewChecklist(p => p.filter((_, j) => j !== i))} className="text-slate hover:text-red-400">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setNewChecklist(p => [...p, ""])} className="mt-2 text-xs font-body text-gold hover:text-gold-soft">+ Agregar punto</button>
          </div>
          <label className="flex items-center gap-2 text-sm font-body text-slate mb-4 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="accent-gold" />
            Compartir con la comunidad LEXIA
          </label>
          {error && <p className="text-red-400 text-xs font-body mb-3">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="bg-gold text-navy px-6 py-2 text-sm font-body font-semibold uppercase tracking-widest rounded-[6px] hover:bg-gold-soft transition-colors disabled:opacity-40">
              Guardar
            </button>
            <button type="button" onClick={() => setCreating(false)} className="text-slate text-sm font-body hover:text-cream">Cancelar</button>
          </div>
        </form>
      )}

      {selected && (
        <div className="bg-navy-mid border border-[var(--color-border)] rounded-lg p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-display text-cream">{selected.name}</h2>
              {selected.description && <p className="text-slate text-sm font-body mt-1">{selected.description}</p>}
            </div>
            <button onClick={() => setSelected(null)} className="text-slate hover:text-cream">✕</button>
          </div>
          <div className="space-y-1 mb-4">
            {selected.checklist.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm font-body text-slate">
                <span className="text-gold text-xs">{i+1}.</span> {p.punto}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <a href="/bulk" className="bg-gold text-navy px-5 py-2 text-xs font-body font-semibold uppercase tracking-widest rounded-[6px] hover:bg-gold-soft transition-colors">
              Usar en Bulk Review
            </a>
            {selected.firm_id === PUBLIC_FIRM && (
              <button onClick={() => handleClone(selected.id)} className="border border-[var(--color-border)] text-cream px-5 py-2 text-xs font-body font-semibold uppercase tracking-widest rounded-[6px] hover:border-[var(--color-border-hover)] transition-colors">
                Clonar
              </button>
            )}
            {selected.firm_id !== PUBLIC_FIRM && (
              <button onClick={() => handleDelete(selected.id)} className="text-red-400 text-xs font-body hover:text-red-300 border border-red-900 px-5 py-2 rounded-[6px]">
                Eliminar
              </button>
            )}
          </div>
        </div>
      )}

      {myTemplates.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-body text-slate uppercase tracking-widest mb-3">Mis templates</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {myTemplates.map(t => (
              <button key={t.id} onClick={() => setSelected(t)}
                className="text-left bg-navy-mid border border-[var(--color-border)] hover:border-[var(--color-border-hover)] rounded-lg p-4 transition-colors">
                <p className="text-sm font-body text-cream mb-1">{t.name}</p>
                <p className="text-xs font-body text-slate">{t.checklist.length} puntos{t.materia ? ` · ${t.materia}` : ""}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-body text-slate uppercase tracking-widest mb-3">Templates de la comunidad</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {publicTemplates.map(t => (
            <button key={t.id} onClick={() => setSelected(t)}
              className="text-left bg-navy-mid border border-[var(--color-border)] hover:border-[var(--color-border-hover)] rounded-lg p-4 transition-colors">
              <p className="text-sm font-body text-cream mb-1">{t.name}</p>
              <p className="text-xs font-body text-slate">{t.checklist.length} puntos{t.materia ? ` · ${t.materia}` : ""}</p>
              {t.use_count > 0 && <p className="text-xs font-body text-slate-dark mt-1">{t.use_count} usos</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
