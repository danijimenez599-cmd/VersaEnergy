# Fase 8 — Acciones y Proyectos de Mejora

> Nota documental: esta fase queda como referencia de construccion original y
> plan de base para mejoras. Para trabajo futuro usa
> `05_MASTER_IMPROVEMENT_PLAN.md`, especialmente MP-08 y MP-09.

## Resumen ejecutivo

La Fase 8 convierte hallazgos energéticos y de utilities en trabajo ejecutable.
No todas las oportunidades deben tratarse igual:

- **Acción rápida**: mejora acotada, un responsable, bajo presupuesto, pocas
  tareas, seguimiento tipo Kanban.
- **Proyecto de mejora**: iniciativa de mayor impacto o complejidad, con fases,
  tareas, recursos, presupuesto, baseline, Gantt, seguimiento de avance,
  costos/ahorros y cierre formal.

VersaEnergy debe tomar inspiración de VersaProjects, especialmente su Gantt por
fases/actividades, recursos, baseline, valor ganado y cierre, pero sin copiar
todo el alcance PMBOK ni convertir esta fase en un Microsoft Project completo.
El objetivo es tener un módulo energético práctico: suficiente para ejecutar
mejoras reales y generar evidencia para el SGEn alineado con ISO 50001.

## Objetivo

Convertir desviaciones, fugas, pérdidas, oportunidades de ahorro, mejoras de
desempeño y hallazgos ISO en acciones o proyectos gestionables, trazables y
verificables contra datos reales de VersaEnergy.

## Rol en la arquitectura

Las acciones/proyectos son el output operativo del sistema:

```txt
balance / EnPI / mapa / ISO -> oportunidad -> acción rápida o proyecto -> ejecución -> M&V -> evidencia
```

Deben vincularse al grafo semántico (`utility`, nodos, edges), mediciones,
balances, EnPI, objetivos ISO y evidencia documental. Una mejora cerrada debe
poder demostrar:

- qué problema resolvía;
- qué utility, área, equipo o sistema afectaba;
- qué ahorro se esperaba;
- qué se hizo;
- quién lo ejecutó;
- cuánto costó;
- qué ahorro real se verificó;
- qué evidencia queda para auditoría.

---

## Principio de diseño

### Acción rápida vs proyecto

Usa **acción rápida** cuando:

- una persona o equipo puede resolverlo sin planificación compleja;
- no requiere CAPEX formal;
- no hay dependencias fuertes;
- no necesita Gantt ni baseline;
- el cierre se verifica con evidencia simple.

Ejemplos:

- corregir fuga menor de aire comprimido;
- ajustar setpoint;
- cargar evidencia faltante;
- revisar medidor con dato anómalo;
- limpiar filtro o corregir aislamiento menor.

Usa **proyecto de mejora** cuando:

- requiere varias fases o actividades;
- hay presupuesto/inversión;
- participa más de un equipo o contratista;
- requiere recursos, fechas, dependencias o compras;
- necesita medición y verificación formal;
- afecta una línea, utility system o SEU importante;
- debe reportarse como iniciativa ISO o de gestión.

Ejemplos:

- reemplazo de compresor;
- recuperación de condensado;
- optimización de sala de calderas;
- instalación de VFDs;
- cambio de luminarias por etapas;
- submedición de una planta;
- proyecto de reducción de demanda pico.

---

## Alcance inspirado en VersaProjects

Tomar de VersaProjects estas ideas, adaptadas a energía:

1. **Proyecto con fases**: fases ordenadas con presupuesto, fechas, estado y avance.
2. **Gantt ligero**: barras planificadas/reales por fase y actividad.
3. **Tareas/OTs internas del proyecto**: actividades con prioridad, responsable,
   fechas, horas estimadas/reales y checklist.
4. **Recursos**: mano de obra, equipo, herramienta o especialista con costo/hora
   y asignación a proyecto/fase.
5. **Baseline**: congelar plan aprobado antes de ejecutar; no reescribirlo en silencio.
6. **Valor ganado simplificado**: BAC, PV, EV, AC, CPI, SPI, EAC como tablero
   interno para proyectos grandes.
7. **Cierre**: punch list, evidencias, lecciones aprendidas, verificación de
   ahorro real.

No traer en Fase 8:

- CRM completo;
- cotizaciones comerciales;
- facturación;
- órdenes de compra completas;
- portal de cliente;
- RFI formal complejo;
- gestión contractual pesada.

