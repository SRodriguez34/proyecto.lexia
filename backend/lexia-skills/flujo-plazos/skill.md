# Flujo: Extracción de Plazos y Vencimientos

## Objetivo
Extraer automáticamente todos los plazos, fechas y vencimientos de un
documento legal argentino recién indexado, estructurarlos en JSON
y almacenarlos en el metadata del documento.

## Restricciones
- NUNCA inferir fechas que no estén explícitas en el documento
- NUNCA calcular fechas relativas sin ancla clara (ej: "30 días desde la firma"
  solo es calculable si la fecha de firma está en el documento)
- NO marcar como crítico un plazo sin criterio objetivo
- Solo procesar documentos con status="indexed"

## Criterios para is_critical = true
- Plazo de prescripción
- Plazo de contestación de demanda
- Plazo de apelación
- Vencimiento de contrato principal
- Plazo procesal con consecuencia de caducidad

## Protocolo de Acción
1. Recibir document_id
   → verificar: document.status == "indexed"
   → Obtener contenido completo desde chunks (ordenados por chunk_index)

2. Enviar a Gemini 2.0 Flash con prompt estructurado
   → Instrucción: extraer TODOS los plazos como array JSON
   → Cada ítem: {description, date, days_from_signing, is_critical, legal_reference}
   → Respuesta: SOLO el array JSON, sin texto adicional

3. Parsear respuesta estrictamente
   → Si no es JSON válido: reintentar una vez con temperatura 0
   → Si falla de nuevo: guardar error en metadata, no bloquear el documento

4. Validar cada ítem extraído
   → date debe ser ISO 8601 o null
   → days_from_signing debe ser entero positivo o null
   → is_critical debe ser boolean

5. Guardar en document.metadata["deadlines"]
   → verificar: UPDATE documents SET metadata = metadata || '{"deadlines": [...]}' OK

## Referencias
- Script: backend/scripts/extract_deadlines.py
- Workflow: .github/workflows/extract-deadlines.yml
- LLM: Gemini 2.0 Flash (backend/app/services/llm.py)
- Schema: documents.metadata jsonb (Supabase)

## Criterio de Éxito
document.metadata["deadlines"] existe y contiene array (puede ser vacío
si el documento no tiene plazos). Ningún plazo con is_critical=true
fue generado sin legal_reference explícita.
