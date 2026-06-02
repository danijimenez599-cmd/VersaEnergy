# Fase 6 — Balances + Overlays Visuales

## Objetivo

Calcular balances de utilities a partir del grafo técnico (Fase 4) + lecturas (Fase 5), y mostrar los resultados como overlays visuales sobre el canvas. Permitir crear acciones de ahorro desde desviaciones detectadas.

## Rol en la arquitectura

Esta fase cierra el ciclo: grafo + medición → balance → visualización → acción. El balance engine opera sobre el UtilityGraph y los MeasurementPoints, no sobre coordenadas de canvas.

---

## Tareas

### 1. Balance Engine (`src/services/balance-engine/`)
```ts
// balanceEngine.ts
function calculateBalance(
  graph: UtilityGraph,
  readings: ValidatedReading[],
  period: { from: Date; to: Date }
): BalanceResult

interface BalanceResult {
  utility: string
  period: { from: Date; to: Date }
  diagramVersionId: string     // ← CRÍTICO: versión del diagrama usada
  totalInput: number
  measuredConsumption: number
  calculatedConsumption: number
  estimatedConsumption: number
  technicalLosses: number
  estimatedLeaks: number
  returns: number
  unaccountedFor: number
  unaccountedForPercent: number
  measurementCoverage: number  // % de flujo medido vs total
  nodeResults: NodeBalanceResult[]
  edgeResults: EdgeBalanceResult[]
}

interface NodeBalanceResult {
  nodeId: string
  tag: string
  input: number
  output: number
  consumption: number
  coverage: 'measured' | 'estimated' | 'calculated' | 'unmetered'
  deviation?: number
  alerts?: BalanceAlert[]
}
```

### 2. Reglas de balance
- Entrada total = suma de utility_source nodes
- Consumo medido = suma de nodos con MeasurementPoint (acumulador)
- Consumo calculado = virtual meters (fórmulas)
- Consumo estimado = nodos sin medición, estimados por allocation factor
- Pérdidas técnicas = Σ(lossFactor × flujo en edges)
- Fugas = Σ(leakFactor × flujo en edges)
- No explicado = entrada total - (medido + calculado + estimado + pérdidas + fugas)
- Retornos = nodos con edge `returns_to`

### 3. Tablas de balance
```sql
energy_balances (
  id uuid PK,
  site_id FK → sites,
  diagram_version_id FK → energy_diagram_versions,  -- ← versión congelada
  utility text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_input numeric,
  measured_consumption numeric,
  calculated_consumption numeric,
  estimated_consumption numeric,
  technical_losses numeric,
  estimated_leaks numeric,
  returns numeric,
  unaccounted_for numeric,
  unaccounted_for_percent numeric,
  measurement_coverage numeric,
  status text,  -- draft | final
  created_by uuid FK → profiles,
  created_at timestamptz
)

energy_balance_node_results (
  id uuid PK,
  balance_id FK → energy_balances,
  node_id text,
  node_tag text,
  input numeric,
  output numeric,
  consumption numeric,
  coverage text,
  deviation numeric,
  alerts jsonb
)
```

### 4. Vista de balances (`src/modules/balances/`)
- Seleccionar site + utility + periodo
- Ejecutar balance (botón "Calcular")
- Tabla resumen: entrada, medido, calculado, estimado, pérdidas, no explicado, %
- Gráfico Sankey o waterfall de flujos
- Tabla de detalle por nodo
- **CRÍTICO**: mostrar `diagram_version_id` usado en el balance

### 5. Overlays sobre el canvas
Capas visuales activables desde el mapa:
- **Consumo**: nodos coloreados por consumo relativo (verde→ámbar→rojo)
- **Cobertura**: measured (verde), estimated (ámbar), unmetered (rojo)
- **Pérdidas**: edges con pérdidas resaltados
- **Desviación vs baseline**: nodos/edges fuera de rango esperado

