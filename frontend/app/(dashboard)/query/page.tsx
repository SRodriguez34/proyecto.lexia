import { LegalChat } from "@/components/LegalChat";

export default function QueryPage() {
  return (
    <div className="flex flex-col" style={{ height: "100vh" }}>
      <div className="px-8 py-4 border-b border-[#1E2A3D]">
        <h1 className="text-xl font-serif text-[#F1F5F9]">Consulta IA</h1>
        <p className="text-xs text-[#94A3B8] mt-1">Búsqueda sobre toda la documentación del estudio</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <LegalChat />
      </div>
    </div>
  );
}
