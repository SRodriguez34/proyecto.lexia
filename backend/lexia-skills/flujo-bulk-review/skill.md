# Flujo: Bulk Document Review

## Objetivo
Procesar N documentos simultáneamente con un checklist de puntos
a revisar definido por el abogado. Retornar tabla comparativa de
resultados por documento, exportable a CSV/Excel.

## Caso de uso principal
Due diligence: el abogado selecciona 200 contratos y pregunta lo mismo
en todos ("¿tiene cláusula de penalidad?", "¿cuál es el plazo?",
"¿está firmado por apoderado con facultades suficientes?").
El sistema responde punto por punto para cada documento.

## Restricciones
- NUNCA marcar un punto como "presente" sin citar el fragmento exacto
- NUNCA procesar más de 500 documentos en una sola sesión (límite free tier)
- Usar Gemini 2.0 Flash para bulk (velocidad sobre profundidad)
- Reservar Gemini 2.5 Pro solo para síntesis final si el abogado la pide
- Procesar en batches de 20 documentos en paralelo máximo

## Protocolo de Acción

1. Recibir: document_ids[] + checklist[] + firm_id
   → verificar: todos los documentos tienen status='indexed'
   → verificar: checklist tiene entre 1 y 20 puntos
   → crear registro en bulk_reviews con status='queued'

2. Para cada documento en batches de 20:
   A. Recuperar chunks del documento (todos, ordenados por chunk_index)
   B. Para cada punto del checklist, consultar con Gemini 2.0 Flash:
      prompt: "En este documento legal, ¿{punto_checklist}?
      Responde: {presente: bool, fragmento: str|null, pagina: int|null}
      Solo JSON, sin explicación."
   C. Guardar resultado parcial en bulk_reviews.results (append)
   D. Emitir evento SSE con progreso: {processed: N, total: M}

3. Al completar todos los documentos:
   → Actualizar status = 'complete'
   → Generar tabla de resultados: filas=documentos, columnas=puntos
   → Disponibilizar export CSV y Excel

## Formato de resultado
```json
{
  "document_id": "uuid",
  "document_name": "Contrato García.pdf",
  "results": {
    "¿tiene cláusula de penalidad?": {
      "presente": true,
      "fragmento": "En caso de incumplimiento...",
      "pagina": 4
    }
  }
}
```

## Referencias
- Servicio: backend/app/services/bulk_review.py
- API: backend/app/api/bulk.py
- Schema: bulk_reviews (Supabase)
- Frontend: frontend/app/(dashboard)/bulk/page.tsx

## Criterio de Éxito
bulk_reviews.status = 'complete', tabla con resultado por cada
(documento × punto_checklist), export descargable sin errores.
