-- LEXIA — Migración Fase 1 (GTM)
-- Ejecutar en el SQL Editor de Supabase

-- ── firms: plan con valores correctos ────────────────────────────────
UPDATE firms SET plan = 'trial' WHERE plan NOT IN ('trial','solo','estudio','enterprise');
ALTER TABLE firms DROP CONSTRAINT IF EXISTS firms_plan_check;
ALTER TABLE firms ADD CONSTRAINT firms_plan_check
  CHECK (plan IN ('trial','solo','estudio','enterprise'));
ALTER TABLE firms ALTER COLUMN plan SET DEFAULT 'trial';

-- ── firms: nuevas columnas de plan y onboarding ───────────────────────
ALTER TABLE firms ADD COLUMN IF NOT EXISTS plan_limits JSONB NOT NULL DEFAULT
  '{"documents_per_month": 20, "queries_per_month": 100, "users": 1}';
ALTER TABLE firms ADD COLUMN IF NOT EXISTS usage_current JSONB NOT NULL DEFAULT
  '{"documents_this_month": 0, "queries_this_month": 0}';
ALTER TABLE firms ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS materia_principal TEXT;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS provincia TEXT;

-- ── invitations: verificación de email ───────────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id    UUID REFERENCES firms(id),
  email      TEXT NOT NULL,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── usage_events: métricas (F1.5) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id    UUID REFERENCES firms(id),
  event_type TEXT NOT NULL CHECK (event_type IN
               ('query','document_indexed','alert_generated','login')),
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_events_firm_date
  ON usage_events(firm_id, created_at DESC);
