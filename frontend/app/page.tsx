"use client";

import { motion } from "framer-motion";
import Link from "next/link";

/* ─── Animation Variants (from MASTER.md) ─────────────────── */
const heroVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } },
};

const cardStagger = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const cardItem = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

/* ─── Feature Data ─────────────────────────────────────────── */
const FEATURES = [
  {
    icon: "⚖",
    title: "Consulta inteligente de documentos",
    body: "Búsqueda semántica + BM25 sobre toda la base documental del estudio. Cada respuesta cita la fuente exacta: documento y cláusula.",
  },
  {
    icon: "⚡",
    title: "Monitoreo de normativa",
    body: "Alertas automáticas cuando InfoLEG o SAIJ publican legislación que impacta causas activas. Actualización diaria en días hábiles.",
  },
  {
    icon: "◷",
    title: "Extracción de plazos",
    body: "Detección automática de vencimientos, fechas procesales y plazos críticos en cualquier documento al momento de indexarlo.",
  },
  {
    icon: "✦",
    title: "Redacción asistida",
    body: "Cláusulas y escritos según el Código Civil y Comercial y la legislación argentina vigente. Lenguaje jurídico preciso.",
  },
  {
    icon: "⇌",
    title: "Comparación de contratos",
    body: "Análisis diferencial entre versiones de un contrato o entre documentos análogos. Tabla de diferencias referenciada por cláusula.",
  },
  {
    icon: "⬡",
    title: "Resumen de causa",
    body: "Síntesis ejecutiva de la causa completa: partes, estado procesal, plazos críticos y próximos pasos recomendados.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy text-cream overflow-hidden">

      {/* ─── Nav ──────────────────────────────────────────────── */}
      <nav className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-16 py-6 flex justify-between items-center border-b border-[var(--color-border)]">
        <span className="font-display text-xl text-gold tracking-tight">LEXIA</span>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-sm text-slate hover:text-cream transition-colors">
            Funcionalidades
          </a>
          <Link
            href="/login"
            className="text-sm text-cream border border-[var(--color-border)] px-4 py-1.5 rounded-[6px] hover:border-gold transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-16 py-24 lg:py-32">
        <motion.div
          variants={heroVariants}
          initial="initial"
          animate="animate"
          className="max-w-3xl"
        >
          <p className="text-sm font-body font-medium text-gold uppercase tracking-[0.12em] mb-6">
            Plataforma de IA Legal · Argentina
          </p>

          <h1 className="text-4xl md:text-5xl font-display font-semibold text-cream leading-[1.1] mb-6">
            La inteligencia legal que<br className="hidden md:block" /> necesitaba tu estudio
          </h1>

          <p className="text-lg font-body text-slate leading-[1.7] max-w-xl mb-10">
            Analizá contratos, investigá normativa SAIJ e InfoLEG y redactá escritos
            en segundos. Entrenado en derecho argentino, sin invenciones jurídicas.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center bg-gold text-navy text-sm font-body font-semibold px-8 py-3 rounded-[6px] hover:bg-gold-soft transition-colors"
            >
              Solicitar acceso
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center border border-gold text-cream text-sm font-body font-medium px-8 py-3 rounded-[6px] hover:bg-gold/10 transition-colors"
            >
              Ver cómo funciona
            </a>
          </div>
        </motion.div>

        {/* Mockup card */}
        <motion.div
          variants={heroVariants}
          initial="initial"
          animate="animate"
          style={{ transitionDelay: "0.3s" }}
          className="mt-16 lg:mt-20 bg-navy-mid border border-[var(--color-border)] rounded-lg p-6 max-w-2xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-navy-light" />
            <span className="w-2.5 h-2.5 rounded-full bg-navy-light" />
            <span className="w-2.5 h-2.5 rounded-full bg-navy-light" />
            <span className="ml-3 text-xs font-mono text-slate-dark">Consulta IA — causa García c/ Empresa</span>
          </div>
          <p className="text-sm font-mono text-slate mb-3">
            <span className="text-gold">›</span>{" "}
            ¿Cuál es el plazo para apelar según el contrato?
          </p>
          <div className="bg-navy rounded-[4px] p-4 border border-[var(--color-border)]">
            <p className="text-sm font-body text-cream leading-[1.7]">
              Según la{" "}
              <span className="text-gold font-medium">Cláusula 12.3</span> del Contrato de
              Servicios (García c/ Empresa SA, 2024), el plazo de apelación es de{" "}
              <span className="text-gold font-medium">15 días hábiles</span> desde la
              notificación fehaciente. La cláusula remite al art. 155 del CPCCN como marco supletorio.
            </p>
            <p className="text-xs font-mono text-slate-dark mt-3">
              Fuente: contrato_servicios_2024.pdf · Cláusula 12.3 · Score 0.94
            </p>
          </div>
        </motion.div>
      </section>

      {/* ─── Features ─────────────────────────────────────────── */}
      <section id="features" className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-16 py-24">
        <motion.div
          variants={heroVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="mb-14"
        >
          <h2 className="text-3xl font-display font-semibold text-cream leading-[1.2] mb-4">
            Diseñado para la práctica legal argentina
          </h2>
          <p className="text-base font-body text-slate max-w-xl">
            Cada funcionalidad fue construida sobre el flujo de trabajo real de
            un estudio jurídico, no sobre demos de laboratorio.
          </p>
        </motion.div>

        <motion.div
          variants={cardStagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={cardItem}
              whileHover={{ y: -4, borderColor: "var(--color-border-hover)" }}
              transition={{ duration: 0.2 }}
              className="bg-navy-mid border border-[var(--color-border)] rounded-lg p-6 cursor-default"
            >
              <span className="text-gold text-2xl mb-4 block">{f.icon}</span>
              <h3 className="text-base font-body font-medium text-cream leading-[1.3] mb-2">
                {f.title}
              </h3>
              <p className="text-sm font-body text-slate leading-[1.7]">{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── CTA Band ─────────────────────────────────────────── */}
      <section className="border-t border-[var(--color-border)]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-16 py-20 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl font-display font-semibold text-cream mb-2">
              Hablá con el equipo
            </h2>
            <p className="text-sm font-body text-slate">
              Factura A disponible · Implementación asistida · Soporte en español
            </p>
          </div>
          <Link
            href="/login"
            className="shrink-0 bg-gold text-navy text-sm font-body font-semibold px-10 py-3 rounded-[6px] hover:bg-gold-soft transition-colors"
          >
            Solicitar acceso
          </Link>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-border)]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 lg:px-16 py-8 flex justify-between items-center">
          <span className="font-display text-gold text-sm tracking-tight">LEXIA</span>
          <p className="text-xs font-body text-slate-dark">
            IA legal para estudios jurídicos en Argentina
          </p>
        </div>
      </footer>
    </div>
  );
}
