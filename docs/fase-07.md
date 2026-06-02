# Fase 7 — EnPI, Baselines, Objetivos

## Objetivo

Implementar indicadores de desempeño energético (EnPI), líneas base de consumo por periodo, y metas de reducción. Todo multi-utility, vinculable a site, área, equipo, proceso o utility system.

## Rol en la arquitectura

El desempeño cierra el ciclo PDCA: medir (Fase 5) → comparar contra baseline → actuar (Fase 8). Los EnPI pueden usar datos de MeasurementPoints y resultados de balances (Fase 6).

---

## Tareas

### 1. Tipos de EnPI
```ts
interface EnPI {
  id: string
  siteId: string
  name: string
  description?: string
  utility: string
  formula: {
    numerator: string      // MeasurementPoint ID o fórmula
    denominator: string    // Variable de producción, área, etc.
  }
  unit: string             // kWh/ton, Nm3/unidad, kg/ton, m3/lote...
  scope: 'site' | 'area' | 'equipment' | 'process' | 'utility_system'
  scopeId: string
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly'
  isActive: boolean
}
```

Ejemplos que debe soportar:
- `kWh / tonelada producida`
- `Nm3 aire comprimido / unidad`
- `kg vapor / tonelada`
- `m3 agua / lote`
- `TR-h / m2`
- `GJ / unidad`

### 2. Baselines
- Baseline por periodo fijo (ej: consumo promedio Ene-Mar 2026)
- Métodos: promedio simple, regresión lineal, media móvil
- Cada baseline tiene versión y periodo de referencia
- Comparación: real vs baseline = % desviación

### 3. Objetivos (Targets)
- Meta de reducción: -5% vs baseline
- Meta absoluta: ≤ 500 kWh/ton
- Fecha límite
- Progreso visual (barra/gauge)

### 4. Tablas
```sql
energy_enpis (id, site_id, name, utility, formula jsonb, unit, scope, scope_id, frequency, is_active)
energy_baselines (id, enpi_id, version, reference_period, method, value, unit, created_at)
energy_targets (id, enpi_id, name, target_type, target_value, unit, deadline, status)
energy_performance_results (id, enpi_id, period_start, period_end, actual_value, baseline_value, target_value, deviation_percent)
```

### 5. Visualización
- Gráfico de tendencia (Recharts): real vs baseline vs target
- Cards de KPIs con valor actual, % desviación, flecha tendencia
- Tabla de EnPIs con filtros por utility, scope

---

## Archivos esperados

| Archivo | Acción |
|---------|--------|
| `src/modules/desempeno/index.tsx` | Implementado |
| `src/modules/desempeno/views/EnPIList.tsx` | Creado |
| `src/modules/desempeno/views/EnPIForm.tsx` | Creado |
| `src/modules/desempeno/views/EnPIDetail.tsx` | Creado |
| `src/modules/desempeno/views/BaselineManager.tsx` | Creado |
| `src/modules/desempeno/views/TargetProgress.tsx` | Creado |
| `src/modules/desempeno/components/EnPITrendChart.tsx` | Creado |
| `supabase/migrations/00009_enpis.sql` | Creado |

---

## Criterios de Aceptación

- [ ] EnPI builder funcional (numerador, denominador, unidad, scope)
- [ ] Soporta EnPIs multi-utility (kWh/ton, Nm3/unidad, kg/ton, m3/lote, TR-h/m2, GJ/unidad)
- [ ] Baseline por periodo fijo con versión
- [ ] Comparación real vs baseline con % desviación
- [ ] Target con progreso visual
- [ ] Gráficos de tendencia con Recharts
- [ ] Filtros por utility, scope, site
- [ ] `npm run build` funciona

---

## Prompt sugerido para AI

```txt
Implementa EnPI, Baselines, Objetivos (Fase 7 de VersaEnergy).
Lee AGENTS.md y docs/fase-07.md.

Tareas:
1. Migración 00009_enpis.sql: energy_enpis, energy_baselines, energy_targets,
   energy_performance_results con RLS

2. Implementa src/modules/desempeno/:
   - EnPI builder (numerador MP/formula, denominador variable, unidad compuesta)
   - Soporta: kWh/ton, Nm3/unidad, kg vapor/ton, m3/lote, TR-h/m2, GJ/unidad
   - Baseline manager (periodo fijo, método, versionado)
   - Target con valor absoluto o % reducción + deadline
   - Gráfico de tendencia real vs baseline vs target (Recharts)
   - KPIs cards con valor actual, % desviación, flecha tendencia
   - Filtros por utility, scope (site/area/equipment/process)

TODO en Supabase, cero mocks. Debe compilar con npm run build.
```
