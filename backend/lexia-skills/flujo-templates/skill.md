# Flujo: Workflow Templates Compartibles

## Objetivo
Permitir que los abogados creen checklists de revisión reutilizables
y los compartan con todo el estudio. Convertir conocimiento individual
en conocimiento institucional persistente.

## Caso de uso principal
Un abogado senior define "cómo revisamos contratos de locación en este
estudio" (10 puntos específicos del CCyC 2015). Lo guarda como template.
Cualquier abogado del estudio lo aplica con un click sobre cualquier
contrato nuevo. El estudio opera con estándares consistentes.

## Templates pre-cargados (incluir al lanzar la feature)
```
1. Contrato de Locación (CCyC 2015)
   - Plazo mínimo legal (art. 1198 CCyC)
   - Precio y actualización (UVA, IPC, INDEC)
   - Depósito y condiciones de devolución
   - Cláusulas de rescisión anticipada
   - Estado del inmueble y reparaciones

2. Contrato de Trabajo (LCT)
   - Categoría y remuneración según convenio
   - Jornada y horas extras
   - Período de prueba (art. 92 bis LCT)
   - Cláusulas de confidencialidad
   - Jurisdicción y fuero competente

3. Contrato de Compraventa Inmobiliaria
   - Identificación registral del inmueble
   - Precio y forma de pago
   - Fecha de escrituración
   - Cláusula de penalidad por incumplimiento
   - Estado de deudas (ABL, expensas, servicios)

4. Revisión de Demanda Laboral
   - Pretensiones y montos reclamados
   - Plazos procesales
   - Prueba ofrecida
   - Jurisprudencia citada
   - Defectos formales
```

## Restricciones
- Templates públicos (is_public=true) son solo de LECTURA para otros estudios
- Solo el creador o admin del estudio puede editar o eliminar un template
- Máximo 50 templates por firma en plan trial/solo
- Los templates no almacenan respuestas — solo las preguntas del checklist

## Protocolo de Acción

### Crear template:
1. Abogado define nombre + materia + lista de puntos del checklist
2. POST /templates → guardar en workflow_templates
3. Opcionalmente marcar is_public=true para compartir con la comunidad

### Aplicar template a documento:
1. Abogado selecciona template + documento(s)
2. Sistema redirige automáticamente a flujo-bulk-review con el checklist
   del template pre-cargado
3. El resultado se asocia al template para analytics de uso

### Explorar templates públicos:
1. GET /templates/public → lista templates compartidos por otros estudios
2. Abogado puede "clonar" un template público a su firma
3. Puede modificar el clon sin afectar el original

## Referencias
- Servicio: backend/app/services/templates.py
- API: backend/app/api/templates.py
- Schema: workflow_templates (Supabase)
- Frontend: frontend/app/(dashboard)/templates/page.tsx

## Criterio de Éxito
Template creado y aplicable a documento en < 3 clicks.
Templates públicos visibles y clonables.
Integración con flujo-bulk-review funcional sin fricción.