Esos conceptos pueden integrarse en el futuro o vivir en VersaProjects. En
VersaEnergy basta con guardar referencias externas cuando aplique.

---

## Modelo conceptual

### Work item unificado

```ts
type ImprovementWorkType = 'quick_action' | 'project'

type ImprovementStatus =
  | 'identified'
  | 'triage'
  | 'approved'
  | 'planned'
  | 'in_progress'
  | 'verification'
  | 'closed'
  | 'cancelled'

interface EnergyImprovement {
  id: string
  siteId: string
  workType: ImprovementWorkType
  title: string
  description: string
  status: ImprovementStatus
  priority: 'low' | 'medium' | 'high' | 'critical'
  category:
    | 'leakage'
    | 'efficiency'
    | 'behavioral'
    | 'maintenance'
    | 'controls'
    | 'measurement'
    | 'investment'
    | 'iso'

  utility: string
  areaId?: string
  equipmentId?: string
  utilitySystemId?: string
  sourceNodeIds?: string[]
  sourceEdgeIds?: string[]
  sourceMeasurementPointIds?: string[]
  sourceBalanceId?: string
  sourceEnPIId?: string
  sourceIsoItemId?: string

  ownerId: string
  sponsorId?: string
  department?: string

  estimatedEnergySavings: number
  savingsUnit: string       // kWh, m3, kg, GJ, Nm3, etc.
  estimatedCostSavings: number
  estimatedCo2eSavings?: number
  estimatedInvestment: number
  currency: string
  paybackMonths?: number

  actualEnergySavings?: number
  actualCostSavings?: number
  actualCo2eSavings?: number
  measurementVerificationMethod?: 'before_after' | 'baseline_model' | 'metered' | 'engineering_estimate'

  identifiedAt: Date
  approvedAt?: Date
  plannedStart?: Date
  plannedFinish?: Date
  actualStart?: Date
  actualFinish?: Date

  externalProjectRef?: string // futuro: VersaProjects u otro PM system
}
```

### Proyecto de mejora

```ts
interface EnergyImprovementProject {
  id: string
  improvementId: string
  projectCode: string
  scope: string
  businessCase: string
  constraints?: string
  assumptions?: string
  riskNotes?: string
  baseline?: EnergyProjectBaseline
}

interface EnergyProjectPhase {
  id: string
  projectId: string
  order: number
  name: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'paused'
  budget: number
  progress: number
  plannedStart: Date
  plannedFinish: Date
  actualStart?: Date
  actualFinish?: Date
}

interface EnergyProjectTask {
  id: string
  projectId: string
  phaseId?: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'normal' | 'high' | 'urgent'
  ownerId?: string
  plannedDate?: Date
  actualDate?: Date
  estimatedHours?: number
  actualHours?: number
  checklist?: { text: string; done: boolean }[]
}

interface EnergyProjectDependency {
  id: string
  predecessorTaskId: string
  successorTaskId: string
  type: 'FS' | 'SS' | 'FF' | 'SF'
  lagDays: number
}

interface EnergyProjectResource {
  id: string
  siteId: string
  name: string
  type: 'labor' | 'equipment' | 'tool' | 'specialist' | 'contractor'
  costPerHour?: number
  available: boolean
}

interface EnergyProjectResourceAssignment {
  id: string
  projectId: string
  phaseId?: string
  taskId?: string
  resourceId: string
  startDate: Date
  endDate: Date
  estimatedHours?: number
  actualHours?: number
}
```

### Baseline y valor ganado simplificado

```ts
interface EnergyProjectBaseline {
  capturedAt: Date
  budgetAtCompletion: number // BAC
  plannedStart: Date
  plannedFinish: Date
  phases: {
    phaseId: string
    name: string
    budget: number
    plannedStart: Date
    plannedFinish: Date
  }[]
}

interface EnergyProjectPerformance {
  projectId: string
  periodStart: Date
  periodEnd: Date
  BAC: number
  PV: number
  EV: number
  AC: number
  CPI: number
  SPI: number
  EAC?: number
}
```

---

## Estados

### Pipeline común

```txt
identified -> triage -> approved -> planned -> in_progress -> verification -> closed
                                                -> cancelled
```

Interpretación:

- `identified`: hallazgo capturado desde mapa, balance, EnPI, ISO o manual.
- `triage`: se decide si es acción rápida o proyecto.
- `approved`: responsable/sponsor aprueba ejecución.
- `planned`: solo obligatorio para proyectos; ya tiene fases/tareas/baseline.
- `in_progress`: ejecución activa.
- `verification`: ejecución terminada, pendiente validar ahorro/evidencia.
- `closed`: ahorro/evidencia registrados o cierre justificado.
- `cancelled`: descartado con razón.

