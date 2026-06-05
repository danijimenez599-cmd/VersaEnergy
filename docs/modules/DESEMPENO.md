# Modulo: Desempeno Energetico

## Responsabilidad

Gestiona indicadores de desempeno energetico (EnPI), baselines, targets,
resultados historicos y analisis de variables significativas con regresion OLS.
Permite construir formulas, versionar baselines y comparar real vs baseline vs target.

Desempeno es la capa de gobierno de indicadores maduros. El modulo debe ser
ligero por defecto y reservar el analisis avanzado para Estudios o para un modo
avanzado. No todo ratio exploratorio debe convertirse en EnPI. El roadmap vivo
de EnPI/Estudios esta en `docs/ENERGY_ENGINEERING_BLUEPRINT.md` (E8).

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/desempeno/index.tsx` |
| Integracion con Estudios | `src/modules/desempeno/views/StudyLauncher.tsx` |
| Engine de estudios ES-2 | `src/services/energy-study-engine/` |
| Variables y regresion | `src/modules/desempeno/views/SignificantVariablesWorkbench.tsx` |
| Libreria estadistica | `src/lib/statistics.ts` |

## Modelo/Tablas

- `energy_enpis` — indicadores de desempeno (formula JSONB, utility, alcance, frecuencia y grupo principal).
- `energy_enpi_groups` — grupos/portfolios libres de EnPIs.
- `energy_enpi_group_members` — membresia multi-grupo de indicadores.
- `energy_enpi_variable_links` — relacion formal EnPI-variable con roles (`denominator`, `driver`, `adjustment`, `context`, `segmentation`, `exclusion`).
- `relevant_variables` — variables relevantes usadas por EnPIs y Estudios.
- `relevant_variable_readings` — lecturas de variables relevantes por frecuencia flexible.
- `energy_baselines` — baselines versionados con metodo y periodo de referencia.
- `energy_targets` — objetivos de mejora (absolute/percent_reduction/benchmark).
- `energy_performance_results` — resultados calculados por periodo (pendiente motor de calculo).
- `enpi_significant_variables` — variables significativas configuradas por EnPI.
- `enpi_variable_period_values` — valores de variable por periodo (X del modelo de regresion).
- `enpi_period_values` — valores del EnPI por periodo (Y del modelo de regresion).
- `energy_studies` — estudios energeticos persistentes.
- `energy_study_sources` — fuentes usadas por cada estudio.
- `energy_study_models` — modelos/metricas evaluadas en el estudio.
- `energy_study_findings` — hallazgos y brechas de datos.
- `energy_study_decisions` — decisiones tomadas desde el estudio.

Migraciones: `00009_enpis.sql`, `00018_enpi_significant_variables.sql`,
`00022_enpi_referential.sql`, `00023_energy_studies.sql`,
`00024_energy_study_decision_links.sql`,
`00034_e11_enpi_relevant_variables.sql`.

## Flujo actual

1. Header de gobierno de EnPIs.
2. Biblioteca filtrable por grupos/portfolios con grafico de tendencia (Recharts ComposedChart: barra desviacion + linea EnPI + linea target).
3. Modal `EnPIForm`: wizard de nuevo indicador con constructor visual de formula (numerador/denominador) o modo referencial. En modo referencial selecciona fuente energetica y variable relevante.
4. Modal `BaselineForm`: versionado automatico, metodo (promedio/regresion/manual), rango de periodo.
5. Modal `TargetForm`: tipos absolute/percent_reduction/benchmark; preview de valor calculado.
6. Boton **Variables**: abre `SignificantVariablesWorkbench` para la configuracion de variables y analisis.
7. Estudios Energeticos vive como modulo lateral propio (`/estudios`) y usa `StudyLauncher` como motor visual inicial.
8. ES-2: `StudyLauncher` delega el calculo a `src/services/energy-study-engine/`; React solo presenta selector, resultados y decisiones.
9. ES-3 a ES-8: el usuario puede guardar estudios, comparar modelos
   candidatos, usar playbooks tecnicos, promover a EnPI, crear acciones y
   generar evidencia SGEn.

## Doctrina ES-0: EnPI como metrica madura

Desempeno debe operar en dos niveles:

| Nivel | Usuario | Contenido |
|-------|---------|-----------|
| Basico | Operacion y gerencia | EnPI, baseline, target, tendencia, desviacion |
| Avanzado | Ingenieria energetica | variables, regresion, residuales, VIF, modelo |

Madurez de metricas:

| Nivel | Estado | Accion esperada |
|-------|--------|-----------------|
| L0 | Observacion | registrar hallazgo o abrir estudio |
| L1 | Metrica candidata | analizar en Estudios |
| L2 | EnPI operativo | crear/seguir en Desempeno |
| L3 | EnPI ajustado | vincular baseline/modelo |
| L4 | EnPI gobernado | target, owner, acciones y evidencia SGEn |

Reglas:

- un EnPI debe tener frontera, utility, unidad, formula/fuente y owner;
- un EnPI puede estar en multiples grupos para evitar bibliotecas inmanejables;
- si usa datos reales, el denominador canonico debe ser
  `denominator_type = 'relevant_variable'`;
- las variables relacionadas deben registrarse en `energy_enpi_variable_links`
  cuando actuen como denominador, driver, ajuste, contexto, segmentacion o
  exclusion;
- baseline debe ser versionado y defendible;
- target debe vincularse a periodo y objetivo;
- variables significativas deben tener explicacion fisica, no solo correlacion;
- modelos estadisticos deben mostrar advertencias de calidad y colinealidad;
- estudios exploratorios deben poder promover una metrica a EnPI.

Desempeno no debe convertirse en:

- sandbox libre de hipotesis sin trazabilidad;
- lista infinita de ratios no gobernados;
- sustituto del Centro de Estudios Energeticos;
- motor de calculos React-side.

## Relacion con Estudios Energeticos

El Centro de Estudios Energeticos no debe quedar enterrado dentro de Desempeno.
Desempeno gobierna indicadores maduros; Estudios gobierna preguntas tecnicas,
auditoria, expedientes, suficiencia de datos, hallazgos y decisiones. El modulo
visible para este dominio es `Estudios y auditoria Energetica` (`/estudios`).

`StudyLauncher` es la primera experiencia tecnica reutilizable para Estudios.
Usa datos reales existentes y persiste la trazabilidad del estudio:

- `measurement_points`;
- `energy_balance_sheets`;
- `energy_balance_results` via `computeEnPITrend`;
- `relevant_variables`;
- `relevant_variable_readings`;
- asset seleccionado desde `uiStore` cuando existe.

La logica de analisis y persistencia vive en `src/services/energy-study-engine/`:

- `resolveStudyCandidate` resuelve la serie energia / variable relevante;
- `calculateRatioStudy` calcula cobertura, periodos utiles, ultimo valor,
  cambio, confianza, hallazgos, advertencias y decisiones;
- `buildVariableCandidates` rankea drivers por cobertura, correlacion,
  estabilidad y plausibilidad fisica;
- `buildModelComparisons` prepara modelos ratio, banda estable, mejor periodo,
  regresion simple, CUSUM inicial y M&V guardian;
- `getStudyPlaybook` entrega guia tecnica por tipo de pregunta;
- `saveStudyCandidate` persiste estudio, fuentes, modelo, hallazgos y decision;
- `createQuickActionFromStudyCandidate` crea accion rapida desde estudios;
- `createProjectFromStudyCandidate` crea proyecto con detalle, fases y tareas
  base;
- `createSgenEvidenceFromStudyCandidate` crea snapshots SGEn;
- `listRecentStudies` recarga estudios guardados del sitio;
- el componente React no debe duplicar estos calculos.

Capacidades actuales del motor usado por Estudios:

- elegir tipo de pregunta: area/proceso, equipo, multi-utility, utility choice,
  pico, perdidas, baseline o M&V guardian;
- seleccionar frontera: planta, area, sistema o equipo;
- seleccionar fuente energetica: medidor o balance sheet;
- seleccionar variable relevante;
- calcular una metrica candidata energia / variable relevante;
- mostrar cobertura de datos, periodos utiles, ultimo valor, cambio vs periodo
  anterior y trazabilidad;
- rankear variables relevantes antes de promover un EnPI;
- comparar modelos candidatos con calidad, referencia y supuestos;
- mostrar playbook tecnico por tipo de estudio;
- abrir el flujo existente para promover la metrica a EnPI cuando hay datos
  suficientes, con borrador referencial precargado;
- guardar estudio persistente sin crear EnPI todavia;
- listar estudios recientes del sitio;
- crear decision `promote_enpi`, `request_measurement`,
  `create_quick_action`, `create_project` o `create_sgen_evidence`;
- conservar `scope_id`, `scope_label`, periodo, utility, confianza, modelos,
  hallazgos y target de decision.
- persistir `energy_study_variable_candidates` como memoria tecnica de por que
  se eligio o descarto un driver.

Limitaciones deliberadas:

- la regresion simple y CUSUM son iniciales; regresion multivariable queda como
  siguiente profundidad;
- aun no implementa detalle editable del estudio guardado.
- aun no navega desde Balance hacia un estudio prellenado.

## Variables significativas y analisis de regresion

El workbench tiene 3 fases:

### Fase 1: Variables
- Configurar las variables que se cree que explican el EnPI.
- Por variable: nombre, unidad, tipo (continua/discreta), metodo de agregacion, impacto esperado.
- **Tipo continua** (temperatura, humedad): sugiere promedio.
- **Tipo discreta** (produccion, lotes, defectos): sugiere suma.
- Vinculo opcional a punto de medicion para futura auto-agregacion.

### Fase 2: Datos de periodos
- Tabla de ingreso: una fila por periodo, columnas = EnPI + variables.
- Indicador de completitud por periodo (todos los campos vs faltantes).
- Upsert por periodo (si el periodo ya existe, actualiza).

### Fase 3: Analisis estadistico

#### Correlacion de Pearson (r)
- Calcula r entre cada variable y el EnPI.
- Escala visual de fuerza: muy fuerte (≥0.90), fuerte (≥0.70), moderada (≥0.50), debil (≥0.30).
- Detecta signo inconsistente con el impacto esperado del ingeniero.
- Alerta de multicolinealidad si dos variables tienen |r| > 0.80 entre si.

#### Regresion OLS
- **Simple**: una variable — formula cerrada, R², R² ajustado, SE, t-stat de pendiente.
- **Multiple**: varias variables — ecuaciones normales (X'X)β = X'y via eliminacion gaussiana con pivoteo parcial.
- Calculo de coeficientes, errores estandar, t-estadisticos y clasificacion de significancia.
- VIF (Factor de Inflacion de Varianza) para detectar multicolinealidad: VIF > 10 = severa, > 5 = moderada.
- Tabla de resultados: coeficiente, t-stat, significancia, VIF, interpretacion en lenguaje natural.
- Ecuacion del modelo con nombres reales de las variables.
- Verificacion visual de residuos (grafico de barras).
- Interpretacion guiada del R² con recomendacion operativa.

#### Significancias (t-test de dos colas)
- Umbrales interpolados de tabla t de Student (df-dependientes, conservadores).
- Categorias: muy significativo (p<0.01), significativo (p<0.05), marginal (p≈0.10), no significativo.

## Libreria estadistica (src/lib/statistics.ts)

Implementacion pura en TypeScript, sin dependencias externas.

| Funcion | Descripcion |
|---------|-------------|
| `pearsonR(x, y)` | Coeficiente de correlacion de Pearson |
| `simpleOLS(x, y)` | Regresion lineal simple OLS — slope, intercept, R², t-stat |
| `multipleOLS(X, y)` | Regresion multiple OLS via ecuaciones normales con eliminacion gaussiana |
| `correlationMatrix(series)` | Matriz de correlacion N x N |
| `interpretR(r)` | Etiqueta y color para el valor de r |
| `interpretR2(r2, n, k)` | Calidad del ajuste con consejo operativo |
| `interpretVIF(vif)` | Evaluacion de multicolinealidad |
| `significanceLabel(s)` | Texto y color para nivel de significancia |

## Brechas conocidas

- `energy_performance_results` nunca se escribe (no existe motor de calculo de formula EnPI).
  Los datos de regresion se capturan en `enpi_period_values` como solucion operativa temporal.
- La auto-agregacion desde lecturas de medidores vinculados no esta implementada aun.
- El workbench avanzado de variables debe migrar gradualmente hacia Estudios o
  quedar como modo avanzado, para que la vista principal de EnPI sea mas ligera.

## Invariantes

- No usar `prompt()` para capturar datos.
- No calcular EnPI automaticamente en React (sin motor de formula).
- Baseline versionado: cada cambio crea version nueva.
- La libreria estadistica no tiene dependencias externas — no introducir `simple-statistics` ni `ml-regression` sin revision.

## Permisos

Visible para todos los usuarios autenticados.

## Integraciones

- Balances: datos de consumo para calcular EnPI o metricas candidatas.
- Estudios Energeticos: estudios maduros pueden promover metricas a EnPI,
  crear baseline y proponer variables significativas.
- Acciones: desviaciones crean oportunidades de mejora.
- SGEn: EnPIs como evidencia y vinculo de objetivos.
- Cockpit: EnPI en desviacion como alerta de desempeno.

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Al modificar `statistics.ts`: verificar con casos de prueba manuales (regresion con datos conocidos).
