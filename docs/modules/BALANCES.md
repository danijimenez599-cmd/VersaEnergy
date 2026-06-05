# Modulo: Balances

## Responsabilidad

Ejecuta balances de energia por utility usando el grafo semantico, versiones
publicadas de diagrama y lecturas validadas. Responde: cuanto entro, cuanto se
consumio, cuanto se perdio, cuanto no se puede explicar.

Balances es la capa de cierre tecnico y contabilidad energetica. No debe
absorber todo el analisis creativo de ingenieria. Cuando el usuario necesite
explicar causas, probar metricas, comparar variables o construir un modelo de
desempeno, el flujo debe derivar hacia el Centro de Estudios Energeticos. El
roadmap vivo de cobertura/balances oficiales esta en
`docs/ENERGY_ENGINEERING_BLUEPRINT.md` (E7).

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/balances/index.tsx` |
| Motor legacy de balances | `src/services/balance-engine/` |
| Motor moderno de balance sheets | `src/services/balance-sheet-engine/` |
| Motor oficial E7 | `src/services/balance-sheet-engine/e7OfficialBalance.ts` |
| Variables relevantes | `src/modules/balances/views/RelevantVariablesPage.tsx` |

## Modelo/Tablas

- `energy_balance_sheets` — hojas de balance modernas por frontera/periodo.
- `energy_balance_entries` — entradas/salidas vinculadas a equipo y MP.
- `energy_balance_results` — resultados calculados y persistidos; desde E7
  puede guardar resultado oficial con version topologica, cobertura, hallazgos,
  confianza y estado `current/superseded`.
- `relevant_variables` — drivers, contexto y denominadores para EnPI/Estudios.
- `relevant_variable_readings` — valores periodicos con frecuencia flexible.
- `relevant_variable_groups` — buckets libres para organizar variables.
- `relevant_variable_group_members` — membresia de variables en buckets.
- `energy_balances` — tabla legacy de resultados de balance guardados.
- `energy_diagram_versions` — version de diagrama usada por balances legacy.
- `energy_readings_validated` — lecturas como input legacy.
- `measurement_points` — medidores de frontera.

Migraciones: `00008_balances.sql`, `00021_balance_sheets.sql`,
`00031_e7_official_balances.sql`, `00034_e11_enpi_relevant_variables.sql`.

## Flujo actual

1. Tab `Balances energeticos`: biblioteca de balance sheets por sitio.
2. Crear hoja con frontera: sitio, area, sistema o equipo; utility o multi-utility.
3. Editor de hoja: agregar entradas y salidas desde equipos y MeasurementPoints.
4. `calculateOfficialSheet` ejecuta E7:
   - primero usa `calculateSheet` para el cálculo base;
   - resuelve `scope_type/scope_id`;
   - exige diagrama publicado;
   - exige `energy_diagram_versions.is_published = true`;
   - captura versiones hijas si hay drill-down publicado;
   - genera `coverage_breakdown`, `topology_snapshot`, `findings` y
     `confidence_score`.
5. `persistOfficialResult` guarda el resultado en `energy_balance_results`,
   marca resultados oficiales previos del sheet como `superseded` y actualiza la
   hoja con la version oficial usada.
6. Estados: `draft -> closed -> approved`.
7. Tab `Variables relevantes`: administra buckets, drivers y lecturas periodicas
   para EnPI y Estudios. Las variables pueden representar produccion, clima,
   ocupacion, area, horas de operacion, calidad, costos o unidades custom.
8. Los estudios pueden consumir balance sheets como fuente energetica.

## E11: Variables relevantes

La pantalla `RelevantVariablesPage` reemplaza el concepto limitado de
"variables de produccion". Cada variable tiene:

- unidad libre (`lb`, `L`, `°C`, `personas`, `m2`, `h`, etc.);
- tipo (`production`, `environment`, `occupancy`, `area`, `runtime`,
  `quality`, `cost`, `operation`, `custom`);
- frecuencia por defecto (`daily`, `weekly`, `monthly`, `quarterly`,
  `annual`, `ad_hoc`);
- agregacion (`sum`, `avg`, `min`, `max`, `last`, `delta`,
  `weighted_avg`, `count`);
- fuente (`manual` vigente; `iot_db`, `api_*`, `file_import` preparados pero
  en desarrollo);
- bucket opcional para ordenar empresas con muchas variables.

El editor permite cambiar la frecuencia de captura antes de ingresar lecturas.
Los EnPIs referenciales leen estas variables como denominador canonico mediante
`energy_enpis.denominator_type = 'relevant_variable'`.

## Doctrina ES-0: Balance como cierre tecnico

Balance debe enfocarse en:

- cerrar entradas, salidas, retornos, perdidas y no explicado;
- preservar valor nativo y valor convertido cuando aplique;
- declarar conversiones multi-utility de forma explicita;
- distinguir medido, manual, calculado, estimado y faltante;
- conservar frontera, periodo, utility y version de diagrama;
- mostrar cobertura de medicion;
- generar CTA hacia Estudios cuando exista una pregunta causal.

Balance no debe convertirse en:

- laboratorio de regresion;
- constructor principal de EnPIs maduros;
- tablero de M&V post-proyecto;
- repositorio de hipotesis abiertas.

Preguntas que Balance responde:

- cuanto entro;
- cuanto salio;
- cuanto se midio;
- cuanto falta por explicar;
- que datos tienen baja cobertura;
- que frontera energetica merece investigacion.

Preguntas que debe delegar a Estudios:

- por que subio el consumo;
- que variable explica la desviacion;
- cual metrica representa mejor el area o equipo;
- que modelo de baseline es defendible;
- que accion o proyecto conviene abrir.

## Invariantes

- Balance moderno usa `balance-sheet-engine`, no calcula en React.
- Usa `measurement_readings` para hojas modernas y lecturas validadas para
  flujo legacy.
- El cálculo principal de UI usa E7 oficial: no calcula si no existe topologia
  publicada y version congelada.
- Cuando se use diagrama, debe guardar version publicada en
  `diagram_version_id`.
- Los rollups visuales de E6.5 (`e65_data`) no sustituyen
  `energy_balance_results` E7.
- Proteccion contra doble conteo en medidores anidados.
- Conversion explicita de unidades antes de sumar.
- No-explicado protegido contra valores negativos.
- Distinguir medido, estimado, calculado y faltante.

## Permisos

Visible para todos los usuarios autenticados.

## Integraciones

- Mapa: usa diagrama publicado para compilar grafo cuando aplica.
- Medicion: `measurement_readings` como input moderno.
- Estudios Energeticos: desviaciones, no explicado o comparaciones multi-utility
  pueden iniciar un estudio.
- EnPI: resultados alimentan indicadores o metricas candidatas.
- Acciones: desviaciones crean oportunidades.
- Cockpit: no-explicado como KPI de salud.
- SGEn: balances como evidencia.

## No hacer

- No calcular balance en React.
- No ejecutar balance graph-based sin diagrama publicado cuando exista uno.
- No sumar medidores con unidades incompatibles sin conversion.
- No ignorar doble conteo en medidores anidados.
- No convertir Balance en el workbench estadistico o creativo; usar Estudios.

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Cambio en balance-engine: `npm run build`.
