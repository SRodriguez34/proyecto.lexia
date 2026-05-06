# LEXIA — Legal AI Platform para estudios jurídicos argentinos

## Qué es este proyecto
SaaS B2B de AI para estudios jurídicos en Argentina. Permite indexar documentos
legales, hacer consultas en lenguaje natural sobre toda la base documental del
estudio, y monitorear cambios en normativa argentina que afecten causas activas.

## Stack técnico
- Backend: FastAPI + Python 3.11
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Base de datos: Supabase (PostgreSQL + pgvector extension)
- Embeddings: Voyage AI API (modelo: voyage-law-2, 1024 dimensiones)
- LLM principal: Google Gemini 2.5 Pro (via google-generativeai SDK)
- LLM rápido: Google Gemini 2.0 Flash
- Reranking: Cohere API (modelo: rerank-multilingual-v3.0)
- RAG framework: LlamaIndex
- Parseo de documentos: Unstructured.io (open source)
- Workflows: GitHub Actions
- Deploy backend: Railway
- Deploy frontend: Vercel

## Variables de entorno requeridas
SUPABASE_URL, SUPABASE_SERVICE_KEY, VOYAGE_API_KEY, GOOGLE_API_KEY,
COHERE_API_KEY, JWT_SECRET

## Convenciones de código
- Python: tipo hints siempre, async/await para I/O, pydantic para schemas
- TypeScript: strict mode, no any, componentes funcionales con hooks
- API responses: siempre {data, error, metadata}
- Logging: structured JSON logging en backend
- Errores: nunca silenciar, siempre propagar con contexto

## Dominio de negocio importante
- "Causa" o "expediente": caso legal de un cliente
- "Materia": área del derecho (laboral, civil, comercial, penal)
- "Carátula": nombre oficial de la causa
- "Chunk": fragmento de documento indexado para RAG
- Los documentos tienen estructura legal: artículos, cláusulas, considerandos
- El chunking DEBE respetar límites de cláusulas/artículos, no cortar por tokens

## Esquema de base de datos (Supabase)
Ver: backend/scripts/schema.sql
RPC functions: backend/scripts/rpc_functions.sql
RLS policies: backend/scripts/rls_policies.sql

## Patrón de RAG usado en este proyecto
1. Hybrid search: pgvector (semántico) + tsvector postgres (BM25 keywords)
2. Reciprocal Rank Fusion para combinar resultados
3. Cohere rerank sobre top-20 candidatos → top-5 final
4. HyDE opcional para queries coloquiales
5. Gemini 2.5 Pro para síntesis con source citations obligatorias

## Levantar el backend en desarrollo
```bash
cd backend
uvicorn app.main:app --reload
```

## Levantar el frontend en desarrollo
```bash
cd frontend
npm run dev
```

## Configurar Supabase
1. Correr schema.sql en el SQL editor de Supabase
2. Correr rpc_functions.sql en el SQL editor de Supabase
3. Correr rls_policies.sql en el SQL editor de Supabase
