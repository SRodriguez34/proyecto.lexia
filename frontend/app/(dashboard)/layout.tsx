import Link from "next/link";

const NAV = [
  { href: "/dashboard",   label: "Dashboard" },
  { href: "/matters",     label: "Causas" },
  { href: "/documents",   label: "Documentos" },
  { href: "/query",       label: "Consulta IA" },
  { href: "/research",    label: "Deep Research" },
  { href: "/bulk",        label: "Bulk Review" },
  { href: "/templates",   label: "Templates" },
  { href: "/alerts",      label: "Alertas" },
  { href: "/analytics",   label: "Métricas" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-52 bg-navy-mid border-r border-[var(--color-border)] flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-[var(--color-border)]">
          <span className="text-gold font-display text-xl tracking-tight">LEXIA</span>
        </div>
        <nav className="flex-1 py-4">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block px-5 py-2.5 text-sm font-body text-slate hover:text-cream hover:bg-navy-light transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-navy">
        {children}
      </main>
    </div>
  );
}
