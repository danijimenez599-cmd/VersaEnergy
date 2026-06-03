# Modulo: Desempeno Energetico

## Responsabilidad

Gestiona indicadores de desempeno energetico (EnPI), baselines, targets y
resultados. Permite construir formulas, versionar baselines y comparar real vs
baseline vs target con desviaciones accionables.

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/desempeno/index.tsx` |

## Modelo/Tablas

- `energy_enpis` — indicadores de desempeno.
- `energy_baselines` — baselines versionados.
- `energy_targets` — objetivos.
- `energy_performance_results` — resultados calculados.

Migracion: `00009_enpis.sql`.

## Flujo actual

1. Cards expandibles con grafico de tendencia (Recharts AreaChart).
2. Modal `EnPIForm`: wizard de nuevo indicador con constructor visual de
   formula (numerador/denominador).
3. Modal `BaselineForm`: versionado automatico, metodo (promedio/regresion/
   manual), rango de periodo.
4. Modal `TargetForm`: tipos absolute/percent_reduction/benchmark; preview de
   valor calculado en tiempo real.
5. Historial de baselines visible en card expandido.
6. Desviaciones accionables: boton "Crear accion" visible cuando hay
   desviacion sostenida.

## Invariantes

- No usar `prompt()` para baseline/target.
- Formula visible y validada.
- Baseline versionado: cada cambio crea version nueva.
- Desviaciones deben tener accion navegable.
- EnPI no se calcula en React.

## Permisos

Visible para todos los usuarios autenticados.

## Integraciones

- Balances: datos de consumo para calcular EnPI.
- Acciones: desviaciones crean oportunidades.
- SGEn: EnPIs como evidencia de gestion.
- Cockpit: EnPI en desviacion como alerta.

## No hacer

- No usar `prompt()` para capturar datos.
- No calcular EnPI en React.
- No crear EnPI sin declarar utility, alcance y formula.

## Verificacion recomendada

- Cambio frontend: `npm run build`.
