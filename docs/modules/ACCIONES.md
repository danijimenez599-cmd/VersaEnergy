# Modulo: Acciones y Proyectos

## Responsabilidad

Puente entre analitica y ejecucion. Gestiona oportunidades de mejora, acciones
rapidas medibles, proyectos formales con Gantt, fases, tareas, presupuesto,
responsables, M&V, evidencia y monitoreo posterior antes del cierre sostenido.

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/acciones/index.tsx` |
| Tipos | `src/modules/acciones/types.ts` |
| Inbox oportunidades | `src/modules/acciones/views/ImprovementInbox.tsx` |
| Kanban acciones rapidas | `src/modules/acciones/views/QuickActionKanban.tsx` |
| Portfolio de proyectos | `src/modules/acciones/views/ImprovementPortfolio.tsx` |
| Workspace de proyecto | `src/modules/acciones/views/ImprovementProjectWorkspace.tsx` |
| Formulario de mejora | `src/modules/acciones/views/ImprovementForm.tsx` |
| Gantt | `src/modules/acciones/components/GanttChart.tsx` |
| Formulario de tareas | `src/modules/acciones/components/TaskForm.tsx` |
| Motor de mejoras | `src/services/improvement-engine/` |

## Modelo/Tablas

- `energy_improvements` — oportunidades, acciones y proyectos. Incluye EnPI
  asociado, metodo M&V y ventana personalizada de monitoreo posterior.
- `energy_improvement_evidence` — evidencia de cierre.
- `energy_project_phases` — fases de proyecto.
- `energy_project_tasks` — tareas de proyecto.

Migraciones:

- `00010_improvements_core.sql`.
- `00016_improvement_monitoring_period.sql` — agrega
  `monitoring_start`, `monitoring_end`, `monitoring_status` y
  `monitoring_notes` a `energy_improvements`.

## Flujo actual

1. Tabs: Inbox, Acciones rapidas, Portfolio de proyectos.
2. Inbox: clasificacion rapida accion/proyecto con scoring de triage.
3. Acciones rapidas: tarjetas medibles con EnPI asociado, M&V, ahorro,
   responsable, checklist, evidencia y monitoreo si aplica.
4. Kanban: Identificada -> En analisis -> En ejecucion -> Verificada -> Cerrada.
5. Portfolio: proyectos visuales con presupuesto, ahorro, fases,
   responsables, EnPI, evidencia, timeline y monitoreo posterior.
5. Workspace de proyecto con 4+ tabs:
   - Resumen
   - Gantt (barras planeadas con relleno de progreso, cabecera de meses,
     linea Hoy)
   - Tareas con toggle de estado
   - M&V (tab de Monitoreo y Verificacion IPMVP)
   - Monitoreo y cierre de mejora con comparacion estimado vs real
6. Barra de progreso general calculada desde fases.

## Monitoreo posterior de mejoras

Los proyectos no se cierran de golpe al terminar la implementacion. El flujo
correcto es:

1. Implementar la accion o proyecto.
2. Registrar ahorro real preliminar, costo real y metodo M&V.
3. Pasar la mejora a `verification`.
4. Definir `monitoring_start`, `monitoring_end` y criterio de sostenimiento.
5. Vigilar el EnPI, medidor o calculo comprometido durante la ventana definida.
6. Cerrar solo cuando el desempeno se sostenga y `monitoring_status = passed`.

Si el desempeno cae durante el periodo, la mejora debe permanecer abierta,
volver a ejecucion o crear una accion correctiva conectada.

## Invariantes

- Oportunidad muestra origen y evidencia.
- Triage recomienda tipo de trabajo (accion rapida vs proyecto).
- Ahorro verificado visible.
- EnPI y metodo M&V visibles cuando la mejora promete impacto energetico.
- Proyecto no debe saltar directo a cerrado: pasa por `verification` con
  monitoreo personalizado antes de `closed`.
- No usar `prompt()` para fases/tareas.
- Gantt muestra plan vs real.

## Permisos

Visible para todos los usuarios autenticados.

## Integraciones

- Balances: desviaciones crean oportunidades.
- EnPI: desviaciones crean oportunidades.
- SGEn: evidencia de proyectos cerrados.
- Mapa: nodos con oportunidades.
- CMMS futuro: oportunidad puede crear Solicitud de Trabajo.

## No hacer

- No usar `prompt()` para datos.
- No poner logica de scoring/calculo en React.
- No cerrar accion sin evidencia ni monitoreo cuando el impacto debe
  sostenerse en el tiempo.
- No convertir en Microsoft Project completo.

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Cambio en improvement-engine: `npm run build`.
