# Fase 4 — Motor de Grafo + Validación + Versionado + Serialización

> Nota documental: esta fase queda como referencia de construccion original.
> Para trabajo futuro usa `05_MASTER_IMPROVEMENT_PLAN.md`.

## Estado

✅ **Completada** — 2026-06-01

---

## Visión general

La Fase 4 implementa la **capa semántica** que separa el canvas (vista) del grafo (verdad). Todo el código es **lógica pura** en `src/services/topology-engine/`, sin dependencia de React. A partir de aquí, balances (Fase 6) y cálculos operan sobre el grafo, no sobre coordenadas.

> "El canvas es solo la vista; la verdad del sistema es el grafo semántico."

---

## Módulos del motor

### 1. `utilityRules.ts` — Reglas por utility (16 utilities)

Define para cada utility: nodos válidos, tipos de edge, medidores compatibles, unidades de flujo/acumulador, utilities incompatibles.

Funciones exportadas: `getRuleSet()`, `areUtilitiesCompatible()`, `isNodeTypeAllowed()`, `isMeterTypeAllowed()`, `isEdgeTypeAllowed()`.

### 2. `unitConversion.ts` — Conversiones de unidades

Tabla de 30+ conversiones con factor y flag `isEstimated`. Cross-utility conversions marcadas como estimadas (ej: m3 gas → kWh con factor 10.55).

Funciones: `getConversion()`, `convertUnits()`, `areUnitsCompatible()`.

### 3. `validators.ts` — 12 reglas de validación

| Regla | Severidad | Verifica |
|-------|-----------|----------|
| R01 | error | Tag único en el diagrama |
| R02 | error | Edge tiene utility definida |
| R03 | error | Utilities compatibles entre nodos conectados |
| R04 | error | Medidor compatible con utility del target |
| R05 | error | Acumulador usa unidad acumulativa |
| R06 | warning | Edge tiene dirección de flujo definida |
| R07 | warning | Nodo tiene utility definida |
| R08 | error | Edge type compatible con utility |
| R09 | warning | Circuito eléctrico tiene utility_source |
| R10 | warning | Sin ciclos en edges de flujo (DFS) |
| R11 | error | Nodo de medición compatible con utility |
| R12 | error | MeasurementPoint apunta a target existente |

Funciones: `validate()`, `validateDiagram()`, `validateNode()`, `validateEdge()`, `hasErrors()`, `getIssuesBySeverity()`.

### 4. `compiler.ts` — Canvas → UtilityGraph

Convierte los datos raw de Supabase (nodeRows, edgeRows, measurementPoints) en un `UtilityGraph` con:
- GraphNodes con incoming/outgoing poblados
- GraphEdges con measurementPoints vinculados
- MeasurementScopes
- BalanceTrees (árboles jerárquicos desde source nodes)
- ValidationIssues (ejecuta las 12 reglas)

Función principal: `compileFromRows(diagramId, versionId, nodeRows, edgeRows, measurementPoints)`.

### 5. `graphQueries.ts` — Queries de grafo

- `getConnectedComponent()` — BFS desde un nodo
- `getUpstreamNodes()` — todos los nodos aguas arriba
- `getDownstreamNodes()` — todos los nodos aguas abajo
- `getPath()` — BFS con camino entre source y target
- `getMeasuredNodes()` / `getUnmeasuredNodes()`
- `getSourceNodes()` / `getLeafNodes()`
- `getNodesByUtility()`

### 6. `serialization.ts` — Snapshot JSON

Genera `DiagramSnapshot` con schema version 1.0.0:
- Canvas state (zoom, viewport)
- Nodos + edges serializados
- MeasurementPoints
- StandardsProfile
- Validation summary (errors, warnings, info)

Funciones: `createSnapshot()`, `snapshotToJson()`, `parseSnapshot()`, `compareSnapshots()`.

### 7. `topologyVersioning.ts` — Versionado de diagramas

Estados: `draft → published → archived`

- `canEdit()` / `canPublish()` / `canArchive()` / `canClone()`
- `publishVersion()` — congela versión con snapshot
- `archiveVersion()`
- `createCloneVersion()` — clona published como nuevo draft
- `getActiveVersion()` / `getLatestDraft()`
- `validateVersionTransition()` — valida transiciones válidas

### Migración

`00006_topology_engine.sql`: `energy_diagram_versions` + `energy_topology_validation_issues`.

---

## Cómo usar desde la UI (Fase 3)

```ts
import { compileFromRows, hasErrors, getSourceNodes, getLeafNodes } from '@/services/topology-engine'

// Compilar grafo desde datos de Supabase
const graph = compileFromRows(diagramId, versionId, nodeRows, edgeRows, measurementPoints)

// Verificar errores
if (hasErrors(graph.validationIssues)) {
  console.error('El diagrama tiene errores:', graph.validationIssues)
}

// Navegar el grafo
const sources = getSourceNodes(graph.nodes)
const consumers = getLeafNodes(graph.nodes)
```

---

## Criterios de aceptación

- [x] Compiler convierte canvas → UtilityGraph con nodes, edges, scopes, issues
- [x] 12 reglas de validación implementadas y exportadas
- [x] Validación detecta tags duplicados, utilities incompatibles, medidores mal asignados
- [x] Sistema de versionado: draft → published → archived, clone
- [x] Serialization produce snapshot JSON con schema version 1.0.0
- [x] Graph queries: upstream, downstream, path, connected component
- [x] Toda la lógica en `src/services/topology-engine/` (sin React)
- [x] Migración 00006 aplicada en Supabase
- [x] `npm run build` funciona
