# Modulo: Acciones y Proyectos

## Responsabilidad

Puente entre analitica y ejecucion. Gestiona oportunidades de mejora, acciones
rapidas medibles, proyectos formales con Gantt, fases, tareas, presupuesto,
responsables, M&V, evidencia y monitoreo posterior antes del cierre sostenido.
Desde E9 tambien administra la ejecucion auditada: planes M&V formales,
solicitudes Maint/CMMS y feedback de mantenimiento con impacto energetico.

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
  asociado, estudio origen, modelo origen, metodo M&V y ventana personalizada
  de monitoreo posterior.
- `energy_improvement_evidence` — evidencia de cierre.
- `energy_project_phases` — fases de proyecto.
- `energy_project_tasks` — tareas de proyecto.
- `energy_mv_plans` — planes M&V versionados por mejora: fuente baseline,
  metodo, ventana de verificacion, ahorro esperado/real, criterio y evidencia.
- `energy_cmms_handoff_requests` — solicitudes Energy<->Maint/CMMS.
- `energy_improvement_events` — bitacora auditada de origen, M&V, handoff,
  feedback y cierre.

Migraciones:

- `00010_improvements_core.sql`.
- `00016_improvement_monitoring_period.sql` — agrega
  `monitoring_start`, `monitoring_end`, `monitoring_status` y
  `monitoring_notes` a `energy_improvements`.
- `00024_energy_study_decision_links.sql` — agrega `source_study_id` y
  `source_study_model_id`.
- `00033_e9_execution_audit_cmms.sql` — agrega M&V formal, auditoria y
  handoff Maint/CMMS.

## Flujo actual

1. Tabs: Inbox, Acciones rapidas, Portfolio de proyectos.
2. Inbox: clasificacion rapida accion/proyecto con scoring de triage.
3. Acciones rapidas: tarjetas medibles con EnPI asociado, M&V, ahorro,
   responsable, checklist, evidencia y monitoreo si aplica.
4. Kanban: Identificada -> En analisis -> En ejecucion -> Verificada -> Cerrada.
5. Portfolio: proyectos visuales con presupuesto, ahorro, fases,
   responsables, EnPI, evidencia, timeline y monitoreo posterior.
5. Workspace de proyecto con 5 tabs:
   - Resumen
   - Gantt (barras planeadas con relleno de progreso, cabecera de meses,
     linea Hoy)
   - Tareas con toggle de estado
   - M&V (tab de Monitoreo y Verificacion IPMVP)
   - Auditoria / CMMS (plan M&V, solicitudes Maint/CMMS y bitacora)
   - Monitoreo y cierre de mejora con comparacion estimado vs real
6. Barra de progreso general calculada desde fases.
7. El Centro de Estudios puede crear una mejora directamente desde un hallazgo
   y registrar la decision `create_improvement`.

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

## E9: ejecucion auditada y Maint handoff

### Principio de gobierno

Energy es dueno de la oportunidad, el analisis, el plan M&V, la evidencia y la
verificacion del ahorro. Maint/CMMS es dueno de los activos mantenibles, la
prioridad de mantenimiento, la OT y el cierre tecnico cuando ambas apps existen.

Por eso Energy no crea OTs directas. Crea registros en
`energy_cmms_handoff_requests`:

- `energy_to_cmms`: Energy solicita reparacion, inspeccion, calibracion,
  ajuste operacional, PM sugerido, cambio de activo o trabajo de eficiencia.
- `cmms_to_energy`: mantenimiento devuelve un hallazgo con impacto energetico
  potencial para que Energy lo cuantifique y lo convierta en accion.

### M&V formal

Toda mejora con ahorro relevante debe tener, antes del cierre:

- `energy_mv_plans.status` aprobado o verificado;
- metodo `before_after`, `baseline_model`, `metered` o
  `engineering_estimate`;
- fuente baseline (`measurement_point`, `balance_result`, `enpi`, `study` o
  `manual`);
- ventana de baseline y de verificacion;
- criterio de aceptacion;
- evidencia o referencia tecnica.

El tab **Auditoria / CMMS** permite crear un plan M&V desde el proyecto. El
servicio `src/services/improvement-engine/e9Execution.ts` centraliza escritura
de plan, eventos y handoff para evitar logica dispersa en React.

### Auditoria

`energy_improvement_events` es la memoria de ejecucion. Debe registrar eventos
como:

- creacion desde estudio;
- definicion/aprobacion de M&V;
- envio a CMMS;
- aceptacion/rechazo CMMS;
- creacion/cierre de OT;
- feedback CMMS;
- cierre con ahorro o sin ahorro;
- revision de auditoria.

No sustituye `energy_improvement_status_log`; lo complementa con contexto
auditable de negocio, fuente y estado anterior/nuevo.

## Invariantes

- Oportunidad muestra origen y evidencia.
- Si nace de estudio, conserva `source_study_id` y `source_study_model_id`.
- Triage recomienda tipo de trabajo (accion rapida vs proyecto).
- Ahorro verificado visible.
- EnPI y metodo M&V visibles cuando la mejora promete impacto energetico.
- M&V formal vive en `energy_mv_plans`; campos de `energy_improvements` son
  resumen operacional.
- Handoff CMMS vive en `energy_cmms_handoff_requests`; Energy no inventa OTs.
- Feedback de mantenimiento con impacto energetico debe poder abrir accion en
  Energy sin romper el gobierno CMMS.
- Todo evento relevante de ejecucion debe quedar en `energy_improvement_events`.
- Proyecto no debe saltar directo a cerrado: pasa por `verification` con
  monitoreo personalizado antes de `closed`.
- No usar `prompt()` para fases/tareas.
- Gantt muestra plan vs real.

## Permisos

Visible para todos los usuarios autenticados.

## Integraciones

- Balances: desviaciones crean oportunidades.
- Estudios Energeticos: hallazgos crean oportunidades/acciones con modelo y
  supuestos trazables.
- EnPI: desviaciones crean oportunidades.
- SGEn: evidencia de proyectos cerrados.
- Mapa: nodos con oportunidades.
- Maint/CMMS: Energy crea solicitudes de handoff y recibe feedback; CMMS
  gobierna OT y activos mantenibles cuando ambas apps estan activas.

## No hacer

- No usar `prompt()` para datos.
- No poner logica de scoring/calculo en React.
- No cerrar accion sin evidencia ni monitoreo cuando el impacto debe
  sostenerse en el tiempo.
- No convertir en Microsoft Project completo.

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Cambio en improvement-engine: `npm run build`.
