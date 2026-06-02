# Fase 4 — Motor de Grafo + Validación + Versionado + Serialización

## Objetivo

Convertir el canvas visual en un **grafo técnico calculable**, con motor de validación basado en reglas, versionado de diagramas (draft → published → archived), y serialización JSON con schema version. Toda la lógica debe vivir en `src/services/topology-engine/`, sin dependencia de React.

## Rol en la arquitectura

Esta fase implementa la **capa semántica** que separa el canvas (vista) del grafo (verdad). A partir de aquí, balances, cálculos y validaciones operan sobre el grafo, no sobre coordenadas de canvas.

> "El canvas es solo la vista; la verdad del sistema es el grafo semántico."

---

## Tareas

### 1. Tipos del grafo (`graphTypes.ts`) — completar
Ampliar los tipos definidos en Fase 2:
```ts
interface UtilityGraph {
  id: string
  diagramId: string
  versionId: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  measurementScopes: MeasurementScope[]
  balanceTrees: BalanceTree[]
  validationIssues: ValidationIssue[]
  utilityCompatibilityMap: Record<string, string[]>
}

interface GraphNode {
  id: string
  diagramNodeId: string
  type: DiagramNodeType
  tag: string
  utility: string
  properties: Record<string, unknown>
  measurementPoints: MeasurementPoint[]
  incoming: string[]   // edge IDs
  outgoing: string[]   // edge IDs
}
```

### 2. Reglas de utility (`utilityRules.ts`)
Definir reglas específicas por utility:
- Qué tipos de nodos son válidos para cada utility
- Qué tipos de medidores son compatibles
- Unidades válidas
- Conversiones permitidas
- Restricciones de conexión (ej: steam pipe no puede conectar a electrical panel)

### 3. Conversión de unidades (`unitConversion.ts`)
- Tabla de conversiones entre unidades de misma magnitud
- Conversiones entre utilities requieren definición explícita (ej: gas m3 → kWh con factor)
- Las conversiones implícitas deben marcarse como estimadas

### 4. Motor de validación (`validators.ts`)
Sistema de reglas:
```ts
interface ValidationRule {
  id: string
  severity: 'error' | 'warning' | 'info'
  appliesTo: 'node' | 'edge' | 'diagram' | 'measurement'
  check: (ctx: ValidationContext) => ValidationIssue[]
}
```

Reglas obligatorias:
1. **R01 — Tag único**: Cada nodo debe tener tag único dentro del diagrama
2. **R02 — Edge con utility**: Todo edge debe tener utility definida
3. **R03 — Compatibilidad utility**: Un edge de steam no puede conectar nodo eléctrico con nodo de agua
4. **R04 — Medidor compatible**: Un power_meter no puede asignarse a línea de steam
5. **R05 — Unidad acumulativa**: Accumulator requiere unidad acumulativa (kWh, m3, kg...)
6. **R06 — Unidad instantánea**: Sensor instantáneo requiere unidad de flujo (kW, m3/h, kg/h...)
7. **R07 — Dirección de flujo**: Todo edge de fluidos debe tener dirección o declararse bidireccional
8. **R08 — Circuito eléctrico**: Debe tener source y load identificables
9. **R09 — IoT source válido**: Si source es IoT, source_config debe ser válido
10. **R10 — Sin ciclos**: Conexiones feeds/flows_to no deben crear ciclos (salvo recirculación explícita)
11. **R11 — Área no alimenta**: Un área no debe tener outgoing de tipo feeds
12. **R12 — Return compatible**: Conexión returns_to debe apuntar a red de retorno compatible

### 5. Compilador (`compiler.ts`)
Entrada: nodes[], edges[], measurementPoints[] desde Supabase
Salida: `UtilityGraph` con:
- `measurementScopes` — qué mide cada MeasurementPoint
- `balanceTrees` — árboles jerárquicos de flujo (source → distribution → consumption)
- `validationIssues` — todos los issues detectados
- `utilityCompatibilityMap` — mapa de compatibilidad entre utilities

### 6. Queries del grafo (`graphQueries.ts`)
- `getUpstreamNodes(nodeId)` — todos los nodos que alimentan a un nodo
- `getDownstreamNodes(nodeId)` — todos los nodos alimentados por un nodo
- `getMeasuredNodes()` — nodos con cobertura de medición
- `getUnmeasuredNodes()` — nodos sin medición
- `getPath(sourceId, targetId)` — camino entre dos nodos
- `getConnectedComponent(nodeId)` — componente conectado

