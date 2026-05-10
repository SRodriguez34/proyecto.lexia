# Flujo: Ingesta de Documentos Legales

## Objetivo
Convertir un documento legal (PDF/DOCX) en chunks semánticos almacenados
en Supabase con embeddings de 1024 dimensiones, respetando la estructura
jurídica del documento (cláusulas, artículos, secciones).

## Restricciones
- NUNCA cortar un chunk en medio de una cláusula o artículo
- NUNCA procesar documentos mayores a 50MB
- NUNCA guardar en Supabase si el embedding falló o tiene dimensión != 1024
- NUNCA modificar el archivo original
- NO asumir el tipo de documento — detectarlo con Unstructured

## Protocolo de Acción
1. Recibir archivo + firm_id + matter_id (opcional)
   → verificar: archivo es PDF o DOCX, tamaño < 50MB

2. Parsear con Unstructured (partition auto)
   → verificar: len(elements) > 0
   → preservar tipos: Title, NarrativeText, ListItem, Table

3. Agrupar elementos en chunks por estructura legal
   → verificar: ningún chunk < 50 tokens ni > 800 tokens
   → metadata por chunk: {clause_number, section, page, element_type}

4. Generar embeddings con Voyage AI (voyage-law-2, batch 128)
   → verificar: cada embedding tiene dimensión == 1024

5. Insertar documento con status="processing" en Supabase
   → Insertar chunks en batch
   → Actualizar status a "indexed"
   → verificar: SELECT count(*) FROM chunks WHERE document_id = X > 0

## Manejo de Errores
Si cualquier paso falla:
  - Actualizar document.status = "failed"
  - Log estructurado: {document_id, step, error, timestamp}
  - Raise con contexto completo — nunca silenciar

## Referencias
- Script: backend/app/services/ingestion.py
- Schema: backend/scripts/schema.sql (tablas: documents, chunks)
- Config: backend/app/core/config.py (VOYAGE_API_KEY, SUPABASE_URL)

## Criterio de Éxito
document.status == "indexed" AND
SELECT count(*) FROM chunks WHERE document_id = X >= 1 AND
cada chunk retornable por hybrid_search() con relevance_score > 0.5
