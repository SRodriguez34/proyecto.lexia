import { LegalChat } from "@/components/LegalChat";

export default function QueryPage() {
  return (
    <div className="flex flex-col" style={{ height: "100vh" }}>
      <div className="px-8 py-4 border-b border-[var(--color-border)]">
        <h1 className="text-xl font-display font-semibold text-cream">Consulta IA</h1>
        <p className="text-xs font-body text-slate mt-1">Búsqueda sobre toda la documentación del estudio</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <LegalChat />
      </div>
    </div>
  );
}
