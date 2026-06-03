# Flujo: Deep Research Argentino

## Objetivo
Ejecutar una investigación jurídica multi-paso de forma agéntica sobre
SAIJ, InfoLEG y los documentos del estudio. Sintetizar hallazgos en un
memo estructurado con citas verificables, descargable como PDF.

## Diferenciador vs consulta simple
Una consulta RAG responde UNA pregunta con chunks recuperados.
Deep Research genera un PLAN de investigación, ejecuta múltiples
búsquedas en paralelo, y sintetiza todo en un documento profesional.

## Restricciones
- NUNCA inventar jurisprudencia o artículos no encontrados
- NUNCA sintetizar sin citar fuente exacta (fallo + tribunal + fecha)
- Si una fuente no retorna resultados: documentarlo en el memo
- Máximo 10 pasos de investigación por sesión
- Timeout por paso: 30 segundos

## Protocolo de Acción

1. Recibir query complejo del abogado + firm_id + materia (opcional)
   → verificar: query tiene al menos 10 palabras (no es una consulta simple)

2. Generar plan de investigación con Gemini 2.5 Pro
   prompt: "Sos un abogado argentino senior. Generá un plan de
   investigación de máximo 5 pasos para responder: {query}.
   Cada paso debe especificar: fuente (saij|infoleg|documentos_estudio),
   términos de búsqueda, y qué información se espera encontrar.
   Devolvé solo JSON: [{step, source, search_terms, expected_info}]"
   → guardar plan en research_sessions.plan

3. Ejecutar cada paso del plan en paralelo:
   - source=saij → hybrid_search con firm_id='public' filtrado por materia
   - source=infoleg → hybrid_search normativa_items
   - source=documentos_estudio → hybrid_search con firm_id del estudio

4. Reranking global con Cohere sobre todos los resultados combinados
   → top-15 fuentes más relevantes del total

5. Síntesis con Gemini 2.5 Pro
   system prompt: cargar flujo-deep-research/skill.md
   Estructura del memo:
   - Resumen ejecutivo (3-5 líneas)
   - Análisis por punto investigado
   - Jurisprudencia relevante encontrada
   - Normativa aplicable
   - Conclusiones y recomendaciones
   - Fuentes citadas (documento + cláusula/artículo/fallo)

6. Generar PDF del memo (usando reportlab o weasyprint)
   → guardar URL en research_sessions.result_memo
   → actualizar status = 'complete'

## Manejo de Errores
- Sin resultados en una fuente: continuar con las demás, notar en memo
- Timeout en un paso: marcar como 'partial', continuar síntesis
- Fallo total: status = 'failed', log con query y paso fallido

## Referencias
- Servicio: backend/app/services/deep_research.py
- API: backend/app/api/research.py
- Schema: research_sessions (Supabase)
- LLM: Gemini 2.5 Pro (síntesis y planificación)

## Criterio de Éxito
Memo generado con al menos 3 fuentes citadas, PDF descargable,
research_sessions.status = 'complete', tiempo total < 120 segundos.
