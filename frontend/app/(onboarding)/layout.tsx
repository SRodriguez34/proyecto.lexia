export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <span className="text-gold font-display text-2xl tracking-tight">LEXIA</span>
          <p className="text-slate text-sm font-body mt-1">Configuración inicial</p>
        </div>
        {children}
      </div>
    </div>
  );
}
