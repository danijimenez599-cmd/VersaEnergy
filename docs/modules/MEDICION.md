# Modulo: Medicion

## Responsabilidad

Pipeline profesional de datos energeticos. Transforma lecturas fisicas
(manuales, CSV, IoT futuro) en datos confiables y validados que alimentan
balances y EnPI. Gestiona el ciclo raw -> validado -> publicado.

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

Migracion: `00007_readings.sql`.

## Flujo actual

1. 4 tabs: Captura, Importaciones, Calidad, Lecturas validadas.
2. Captura manual con dos modalidades:
   - **Lectura Individual**: Selección y captura rápida de un solo medidor con preview de delta en tiempo real para acumuladores.
   - **Rutina de Medición (Lote)**: Entrada tabular de lecturas para todos los medidores manuales del sitio y utility seleccionados, con preview de deltas en tiempo real y guardado masivo en lote a Supabase.
3. Import CSV con auto-deteccion de delimitador, mapeo de columnas, preview
   de datos y tracking de batch.
4. Calidad: tabla por MeasurementPoint con score (Buena/Revisar/Sin datos) y
   deteccion de gaps.
5. Validadas: tabla con columna delta y estado (valid/suspicious).
6. Cuando el activo seleccionado es un equipo, los MeasurementPoints se
   filtran a los vinculados a ese equipo.

## Invariantes

- Lectura raw no alimenta balances hasta validarse.
- Cada lectura conserva fuente y lote.
- Acumuladores calculan delta automaticamente.
- Datos estimados se distinguen de medidos.
- Unidad del punto debe ser compatible con su utility y magnitud.
- No se pierden lecturas raw al validar.

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

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Cambio en measurement-engine: `npm run build`.