### 7. Serialización (`serialization.ts`)
Snapshot completo del diagrama en JSON:
```ts
interface DiagramSnapshot {
  schemaVersion: '1.0.0'
  id: string
  name: string
  versionId: string
  versionNumber: number
  createdAt: string
  canvas: {
    zoom: number
    viewport: { x: number; y: number }
    gridSize: number
  }
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  measurementPoints: MeasurementPoint[]
  standardsProfile: {
    symbolSet: 'isa-5.1' | 'iec-60617' | 'iso-14617' | 'custom'
    tagSystem: 'isa' | 'iec-81346' | 'custom'
  }
  validationSummary: {
    errors: number
    warnings: number
    info: number
  }
}
```

### 8. Versionado (`topologyVersioning.ts`)
Estados: `draft` → `published` → `archived`

Reglas:
1. Solo una versión published puede estar activa para un (site, utility, periodo)
2. Una versión published NO se edita directamente
3. Para modificar: clone → new draft → edit → publish
4. Cada balance guarda `diagram_version_id`
5. Cada reporte indica la versión usada

Tablas:
- `energy_diagrams` — añadir columnas: version, status, cloned_from_version_id
- `energy_diagram_versions` (id, diagram_id, version_number, status, snapshot JSONB, created_by, created_at, published_at)

---

## Archivos esperados

| Archivo | Acción |
|---------|--------|
| `src/services/topology-engine/graphTypes.ts` | Completado |
| `src/services/topology-engine/utilityRules.ts` | Creado |
| `src/services/topology-engine/unitConversion.ts` | Creado |
| `src/services/topology-engine/validators.ts` | Creado (12+ reglas) |
| `src/services/topology-engine/compiler.ts` | Creado |
| `src/services/topology-engine/graphQueries.ts` | Creado |
| `src/services/topology-engine/serialization.ts` | Creado |
| `src/services/topology-engine/topologyVersioning.ts` | Creado |
| `src/services/topology-engine/index.ts` | Creado (barrel) |
| `supabase/migrations/00006_topology_engine.sql` | Creado |

---

## Criterios de Aceptación

- [ ] Compiler convierte canvas → UtilityGraph con nodes, edges, scopes, issues
- [ ] Validación detecta: tag duplicado, utility incompatible, medidor mal asignado
- [ ] Validación: error (bloqueante), warning, info
- [ ] Una versión published NO se puede editar
- [ ] Clone crea nuevo draft con todos los elementos copiados
- [ ] Publish cambia status y registra timestamp
- [ ] Serialization produce snapshot JSON con schema version 1.0.0
- [ ] Balance tree identifica entradas y salidas por utility
- [ ] Graph queries: upstream, downstream, path, connected component
- [ ] Toda la lógica está en `src/services/topology-engine/` (sin React)
- [ ] `npm run build` funciona

---

## Prompt sugerido para AI

```txt
Implementa el Motor de Grafo + Validación + Versionado (Fase 4 de VersaEnergy).
Lee AGENTS.md y docs/fase-04.md para el contexto completo.

FILOSOFÍA: "El canvas es solo la vista; la verdad del sistema es el grafo semántico."
Toda la lógica DEBE vivir en src/services/topology-engine/ (SIN dependencia de React).

Tareas:
1. Completa graphTypes.ts con UtilityGraph, GraphNode, GraphEdge, MeasurementScope,
   BalanceTree, ValidationIssue, DiagramSnapshot

2. Crea utilityRules.ts — reglas por utility: tipos de nodo válidos, medidores compatibles,
   unidades válidas, restricciones de conexión

3. Crea unitConversion.ts — tabla de conversiones, factor explícito para cross-utility

4. Crea validators.ts con 12 reglas (R01-R12):
   - Tag único, edge con utility, compatibilidad utility, medidor compatible,
     unidad acumulativa, unidad instantánea, dirección de flujo,
     circuito eléctrico source/load, IoT source válido, sin ciclos,
     área no alimenta, return compatible
   - Cada regla con severity: error | warning | info

5. Crea compiler.ts:
   Entrada: nodes[], edges[], measurementPoints[]
   Salida: UtilityGraph con measurementScopes, balanceTrees, validationIssues,
           utilityCompatibilityMap

6. Crea graphQueries.ts: upstream, downstream, measured/unmeasured, path, connected component

7. Crea serialization.ts: DiagramSnapshot con schema version 1.0.0, canvas state,
   nodes, edges, measurementPoints, standardsProfile, validationSummary

8. Crea topologyVersioning.ts:
   - Estados: draft → published → archived
   - Clone, publish, archive
   - Validación: no editar published, una activa por site/utility/periodo

9. Migración 00006_topology_engine.sql con energy_diagram_versions

TODO en Supabase, cero mocks.
Debe compilar con npm run build.
```
