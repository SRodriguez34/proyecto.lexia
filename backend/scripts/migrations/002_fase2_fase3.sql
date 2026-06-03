-- LEXIA: Migracion Fase 2 + Fase 3
-- Pegar en el SQL Editor de Supabase

-- research_sessions (F2.6)
CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id),
  query TEXT NOT NULL,
  plan JSONB,
  status TEXT CHECK (status IN ('planning','running','complete','failed')),
  result_memo TEXT,
  sources JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_research_sessions_firm
  ON research_sessions(firm_id, created_at DESC);

-- Firma publica para jurisprudencia compartida (F2.2)
INSERT INTO firms (id, name, plan)
VALUES ('00000000-0000-0000-0000-000000000001','Sistema Publico LEXIA','enterprise')
ON CONFLICT (id) DO NOTHING;

-- parent_chunks (F2.4)
CREATE TABLE IF NOT EXISTS parent_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id),
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'
);
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS parent_chunk_id UUID
  REFERENCES parent_chunks(id);

-- Metadata filtering por materia (F2.5)
ALTER TABLE matters ADD COLUMN IF NOT EXISTS materia TEXT
  CHECK (materia IN ('civil','comercial','laboral','penal',
                     'familia','administrativo','constitucional','otro'));
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS materia TEXT;
CREATE INDEX IF NOT EXISTS idx_chunks_materia
  ON chunks(firm_id, materia) WHERE materia IS NOT NULL;

-- bulk_reviews (F2.7)
CREATE TABLE IF NOT EXISTS bulk_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id),
  document_ids UUID[] NOT NULL,
  checklist JSONB NOT NULL,
  status TEXT CHECK (status IN ('queued','running','complete','failed')),
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- query_feedback (F3.1)
CREATE TABLE IF NOT EXISTS query_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id),
  query_id UUID NOT NULL,
  query_text TEXT NOT NULL,
  retrieved_chunk_ids UUID[] NOT NULL,
  rating INTEGER CHECK (rating IN (1, -1)),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- embedding_cache (F3.2)
CREATE TABLE IF NOT EXISTS embedding_cache (
  query_hash TEXT PRIMARY KEY,
  query_text TEXT NOT NULL,
  embedding VECTOR(1024) NOT NULL,
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now()
);

-- workflow_templates (F3.4)
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id),
  name TEXT NOT NULL,
  description TEXT,
  materia TEXT,
  checklist JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_by UUID,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_templates_public
  ON workflow_templates(is_public) WHERE is_public = true;

-- Insertar templates pre-cargados por materia (F3.4)
INSERT INTO workflow_templates (firm_id, name, description, materia, checklist, is_public, created_by)
VALUES
('00000000-0000-0000-0000-000000000001',
 'Contrato de Locacion (CCyC 2015)',
 'Revision estandar de contratos de locacion segun el Codigo Civil y Comercial',
 'civil',
 '[
   {"punto": "Plazo minimo legal (art. 1198 CCyC)"},
   {"punto": "Precio y mecanismo de actualizacion (UVA, IPC, INDEC)"},
   {"punto": "Deposito y condiciones de devolucion"},
   {"punto": "Clausulas de rescision anticipada"},
   {"punto": "Estado del inmueble y responsabilidad por reparaciones"},
   {"punto": "Destino del inmueble especificado"}
 ]',
 true, null),
('00000000-0000-0000-0000-000000000001',
 'Contrato de Trabajo (LCT)',
 'Puntos criticos segun la Ley de Contrato de Trabajo',
 'laboral',
 '[
   {"punto": "Categoria y remuneracion segun convenio colectivo"},
   {"punto": "Jornada laboral y horas extras"},
   {"punto": "Periodo de prueba (art. 92 bis LCT)"},
   {"punto": "Clausula de confidencialidad"},
   {"punto": "Jurisdiccion y fuero competente"},
   {"punto": "Causales de extincion del contrato"}
 ]',
 true, null),
('00000000-0000-0000-0000-000000000001',
 'Contrato de Compraventa Inmobiliaria',
 'Revision para operaciones de compraventa de inmuebles',
 'civil',
 '[
   {"punto": "Identificacion registral del inmueble (matricula, partida)"},
   {"punto": "Precio y forma de pago (senas, cuotas, escrituracion)"},
   {"punto": "Fecha de escrituracion y posesion"},
   {"punto": "Clausula de penalidad por incumplimiento"},
   {"punto": "Estado de deudas (ABL, expensas, servicios)"},
   {"punto": "Libre de gravamenes e inhibiciones"}
 ]',
 true, null),
('00000000-0000-0000-0000-000000000001',
 'Revision de Demanda Laboral',
 'Checklist procesal para demandas ante la justicia laboral',
 'laboral',
 '[
   {"punto": "Pretensiones y montos reclamados correctamente calculados"},
   {"punto": "Plazos procesales vigentes (prescripcion, caducidad)"},
   {"punto": "Prueba documental ofrecida y acompanada"},
   {"punto": "Prueba testimonial con nombres y domicilios"},
   {"punto": "Jurisprudencia citada vigente"},
   {"punto": "Defectos formales (firma, sello, CUIT)"}
 ]',
 true, null)
ON CONFLICT DO NOTHING;

-- RLS nuevas tablas
ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firms_own_research" ON research_sessions
  USING (firm_id = (auth.jwt() -> 'user_metadata' ->> 'firm_id')::UUID);
CREATE POLICY "firms_own_bulk" ON bulk_reviews
  USING (firm_id = (auth.jwt() -> 'user_metadata' ->> 'firm_id')::UUID);
CREATE POLICY "firms_own_feedback" ON query_feedback
  USING (firm_id = (auth.jwt() -> 'user_metadata' ->> 'firm_id')::UUID);
CREATE POLICY "firms_read_templates" ON workflow_templates
  USING (firm_id = (auth.jwt() -> 'user_metadata' ->> 'firm_id')::UUID
         OR is_public = true);
CREATE POLICY "firms_own_parent_chunks" ON parent_chunks
  USING (firm_id = (auth.jwt() -> 'user_metadata' ->> 'firm_id')::UUID);