---

## Tablas sugeridas

```sql
energy_improvements
energy_improvement_projects
energy_project_phases
energy_project_tasks
energy_project_dependencies
energy_project_resources
energy_project_resource_assignments
energy_project_costs
energy_project_baselines
energy_improvement_evidence
energy_improvement_comments
energy_improvement_status_log
```

Notas:

- Todas las tablas tenant-scoped deben llevar `company_id`/`site_id` según el
  patrón actual del proyecto.
- Todas deben tener RLS.
- No duplicar mediciones: los ahorros reales deben referenciar readings,
  balances o EnPI cuando sea posible.
- `externalProjectRef` permite integrar VersaProjects en el futuro sin acoplar
  esta fase a otra app.

---

## Vistas

### 1. Intake / Oportunidades

Bandeja de oportunidades creadas desde:

- balance con desviación;
- overlay de mapa;
- EnPI fuera de objetivo;
- riesgo/oportunidad ISO;
- captura manual.

Acción principal: clasificar como **acción rápida** o **proyecto**.

### 2. Kanban de acciones rápidas

Columnas por estado, cards con:

- título;
- utility badge;
- prioridad;
- responsable;
- ahorro estimado;
- fecha objetivo;
- origen del hallazgo.

### 3. Portfolio de proyectos

Cards/tabla de proyectos con:

- estado;
- utility;
- inversión;
- ahorro esperado;
- payback;
- avance;
- CPI/SPI si tiene baseline;
- responsable/sponsor.

### 4. Workspace de proyecto

Tabs mínimos:

- **Resumen / business case**: alcance, origen, KPIs de ahorro, inversión, payback.
- **Plan / Gantt**: fases y tareas con plan vs real.
- **Recursos y costos**: recursos asignados, costos por categoría, horas.
- **M&V / valor ganado**: ahorro esperado vs real, BAC/PV/EV/AC para proyectos grandes.
- **Evidencia y cierre**: adjuntos, comentarios, punch list simple, lecciones aprendidas.

### 5. Detalle de acción rápida

Formulario simple con:

- descripción;
- responsable;
- fechas;
- ahorro estimado/real;
- evidencia;
- comentarios;
- cambio de estado.

---

## Integración con otras fases

- **Fase 3/4 Mapa y grafo**: una mejora puede referenciar nodos, edges,
  utility systems o diagram version.
- **Fase 5 Medición**: M&V usa MeasurementPoints y lecturas reales cuando existan.
- **Fase 6 Balances**: desviaciones y pérdidas pueden crear oportunidad prellenada.
- **Fase 7 EnPI**: EnPI fuera de objetivo puede crear acción/proyecto.
- **Fase 9 SGEn / ISO 50001**: planes de acción, oportunidades, evidencia y mejora
  continua deben vincularse a esta fase.
- **VersaProjects futuro**: un proyecto energético puede guardar referencia
  externa a un proyecto de VersaProjects si se decide ejecutar allí la gestión
  PM completa.

---

## Archivos esperados

| Archivo | Acción |
|---------|--------|
| `src/modules/acciones/index.tsx` | Implementado como hub de acciones/proyectos |
| `src/modules/acciones/views/ImprovementInbox.tsx` | Creado |
| `src/modules/acciones/views/QuickActionKanban.tsx` | Creado |
| `src/modules/acciones/views/ImprovementPortfolio.tsx` | Creado |
| `src/modules/acciones/views/ImprovementProjectWorkspace.tsx` | Creado |
| `src/modules/acciones/views/ImprovementForm.tsx` | Creado |
| `src/modules/acciones/views/ImprovementDetail.tsx` | Creado |
| `src/modules/acciones/components/ImprovementCard.tsx` | Creado |
| `src/modules/acciones/components/ProjectGantt.tsx` | Creado |
| `src/modules/acciones/components/EvidenceUpload.tsx` | Creado |
| `src/modules/acciones/types.ts` | Creado |
| `src/modules/acciones/store/slice.ts` | Creado si se sigue patrón por módulo |
| `src/services/improvement-engine/projectMetrics.ts` | Creado para cálculos EVM/M&V sin React |
| `supabase/migrations/00010_improvements.sql` | Creado |

---

## Criterios de aceptación

