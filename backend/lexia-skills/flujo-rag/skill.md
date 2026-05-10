# Flujo: RAG — Consulta sobre Documentos

## Objetivo
Responder preguntas legales en lenguaje natural sobre los documentos
indexados de un estudio jurídico, citando siempre la fuente exacta.
Usar hybrid search + reranking + Gemini 2.5 Pro para síntesis.

## Restricciones
- NUNCA responder sin citar fuente (documento + cláusula/artículo)
- NUNCA inventar jurisprudencia, artículos o normativa
- NUNCA mezclar información de distintas firmas (respetar firm_id)
- Si la respuesta no está en los chunks: decirlo explícitamente
- NO usar HyDE por defecto — solo si el usuario lo activa

## Protocolo de Acción
1. Recibir query + firm_id + matter_id (opcional) + use_hyde flag
   → verificar: query no vacía, firm_id válido

2. Si use_hyde=True: generar hipótesis con Gemini 2.0 Flash
   → prompt: "Párrafo de documento legal argentino que respondería: {query}"
   → usar hipótesis como query de embedding en lugar del query original

3. Hybrid search en paralelo:
   A) Semántico: embed query con Voyage AI (input_type="query") → pgvector cosine
   B) Keyword: postgres tsvector BM25 con plainto_tsquery
   → verificar: cada búsqueda retorna al menos 1 resultado

4. Reciprocal Rank Fusion (k=60) sobre resultados combinados
   → top-20 candidatos

5. Cohere Rerank (rerank-multilingual-v3.0) sobre top-20
   → top-5 chunks finales
   → verificar: relevance_score del top-1 > 0.3

6. Síntesis con Gemini 2.5 Pro
   → system prompt con restricción de citar fuente siempre
   → verificar: respuesta contiene al menos una referencia a documento

## Manejo de Casos Especiales
- Sin resultados relevantes (score < 0.3): responder "No encontré información
  suficiente en los documentos disponibles sobre esta consulta."
- Query muy corta o ambigua: pedir clarificación antes de proceder
- Documento único en la firma: omitir nombre del documento, solo cláusula

## Referencias
- Script: backend/app/services/retrieval.py
- LLM: backend/app/services/llm.py
- Endpoint: backend/app/api/query.py
- Schema: chunks, documents (Supabase)

## Criterio de Éxito
Respuesta contiene: answer (str) + sources (list con doc_name y clause) +
query_id. El abogado puede verificar cada afirmación contra el documento original.
