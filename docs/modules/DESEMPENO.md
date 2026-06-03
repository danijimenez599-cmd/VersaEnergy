# Modulo: Desempeno Energetico

## Responsabilidad

Gestiona indicadores de desempeno energetico (EnPI), baselines, targets,
resultados historicos y analisis de variables significativas con regresion OLS.
Permite construir formulas, versionar baselines y comparar real vs baseline vs target.

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/desempeno/index.tsx` |
| Variables y regresion | `src/modules/desempeno/views/SignificantVariablesWorkbench.tsx` |
| Libreria estadistica | `src/lib/statistics.ts` |

## Modelo/Tablas

- `energy_enpis` — indicadores de desempeno (formula JSONB, utility, alcance, frecuencia).
- `energy_baselines` — baselines versionados con metodo y periodo de referencia.
- `energy_targets` — objetivos de mejora (absolute/percent_reduction/benchmark).
- `energy_performance_results` — resultados calculados por periodo (pendiente motor de calculo).
- `enpi_significant_variables` — variables significativas configuradas por EnPI.
- `enpi_variable_period_values` — valores de variable por periodo (X del modelo de regresion).
- `enpi_period_values` — valores del EnPI por periodo (Y del modelo de regresion).

Migraciones: `00009_enpis.sql`, `00018_enpi_significant_variables.sql`.

## Flujo actual

1. Cards expandibles con grafico de tendencia (Recharts ComposedChart: barra desviacion + linea EnPI + linea target).
2. Modal `EnPIForm`: wizard de nuevo indicador con constructor visual de formula (numerador/denominador).
3. Modal `BaselineForm`: versionado automatico, metodo (promedio/regresion/manual), rango de periodo.
4. Modal `TargetForm`: tipos absolute/percent_reduction/benchmark; preview de valor calculado.
5. Boton **Variables**: abre `SignificantVariablesWorkbench` para la configuracion de variables y analisis.

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

## Invariantes

- No usar `prompt()` para capturar datos.
- No calcular EnPI automaticamente en React (sin motor de formula).
- Baseline versionado: cada cambio crea version nueva.
- La libreria estadistica no tiene dependencias externas — no introducir `simple-statistics` ni `ml-regression` sin revision.

## Permisos

Visible para todos los usuarios autenticados.

## Integraciones

- Balances: datos de consumo para calcular EnPI (pendiente motor).
- Acciones: desviaciones crean oportunidades de mejora.
- SGEn: EnPIs como evidencia y vinculo de objetivos.
- Cockpit: EnPI en desviacion como alerta de desempeno.

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Al modificar `statistics.ts`: verificar con casos de prueba manuales (regresion con datos conocidos).
