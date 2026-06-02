# Fase 5 — Medición + Acumuladores + IoT Binding

> Nota documental: esta fase queda como referencia de construccion original.
> Para trabajo futuro usa `05_MASTER_IMPROVEMENT_PLAN.md`.

## Estado

✅ **Completada** — 2026-06-01

## Visión general

Motor de acumuladores (`calculateDelta` con rollover, reset, multiplier), validación de calidad de datos, importación CSV y captura manual de lecturas. IoT source config se configura pero no se conecta (frontend nunca habla directo con PLCs).

## Archivos

### Engine (`src/services/measurement-engine/`)

| Archivo | Funciones |
|---------|-----------|
| `accumulator.ts` | `calculateDelta(prev, curr, config)` — maneja normal, rollover, reset, negative. `calculateDeltas(readings[], config)` — calcula todos los deltas en serie |
| `quality.ts` | `validateReading()` — unit, negative, null, outlier (z-score > 3σ). `validateReadingsBatch()`. `detectDuplicateReadings()`. `detectGaps()` |
| `index.ts` | Barrel export |

### DB (`00007_readings.sql`)

- `energy_import_batches` — registro de imports CSV
- `energy_readings_raw` — lecturas crudas (unique por mp + timestamp)
- `energy_readings_validated` — lecturas validadas con status y delta
- RLS en todas las tablas vía measurement_point → site → company

### UI (`src/modules/medicion/`)

3 tabs: Manual entry, lista de lecturas, import CSV
- Mapeo de columnas del CSV
- Preview de primeras filas
- Resumen de importación

## Criterios

- [x] `calculateDelta` con rollover, reset, multiplier, offset
- [x] Validación de calidad: negativos, nulos, outliers, unidad incorrecta
- [x] Captura manual funcional
- [x] Import CSV con mapeo de columnas
- [x] Lecturas persistidas en Supabase
