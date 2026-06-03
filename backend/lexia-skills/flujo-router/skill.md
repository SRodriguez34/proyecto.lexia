# Flujo: Router de Solicitudes del Usuario (Runtime)

## Objetivo
Clasificar cada solicitud entrante de un abogado y derivarla al agente
especializado correcto. Es la primera capa que procesa cada mensaje.
Optimiza tokens enviando solo el contexto necesario para cada tipo de tarea.

## Tipos de Solicitud y Flujo Correspondiente

| Tipo de solicitud | Flujo activado | Agente LLM |
|---|---|---|
| Pregunta sobre documento(s) | flujo-rag | Gemini 2.5 Pro |
| Subir / procesar documento | flujo-ingesta | (pipeline, no LLM) |
| Resumen de causa completa | flujo-resumen | Gemini 2.5 Pro (contexto largo) |
| Extraer plazos de documento | flujo-plazos | Gemini 2.0 Flash |
| Consulta de normativa | flujo-normativa | Gemini 2.0 Flash |
| Redactar documento / cláusula | flujo-redaccion | Gemini 2.5 Pro |
| Comparar documentos | flujo-comparacion | Gemini 2.5 Pro |
| Pregunta de soporte / ayuda | flujo-soporte | Gemini 2.0 Flash |
| Investigación jurídica multi-paso | flujo-deep-research | Gemini 2.5 Pro |
| Revisión masiva de documentos | flujo-bulk-review | Gemini 2.0 Flash |
| Gestión de templates de workflow | flujo-templates | Gemini 2.0 Flash |

## Protocolo de Clasificación

1. Recibir mensaje del usuario + contexto de sesión (firm_id, matter_id activo)

2. Clasificar intención con Gemini 2.0 Flash (1 token call, mínimo costo):
   prompt: "Clasificá esta solicitud en una categoría: consulta_documento |
   ingesta | resumen_causa | extraccion_plazos | normativa | redaccion |
   comparacion | soporte | deep_research | bulk_review | workflow_template.
   Solo devolvé la categoría, sin explicación."

3. Cargar skill.md del flujo correspondiente como system prompt del agente

4. Pasar al agente SOLO el contexto necesario:
   - consulta_documento: chunks relevantes (top-5 via RAG)
   - resumen_causa: todos los chunks de la causa
   - extraccion_plazos: contenido del documento específico
   - normativa: ítems recientes de normativa_items
   - redaccion: templates del estudio + instrucción del usuario

5. Retornar respuesta al usuario con metadata del flujo usado

## Restricciones
- NUNCA cargar el contexto completo de la firma si no es necesario
- NUNCA activar flujo-ingesta desde el chat — tiene su propio endpoint
- Si la clasificación es ambigua: preguntar al usuario antes de proceder

## Optimización de Tokens por Flujo

```
Flujo              Contexto enviado al LLM        Costo relativo
─────────────────────────────────────────────────────────────────
consulta_doc       5 chunks (~2K tokens)           Bajo
resumen_causa      Todos los chunks (~50K tokens)  Alto → usar Gemini 2.5 Pro
extrac_plazos      1 documento (~10K tokens)       Medio
normativa          3 ítems recientes (~3K tokens)  Bajo
redaccion          Template + instrucción (~5K)    Medio
soporte            Solo mensaje (~500 tokens)      Mínimo
```

## Referencias
- Implementar en: backend/app/api/query.py (función route_request)
- Skill files: backend/flujos/*/skill.md
- LLM wrapper: backend/app/services/llm.py

## Criterio de Éxito
Clasificación correcta en > 95% de solicitudes de prueba.
Tiempo de clasificación < 500ms (Gemini 2.0 Flash es rápido).
Tokens consumidos por sesión reducidos vs. enviar todo a un agente único.
