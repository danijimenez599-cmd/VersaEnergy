# Fase 5 — Medición + Acumuladores + IoT Binding

## Objetivo

Gestionar lecturas reales, importadas o estimadas para todos los MeasurementPoints. Implementar lógica de acumuladores (rollover, delta, multiplicador), validación de calidad de datos e importación CSV. Configurar bindings IoT (fuente, protocolo, address) — sin conexión directa desde frontend.

## Rol en la arquitectura

Esta fase materializa la medición: conecta el modelo de datos (MeasurementPoints de Fase 2) con lecturas reales. La distinción entre sensor instantáneo y acumulador es crítica. El IoT binding se configura pero no se conecta directamente desde frontend.

---

## Tareas

### 1. Motor de medición (`src/services/measurement-engine/`)
```ts
// accumulator.ts
function calculateDelta(prev: number, curr: number, config: AccumulatorConfig): number | null

// quality.ts
function validateReading(reading: RawReading, point: MeasurementPoint): DataQualityIssue[]

// converter.ts
function convertReading(value: number, fromUnit: string, toUnit: string, utility: string): number
```

### 2. Lógica de acumuladores (`accumulator.ts`)
```ts
function calculateDelta(prev: number, curr: number, config: AccumulatorConfig): number | null {
  const adjustedPrev = prev * config.multiplier + config.offset;
  const adjustedCurr = curr * config.multiplier + config.offset;

  if (adjustedCurr >= adjustedPrev) {
    return adjustedCurr - adjustedPrev;
  }

  // Rollover del contador
  if (config.rollover?.enabled) {
    return config.rollover.maxValue - adjustedPrev + adjustedCurr;
  }

  // Posible reset manual
  if (config.resetDetection) {
    return null; // Marcar para revisión
  }

  // Delta negativo no permitido
  if (!config.allowNegativeDelta) {
    return null;
  }

  return adjustedCurr - adjustedPrev;
}
```

### 3. Validación de calidad (`quality.ts`)
Validaciones por lectura:
- Valor negativo (si no aplica)
- Fuera de rango esperado (vs histórico)
- Salto brusco (>3σ de la media móvil)
- Valor duplicado (misma lectura insertada dos veces)
- Gap temporal (falta lectura en periodo esperado)
- Unidad incompatible con utility del MeasurementPoint
- Valor nulo en campo requerido

Cada issue: severity, message, suggested_action

### 4. Tablas de lecturas
```sql
energy_readings_raw (
  id uuid PK,
  measurement_point_id FK → measurement_points,
  timestamp timestamptz NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  source text NOT NULL,  -- manual | csv_import | iot | calculated
  import_batch_id FK → energy_import_batches NULL,
  raw_data jsonb,        -- datos originales del CSV/IoT
  created_at timestamptz
)

energy_readings_validated (
  id uuid PK,
  raw_reading_id FK → energy_readings_raw UNIQUE,
  measurement_point_id FK → measurement_points,
  timestamp timestamptz,
  value numeric,
  unit text,
  status text,  -- valid | suspicious | rejected
  quality_flags jsonb,
  delta_value numeric,         -- calculado para acumuladores
  delta_unit text,
  validated_by uuid FK → profiles,
  validated_at timestamptz
)

energy_import_batches (
  id uuid PK,
  site_id FK → sites,
  file_name text,
  file_size integer,
  row_count integer,
  valid_count integer,
  error_count integer,
  status text,  -- processing | completed | failed
  column_mapping jsonb,
  errors jsonb,
  created_by uuid FK → profiles,
  created_at timestamptz
)
```

### 5. Captura manual de lecturas
- Formulario: seleccionar MeasurementPoint → fecha/hora → valor → unidad
- Vista de últimas lecturas por MeasurementPoint
- Posibilidad de editar/marcar como estimado
- Los datos estimados se marcan visualmente (dashed/gray)

### 6. Importación CSV
- Upload de archivo CSV
- Preview de primeras 5 filas
- Mapeo de columnas: timestamp, value, unit, measurement_point_tag
- Validación en lote (errores agrupados)
- Resumen post-import: X leídas, Y válidas, Z con errores

