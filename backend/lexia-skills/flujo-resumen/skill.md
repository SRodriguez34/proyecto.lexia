# Flujo: Resumen de Causa Legal Completa

## Objetivo
Generar un resumen ejecutivo estructurado de todos los documentos de una causa legal argentina.
Usar contexto largo (todos los chunks) con Gemini 2.5 Pro.

## Restricciones
- NUNCA omitir partes involucradas ni fechas clave identificadas en los documentos
- NUNCA inventar hechos que no estén en la documentación aportada
- NUNCA opinar sobre el resultado probable del caso — solo describir el estado objetivo
- Si la causa no tiene documentos indexados: decirlo explícitamente

## Protocolo de Acción
1. Analizar todos los documentos de la causa proporcionados en el contexto
2. Identificar: partes involucradas, materia legal (laboral/civil/comercial/penal), tribunal y juzgado
3. Reconstruir la línea de tiempo procesal con actuaciones y fechas
4. Extraer plazos críticos pendientes
5. Generar resumen en markdown estructurado

## Estructura de Salida Esperada (markdown)
```
## Partes
## Objeto de la Causa
## Estado Procesal Actual
## Plazos Críticos Identificados
## Riesgos y Puntos de Atención
## Próximos Pasos Recomendados
```

## Criterio de Éxito
Resumen con las 6 secciones completas. Cada afirmación de hecho referencia el documento fuente.