- [ ] Se puede crear oportunidad desde balance, mapa, EnPI o manualmente.
- [ ] El usuario puede clasificar una oportunidad como acción rápida o proyecto.
- [ ] Acción rápida se gestiona en Kanban con responsable, prioridad, ahorro y evidencia.
- [ ] Proyecto tiene fases, tareas, fechas, presupuesto, recursos y avance.
- [ ] Gantt ligero muestra plan vs real por fase/tarea.
- [ ] Proyecto puede fijar baseline antes de ejecución.
- [ ] Proyectos grandes muestran métricas BAC, PV, EV, AC, CPI y SPI.
- [ ] Se registran costos reales y ahorro real verificado.
- [ ] Evidencia y comentarios quedan asociados al work item.
- [ ] Cierre requiere ahorro real o justificación de cierre sin ahorro.
- [ ] El SGEn alineado con ISO 50001 puede referenciar acciones/proyectos de esta fase.
- [ ] Todo persiste en Supabase con RLS.
- [ ] `npm run build` funciona.

---

## Plan de implementación recomendado

### Paso 1 — Base de datos y tipos

Crear `00010_improvements.sql` con:

- `energy_improvements`;
- `energy_improvement_projects`;
- fases, tareas, dependencias;
- recursos/asignaciones;
- costos;
- baseline;
- evidencia, comentarios y status log.

Crear tipos TS en `src/modules/acciones/types.ts`.

### Paso 2 — Inbox + clasificación

Implementar bandeja de oportunidades y flujo:

```txt
oportunidad -> acción rápida
oportunidad -> proyecto
```

Al crear desde balance/mapa/EnPI, prellenar utility, origen y métricas.

### Paso 3 — Acciones rápidas

Implementar Kanban + detalle simple:

- estados;
- responsable;
- fechas;
- ahorro estimado/real;
- evidencia;
- comentarios.

### Paso 4 — Proyectos de mejora

Implementar portfolio + workspace mínimo:

- resumen/business case;
- fases/tareas;
- Gantt ligero;
- recursos/costos;
- evidencia/cierre.

### Paso 5 — Métricas y verificación

Crear `src/services/improvement-engine/projectMetrics.ts` con:

- payback;
- avance ponderado;
- BAC/PV/EV/AC/CPI/SPI;
- ahorro esperado vs real;
- estado de verificación.

### Paso 6 — Integraciones internas

Agregar entry points desde:

- balances;
- overlay del mapa;
- EnPI;
- SGEn alineado con ISO 50001.

### Paso 7 — Documentación y QA

Actualizar:

- `docs/fase-08.md`;
- `docs/fase-09.md` si cambia vínculo ISO;
- README o AGENTS si cambia el nombre/alcance del módulo.

Verificar:

- `npm run build`;
- RLS de nuevas tablas;
- flujo manual: desviación -> oportunidad -> acción/proyecto -> evidencia -> cierre.

---

## Prompt sugerido para AI

```txt
Implementa Acciones y Proyectos de Mejora (Fase 8 de VersaEnergy).
Lee AGENTS.md y docs/fase-08.md.

Contexto:
- VersaEnergy ya tiene mapa, medición, balances y EnPI.
- Las oportunidades pequeñas se gestionan como acciones rápidas.
- Las iniciativas grandes se gestionan como proyectos de mejora con fases,
  tareas, recursos, Gantt ligero, baseline y métricas tipo valor ganado.
- Inspirarse en VersaProjects, pero NO copiar CRM, facturación, compras ni PM
  completo.

Tareas:
1. Crear migración 00010_improvements.sql con tablas de improvements,
   projects, phases, tasks, dependencies, resources, assignments, costs,
   baselines, evidence, comments y status_log. Todo con RLS.
2. Crear tipos TS de acciones/proyectos.
3. Implementar src/modules/acciones como hub:
   - Inbox de oportunidades.
   - Kanban de acciones rápidas.
   - Portfolio de proyectos.
   - Workspace de proyecto con resumen, Gantt, recursos/costos, M&V y cierre.
4. Crear service puro src/services/improvement-engine/projectMetrics.ts para
   payback, avance ponderado, BAC/PV/EV/AC/CPI/SPI y ahorro real vs esperado.
5. Permitir crear oportunidad prellenada desde balance, mapa y EnPI.
6. Vincular acciones/proyectos a utility, nodos/edges, MeasurementPoints,
   balance, EnPI e ISO.

TODO en Supabase, cero mocks. Debe compilar con npm run build.
```