Convención visual (ya definida en AGENTS.md):
- Verde: dentro de objetivo
- Ámbar: desviación moderada
- Rojo: desviación crítica, pérdida o fuga
- Gris: sin datos o inactivo
- Línea gruesa: mayor flujo
- Línea punteada: estimación

### 6. Acción desde desviación
- En la vista de balances o en el overlay, si un nodo/edge muestra desviación, botón "Crear Acción"
- Redirige al módulo de acciones (Fase 8) con contexto pre-llenado:
  - Utility afectada
  - Nodo/edge origen
  - Valor de desviación
  - Periodo del balance

---

## Archivos esperados

| Archivo | Acción |
|---------|--------|
| `src/services/balance-engine/balanceEngine.ts` | Creado |
| `src/services/balance-engine/types.ts` | Creado |
| `src/services/balance-engine/index.ts` | Creado |
| `src/modules/balances/index.tsx` | Implementado |
| `src/modules/balances/views/BalanceSummary.tsx` | Creado |
| `src/modules/balances/views/BalanceDetail.tsx` | Creado |
| `src/modules/balances/views/BalanceFlowChart.tsx` | Creado |
| `src/modules/mapa/canvas/overlays/ConsumptionOverlay.tsx` | Creado |
| `src/modules/mapa/canvas/overlays/CoverageOverlay.tsx` | Creado |
| `src/modules/mapa/canvas/overlays/DeviationOverlay.tsx` | Creado |
| `supabase/migrations/00008_balances.sql` | Creado |

---

## Criterios de Aceptación

- [ ] Balance calcula: entrada total, medido, calculado, estimado, pérdidas, fugas, retornos, no explicado
- [ ] Balance guarda `diagram_version_id`
- [ ] Balance engine es independiente de React
- [ ] Vista de balances con tabla resumen + gráfico + detalle por nodo
- [ ] Overlays sobre el canvas: consumo, cobertura, desviación
- [ ] Colores por convención: verde/ámbar/rojo/gris
- [ ] Botón "Crear Acción" desde desviación (navega a Fase 8)
- [ ] `npm run build` funciona

---

## Prompt sugerido para AI

```txt
Implementa Balances + Overlays Visuales (Fase 6 de VersaEnergy).
Lee AGENTS.md y docs/fase-06.md para el contexto completo.

El balance engine debe ser PURO (sin React), en src/services/balance-engine/.
Usa el UtilityGraph de Fase 4 y las lecturas de Fase 5.

Tareas:
1. Crea src/services/balance-engine/balanceEngine.ts:
   - calculateBalance(graph, readings, period) → BalanceResult
   - totalInput = suma utility_source nodes
   - measuredConsumption = nodos con MeasurementPoint acumulador
   - calculatedConsumption = virtual meters (fórmulas)
   - estimatedConsumption = allocation factors en nodos sin medición
   - technicalLosses = Σ(lossFactor × flujo)
   - estimatedLeaks = Σ(leakFactor × flujo)
   - unaccountedFor = input - (measured + calculated + estimated + losses + leaks)
   - measurementCoverage = % flujo medido vs total
   - GUARDA diagram_version_id en el resultado

2. Migración 00008_balances.sql: energy_balances + energy_balance_node_results

3. Implementa src/modules/balances/:
   - Selector de site + utility + periodo
   - Botón "Calcular"
   - Tabla resumen con todos los componentes del balance
   - Gráfico de flujo (Sankey o waterfall)
   - Tabla detalle por nodo con cobertura y desviación

4. Overlays sobre el mapa:
   - ConsumptionOverlay: nodos coloreados por consumo relativo
   - CoverageOverlay: measured (verde), estimated (ámbar), unmetered (rojo)
   - DeviationOverlay: desviación vs baseline
   - Usar convención: verde/ámbar/rojo/gris

5. Botón "Crear Acción" desde cualquier desviación detectada

TODO en Supabase, cero mocks.
Debe compilar con npm run build.
```
