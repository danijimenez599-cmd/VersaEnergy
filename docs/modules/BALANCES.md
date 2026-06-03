# Modulo: Balances

## Responsabilidad

Ejecuta balances de energia por utility usando el grafo semantico, versiones
publicadas de diagrama y lecturas validadas. Responde: cuanto entro, cuanto se
consumio, cuanto se perdio, cuanto no se puede explicar.

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/balances/index.tsx` |
| Motor de balances | `src/services/balance-engine/` |

## Modelo/Tablas

- `energy_balances` — resultados de balance guardados.
- `energy_diagram_versions` — version de diagrama usada.
- `energy_readings_validated` — lecturas como input.
- `measurement_points` — medidores de frontera.

Migracion: `00008_balances.sql`.

## Flujo actual

1. Wizard de 3 pasos: Configurar -> Revisar datos -> Resultado.
2. Configurar: sitio, utility, periodo, version de diagrama.
3. Revisar datos: medidores disponibles, cobertura, gaps detectados.
4. Resultado: barra visual (entrada / medido / no-explicado), tabla por nodo.
5. Soporte de supuestos de simulacion (perdidas tecnicas, fugas estimadas).
6. Se guarda `diagram_version_id` para trazabilidad.
7. CTA cruzado: si no-explicado > 5%, banner con boton "Crear oportunidad"
   que navega a Acciones.

## Invariantes

- Balance usa `balance-engine`, no calcula en React.
- Usa lecturas validadas, no raw.
- Guarda version de diagrama.
- Proteccion contra doble conteo en medidores anidados.
- Conversion explicita de unidades antes de sumar.
- No-explicado protegido contra valores negativos.
- Distinguir medido, estimado, calculado y faltante.

## Permisos

Visible para todos los usuarios autenticados.

## Integraciones

- Mapa: usa diagrama publicado para compilar grafo.
- Medicion: lecturas validadas como input.
- EnPI: resultados alimentan indicadores.
- Acciones: desviaciones crean oportunidades.
- Cockpit: no-explicado como KPI de salud.
- SGEn: balances como evidencia.

## No hacer

- No calcular balance en React.
- No ejecutar balance sin diagrama publicado cuando exista uno.
- No sumar medidores con unidades incompatibles sin conversion.
- No ignorar doble conteo en medidores anidados.

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Cambio en balance-engine: `npm run build`.
