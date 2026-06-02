# Fase 7 — EnPI, Baselines, Objetivos

## Estado

✅ **Completada** — 2026-06-01

## Visión general

Indicadores de desempeño energético (EnPI) multi-utility, líneas base por periodo, y metas de reducción. Vinculable a site, área, equipo, proceso o utility system.

## Archivos

### DB (`00009_enpis.sql`)

- `energy_enpis` — indicadores (utility, unit, scope, frequency, formula JSONB)
- `energy_baselines` — líneas base con versión y método
- `energy_targets` — metas (reduction_percent o absolute_value)
- `energy_performance_results` — resultados por periodo con desviación
- RLS en todas las tablas vía enpi → site → company

### UI (`src/modules/desempeno/`)

- Lista de EnPIs con utility + unidad + scope
- Botón "Baseline" para agregar valor base
- Botón "Target" para agregar objetivo
- Gráfico de resultados recientes (6 periodos) con % desviación (verde/rojo)
- Formulario de creación con utility, unidad, alcance, frecuencia
- Soporta: kWh/ton, Nm3/unidad, kg/ton, m3/lote, TR-h/m2, GJ/unidad

## Criterios

- [x] EnPI builder funcional (utility, unit, scope, frequency)
- [x] Baseline por periodo fijo
- [x] Target con valor absoluto
- [x] Resultados con desviación visual
- [x] Filtros por utility, scope, site
- [x] `npm run build` funciona
