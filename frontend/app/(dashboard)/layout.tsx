import Link from "next/link";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/matters", label: "Causas" },
  { href: "/documents", label: "Documentos" },
  { href: "/query", label: "Consulta IA" },
  { href: "/alerts", label: "Alertas" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-52 bg-[#111827] border-r border-[#1E2A3D] flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-[#1E2A3D]">
          <span className="text-[#F59E0B] font-serif text-xl tracking-tight">LEXIA</span>
        </div>
        <nav className="flex-1 py-4">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block px-5 py-2.5 text-sm text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#1E2A3D] transition"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#0A0F1E]">
        {children}
      </main>
    </div>
  );
}