### 7. API de lecturas para el inspector del mapa
- Endpoint o servicio: `getLatestReadings(pointId, limit)` → últimas N lecturas
- Endpoint: `getConsumption(pointId, from, to)` → consumo acumulado en periodo
- Estos datos se muestran en el InspectorPanel (Fase 3) cuando se selecciona un nodo/edge con MeasurementPoints

### 8. Configuración IoT (solo estructura)
- `source_config` en MeasurementPoint acepta configuración IoT:
```json
{
  "kind": "iot",
  "protocol": "mqtt",
  "address": "mqtt://broker.plant.local:1883",
  "topic": "plant/boiler-room/steam-meter-001/total_kg",
  "pollingSeconds": 60
}
```
- La UI muestra el estado del binding: configured / not_configured
- **NO se implementa conexión real.** El frontend solo lee de Supabase. La ingesta IoT es tarea del backend/gateway (fuera del MVP).

---

## Archivos esperados

| Archivo | Acción |
|---------|--------|
| `src/services/measurement-engine/accumulator.ts` | Creado |
| `src/services/measurement-engine/quality.ts` | Creado |
| `src/services/measurement-engine/converter.ts` | Creado |
| `src/services/measurement-engine/index.ts` | Creado |
| `src/modules/medicion/index.tsx` | Implementado |
| `src/modules/medicion/views/ManualReadingForm.tsx` | Creado |
| `src/modules/medicion/views/ReadingsList.tsx` | Creado |
| `src/modules/medicion/views/CsvImport.tsx` | Creado |
| `src/modules/medicion/views/DataQualityPanel.tsx` | Creado |
| `src/modules/medicion/components/ColumnMapper.tsx` | Creado |
| `supabase/migrations/00007_readings.sql` | Creado |

---

## Criterios de Aceptación

- [ ] `calculateDelta` maneja: normal, rollover, reset, negativo, multiplier+offset
- [ ] Validación de calidad detecta: negativos, outliers, duplicados, gaps, unidad inválida
- [ ] Captura manual funcional con selección de MeasurementPoint
- [ ] Import CSV con preview, mapeo de columnas, resumen de errores
- [ ] Lecturas se persisten en `energy_readings_raw` → `energy_readings_validated`
- [ ] Los datos estimados se marcan visualmente (badge/estilo)
- [ ] IoT source_config se puede editar en el MeasurementPoint (sin conexión real)
- [ ] Las últimas lecturas se muestran en el inspector del mapa
- [ ] `npm run build` funciona

---

## Prompt sugerido para AI

```txt
Implementa Medición + Acumuladores + IoT Binding (Fase 5 de VersaEnergy).
Lee AGENTS.md y docs/fase-05.md para el contexto completo.

IMPORTANTE: Distingue entre sensor instantáneo (kW, m3/h, psi) y acumulador (kWh, m3, kg).
Los acumuladores requieren cálculo de delta entre lecturas consecutivas.
El IoT binding se configura pero NO se conecta. Frontend nunca habla directo con PLC/MQTT.

Tareas:
1. Crea src/services/measurement-engine/ con:
   - accumulator.ts: calculateDelta con rollover, reset, multiplier, offset
   - quality.ts: validación (negativos, outliers, duplicados, gaps, unidad inválida)
   - converter.ts: conversión de unidades

2. Migración 00007_readings.sql con:
   - energy_readings_raw, energy_readings_validated, energy_import_batches
   - RLS en todas las tablas

3. Implementa el módulo src/modules/medicion/:
   - ManualReadingForm: seleccionar MeasurementPoint → timestamp → value → unit
   - ReadingsList: tabla de lecturas con filtros (point, fecha, utility)
   - CsvImport: upload, preview, column mapping, resumen de errores
   - DataQualityPanel: issues por MeasurementPoint

4. Muestra últimas lecturas en el inspector del mapa (actualizar MeasurementBinding.tsx de Fase 3)

5. Las lecturas estimadas deben distinguirse visualmente de las reales

TODO en Supabase, cero mocks. NO implementar conexión IoT real.
Debe compilar con npm run build.
```
