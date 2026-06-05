# Modulo: Medicion

## Responsabilidad

Pipeline profesional de datos energeticos. Transforma lecturas en datos
confiables y validados que alimentan balances y EnPI. Gestiona el ciclo raw ->
validado -> publicado.

En Fase E5, la fuente productiva vigente es **ingreso manual**. File import,
API pull/push, IoT DB/gateway y calculados deben quedar visibles solo como
capacidades **EN DESARROLLO** o placeholders de arquitectura, sin prometer
ingestion productiva todavia.

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/medicion/index.tsx` |
| Motor de medicion | `src/services/measurement-engine/` |
| Catalogo de unidades | `src/services/measurement-engine/unitCatalog.ts` |

## Modelo/Tablas

- `energy_readings_raw` — lecturas crudas.
- `energy_readings_validated` — lecturas validadas.
- `energy_import_batches` — lotes de importacion CSV.
- `measurement_points` — puntos de medicion (compartido con Equipos).
- `measurement_readings` — lecturas canonicas modernas usadas por mapa,
  balances, EnPI y motores nuevos.
- `asset_registry_events` — eventos auditados de cambio/reset/rollover o
  correccion manual de acumuladores.

Migraciones: `00007_readings.sql`, `00020_measurement_readings.sql`,
`00026_e1_registry_lifecycle.sql`, `00029_e5_measurement_point_contract.sql`.

## Flujo actual

1. Captura manual como flujo productivo principal.
2. 4 tabs: Captura, Importaciones, Calidad, Lecturas validadas.
3. Captura manual con dos modalidades:
   - **Lectura Individual**: Selección y captura rápida de un solo medidor con preview de delta en tiempo real para acumuladores.
   - **Rutina de Medición (Lote)**: Entrada tabular de lecturas para todos los medidores manuales del sitio y utility seleccionados, con preview de deltas en tiempo real y guardado masivo en lote a Supabase.
4. La captura manual escribe en `measurement_readings` mediante
   `fn_record_measurement_reading_tx`.
5. Import CSV queda **EN DESARROLLO** para E5; puede existir maqueta o
   placeholder, pero no debe tratarse como canal productivo.
6. API pull/push, IoT DB/gateway y calculated quedan **EN DESARROLLO**; E5 solo
   debe dejar contrato y puntos de extension.
7. Calidad: tabla por MeasurementPoint con score (Buena/Revisar/Sin datos) y
   deteccion de gaps.
8. Validadas: tabla con columna delta y estado (valid/suspicious).
9. Cuando el activo seleccionado es un equipo, los MeasurementPoints se
   filtran a los vinculados a ese equipo.

## Invariantes

- Lectura raw no alimenta balances hasta validarse.
- Cada lectura conserva fuente y lote.
- Acumuladores calculan delta automaticamente.
- Un MeasurementPoint puede tener medidor fisico o no. El medidor fisico
  (`physical_meter_asset_id`) es opcional; el scope medido debe ser explicito.
- Si existe medidor fisico, debe ser un activo mantenible Core con
  `maintainable_kind='meter'`.
- Si no existe medidor fisico, el MeasurementPoint sigue siendo valido siempre
  que tenga fuente, scope, dominio, unidad, magnitud y trazabilidad.
- Una lectura de `measurement_type='accumulator'` o `counter` no puede ser
  menor que la lectura anterior salvo evento declarado: `meter_reset`,
  `meter_changed`, `meter_rollover` o `manual_correction`.
- Datos estimados se distinguen de medidos.
- Unidad del punto debe ser compatible con su utility y magnitud.
- No se pierden lecturas raw al validar.
- El ingreso recomendado a `measurement_readings` es
  `fn_record_measurement_reading_tx`; los inserts directos tambien quedan
  protegidos por trigger.

## Permisos

Visible para todos los usuarios autenticados.

## Integraciones

- Equipos: MeasurementPoints vinculados a equipos.
- Balances: lecturas validadas alimentan el calculo.
- EnPI: datos para indicadores de desempeno.
- Mapa: ultima lectura visible en inspector de nodos.
- Cockpit: calidad de datos como KPI.

## No hacer

- No poner logica de validacion/calculo en React.
- No perder lecturas raw al validar.
- No permitir unidades incompatibles con utility.
- No saltar la validacion para alimentar balances.
- No aceptar retrocesos de acumulador como lectura normal sin evento auditado.
- No presentar API, IoT, file import o calculated como canales productivos en
  E5; deben quedar marcados como **EN DESARROLLO**.

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Cambio en measurement-engine: `npm run build`.
- Cambio en safeguard de acumuladores: probar lectura creciente, lectura menor
  rechazada y lectura menor aceptada con evento.
