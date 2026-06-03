# Modulo: Inicio (Cockpit)

## Responsabilidad

Cabina operacional del sitio. Muestra KPIs de energia, alertas accionables,
estado de utilities, acciones pendientes y tendencias. Funciona como punto de
entrada para que el usuario entienda la salud energetica del sitio y sepa que
modulo necesita atencion.

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| UI completa | `src/modules/inicio/index.tsx` |
| Motor de KPIs | `src/services/cockpit.ts` |
| Store | `src/store/uiStore.ts` (contexto global) |

## Modelo/Tablas

El cockpit no tiene tabla propia. Lee de:

- `energy_balances` — consumo, no explicado, cobertura.
- `energy_enpis`, `energy_baselines`, `energy_targets` — desempeno.
- `energy_improvements` — acciones y proyectos.
- `measurement_points`, `energy_readings_validated` — calidad de datos.
- `energy_diagrams` — estado de diagramas.
- `utility_definitions` — catalogo de utilities.

## Flujo actual

1. Carga KPIs desde `src/services/cockpit.ts` usando el contexto global
   (sitio, utility, periodo).
2. Presenta 5 tabs operacionales: Ahora, Utilities, Riesgo, Acciones, Tendencias.
3. Cada alerta incluye accion navegable al modulo correcto.
4. Los calculos de KPI, cobertura, alertas y estado de modulos se ejecutan en
   `cockpit.ts`, no en React.

## Invariantes

- Toda logica de negocio vive en `src/services/cockpit.ts`.
- Los KPIs deben respetar el contexto global (sitio + utility + periodo).
- Alertas deben tener accion navegable.
- Empty states deben explicar el siguiente paso.

## Permisos

Visible para todos los usuarios autenticados del sitio.

## Integraciones

- Balances: consumo, no explicado.
- EnPI: desviaciones vs baseline.
- Acciones: pendientes y cerradas.
- Medicion: calidad de datos, cobertura.
- Mapa: estado de diagramas.

## No hacer

- No poner logica de calculo en React.
- No crear KPIs decorativos sin accion operacional.
- No ignorar el contexto global al consultar datos.

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Cambio en `cockpit.ts`: `npm run build`.
