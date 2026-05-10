# LEXIA — Design System Master

> Herramienta de IA legal para estudios jurídicos argentinos.
> Referencia: Harvey AI. Posicionamiento: profesional, confiable, preciso.

---

## Identidad Visual

**Estilo:** Swiss Modernism 2.0 + Dark Mode
**Sensación:** Autoridad institucional. Un tribunal, no una startup.
**Diferenciador visual:** Tipografía editorial serif para headlines + sans-serif técnico para body.

---

## Paleta de Colores

```css
:root {
  /* Primarios */
  --color-primary:     #0A1628;   /* Navy profundo — fondo principal dark */
  --color-secondary:   #1A2F4A;   /* Navy medio — cards, surfaces */
  --color-surface:     #243450;   /* Navy claro — hover states, borders */

  /* Acento */
  --color-accent:      #C9A84C;   /* Oro legal — CTAs, highlights, iconos */
  --color-accent-soft: #E8C97A;   /* Oro claro — hover del acento */

  /* Texto */
  --color-text-primary:   #F0EDE8; /* Crema cálido — texto principal */
  --color-text-secondary: #9BA8BC; /* Slate azulado — texto secundario */
  --color-text-muted:     #5C6B82; /* Slate oscuro — placeholders */

  /* Estado */
  --color-success:  #22C55E;
  --color-warning:  #F59E0B;
  --color-error:    #EF4444;

  /* Bordes */
  --color-border:       rgba(201, 168, 76, 0.15); /* Borde oro sutil */
  --color-border-hover: rgba(201, 168, 76, 0.35);
}
```

---

## Tipografía

```css
/* Display — Headlines, hero, nombres de secciones */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap');

/* Body — Texto corrido, UI, labels */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

/* Mono — Código, citas legales, extractos de documentos */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap');

:root {
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body:    'IBM Plex Sans', system-ui, sans-serif;
  --font-mono:    'IBM Plex Mono', monospace;
}
```

**Escala tipográfica:**
```
Hero heading:    5xl / 600 weight / line-height 1.1 / Playfair Display
Section heading: 3xl / 600 weight / line-height 1.2 / Playfair Display
Card heading:    xl  / 500 weight / line-height 1.3 / IBM Plex Sans
Body:            base / 400 weight / line-height 1.7 / IBM Plex Sans
Small/Label:     sm  / 500 weight / line-height 1.5 / IBM Plex Sans
Code/Legal:      sm  / 400 weight / line-height 1.6 / IBM Plex Mono
```

---

## Espaciado y Layout

```
Max container:    1280px
Padding lateral:  24px mobile / 48px tablet / 64px desktop
Sección padding:  py-24 (96px) en desktop / py-16 (64px) en mobile
Grid features:    3 cols desktop / 2 cols tablet / 1 col mobile
Gap estándar:     24px (gap-6)
Border radius:    8px cards / 6px buttons / 4px inputs (austero, no rounded-3xl)
```

---

## Componentes Específicos de Lexia

### Hero Section
```
- Headline: "La inteligencia legal que necesitaba tu estudio"
- Subheadline: Mencionar velocidad + precisión + jurisdicción argentina
- CTA primario: "Solicitar acceso" (fondo oro, texto navy)
- CTA secundario: "Ver demo" (borde oro, texto crema)
- Visual: Mockup del dashboard o animación de análisis de documento
- Fondo: Navy profundo con textura sutil (noise o grid de líneas finas)
```

### Feature Cards
```
- Borde: 1px solid var(--color-border)
- Background: var(--color-secondary)
- Ícono: Lucide, color accent oro, tamaño 24px
- Hover: border-color → var(--color-border-hover), translate-y: -4px
- Sin border-radius excesivo: rounded-lg (8px)
```

### Pricing
```
- Plan recomendado: borde oro 2px, badge "Más popular"
- Precio: display font, tamaño 4xl
- Sin plan gratuito en el precio principal (modelo B2B estudios)
- Incluir: "factura A disponible" para el mercado argentino
```

---

## Anti-patterns Específicos de Lexia

- ❌ Colores brillantes o "startup-ish" (neon, púrpura, celeste flúo)
- ❌ Ilustraciones cartoon o íconos infantilizados
- ❌ Lenguaje informal en copy ("¡Probalo ya!", "¡Es increíble!")
- ❌ Fondos blancos — Lexia es siempre dark mode
- ❌ Mencionar "ChatGPT" en ningún punto del copy
- ❌ Border-radius > 12px en elementos estructurales
- ❌ Animaciones llamativas o de juego — solo transiciones sutiles

---

## Animaciones (Framer Motion)

```tsx
// Entrada hero — sutil y lento, autoridad
const heroVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } }
}

// Cards de features — stagger elegante
const cardStagger = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } }
}
const cardItem = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

// Hover en cards
whileHover={{ y: -4, borderColor: 'var(--color-border-hover)' }}
transition={{ duration: 0.2 }}
```

---

## Copy Guidelines

- **Tono:** Directo, técnico, sin exageraciones. Como hablaría un abogado senior.
- **Mensajes clave:** Precisión + velocidad + marco legal argentino
- **Evitar:** Superlativoss sin sustento ("el mejor", "revolucionario")
- **Incluir:** Menciones a normativa SAIJ, InfoLEG, jurisprudencia nacional
- **CTA:** "Solicitar acceso" / "Ver cómo funciona" / "Hablar con el equipo"

---

## SEO Meta Tags

```tsx
export const metadata = {
  title: 'Lexia — IA Legal para Estudios Jurídicos en Argentina',
  description: 'Análisis de documentos, investigación de normativa y redacción legal potenciados por IA. Diseñado para abogados argentinos.',
  openGraph: {
    title: 'Lexia — IA Legal',
    description: 'La herramienta de inteligencia artificial para estudios jurídicos en Argentina.',
    type: 'website',
  }
}
```
