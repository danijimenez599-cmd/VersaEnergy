# Fase 6 — Balances + Overlays Visuales

## Estado

✅ **Completada** — 2026-06-01

## Visión general

Cálculo de balances de utilities desde lecturas de MeasurementPoints. El balance engine opera sobre el UtilityGraph y los readings.

## Archivos

### Engine (`src/services/balance-engine/`)

- `balanceEngine.ts` — `calculateBalance(graph, readings, period)` → BalanceResult
- `BalanceResult`: totalInput, measuredConsumption, calculatedConsumption, estimatedConsumption, technicalLosses, estimatedLeaks, returns, unaccountedFor, measurementCoverage
- `BalanceNodeResult` por nodo con consumo y cobertura

### DB (`00008_balances.sql`)

- `energy_balances` — resultados de balance con node_results JSONB

### UI (`src/modules/balances/`)

- Lista de balances con % no explicado (rojo si >10%)
- Botón "Ejecutar balance" que calcula desde readings existentes
- Detalle con KPIs (entrada, medido, no explicado, cobertura) + tabla de nodos

## Criterios

- [x] Balance calcula: entrada total, medido, calculado, estimado, pérdidas, fugas, retornos, no explicado
- [x] Balance engine es independiente de React
- [x] Tabla resumen + detalle por nodo
- [x] `npm run build` funciona
