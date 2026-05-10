# Flujo: Monitor de Normativa Argentina

## Objetivo
Scraper diario de InfoLEG y SAIJ para detectar nueva legislación
que impacte causas o contratos activos de los estudios en la plataforma.
Generar alertas precisas y accionables.

## Restricciones
- NUNCA generar alerta sin similitud > 0.75 entre normativa y chunk
- NUNCA duplicar alertas para el mismo par (normativa_item, document)
- NO interpretar el impacto legal — solo detectar y describir la coincidencia
- Solo procesar normativa con published_at de las últimas 24 horas en cron diario

## Protocolo de Acción
1. Scrape InfoLEG RSS: http://servicios.infoleg.gob.ar/infolegInternet/RSS
   Scrape SAIJ novedades API
   → verificar: al menos una fuente respondió correctamente

2. Filtrar ítems con published_at > última ejecución
   → Si no hay ítems nuevos: terminar limpiamente (exit 0, no es error)

3. Para cada ítem nuevo:
   → Generar embedding con Voyage AI (voyage-law-2)
   → Insertar en normativa_items si no existe (deduplicar por URL)

4. Para cada normativa_item nuevo:
   → Buscar chunks con cosine_similarity > 0.75 en todas las firmas
   → Agrupar matches por firm_id
   → Para cada firma con matches: insertar en tabla alerts

5. Notificar por email (Resend) a admins de firmas afectadas
   → formato: {titulo_normativa, url_fuente, documentos_afectados[]}
   → verificar: email enviado o log de fallo

## Manejo de Errores
- Si InfoLEG falla: intentar SAIJ igualmente, loggear el fallo de InfoLEG
- Si Voyage AI falla: reintentar 3 veces con backoff exponencial
- Si Supabase falla: guardar ítems en archivo JSON local como fallback

## Referencias
- Script: backend/scripts/scrape_normativa.py
- Workflow: .github/workflows/monitor-normativa.yml (cron 8am weekdays)
- Schema: normativa_items, alerts (Supabase)
- Config: VOYAGE_API_KEY, SUPABASE_SERVICE_KEY, RESEND_API_KEY

## Criterio de Éxito
Para cada ejecución: log con {items_procesados, alertas_generadas, emails_enviados}.
Cero alertas es resultado válido si no hay normativa nueva relevante.
