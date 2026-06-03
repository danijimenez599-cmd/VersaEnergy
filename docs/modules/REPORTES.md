# Modulo: Reportes

## Responsabilidad

Genera salidas profesionales para energia, operaciones, gerencia y SGEn.
Incluye PDF, CSV y exportaciones de datos y diagramas.

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/reportes/index.tsx` |

Dependencia: `@react-pdf/renderer` (instalada, pendiente de conexion real).

## Modelo/Tablas

Pendiente: `energy_generated_reports` (historial de reportes).

## Flujo actual

1. Pagina funcional interactiva con builder de reportes.
2. Selector de tipo: Informe mensual, Balance, EnPI, Acciones, Paquete SGEn.
3. Selector de periodo, sitio, utility.
4. Secciones incluidas configurable con checkboxes.
5. Botones: Vista previa, Generar PDF, Exportar CSV.

Estado actual: las exportaciones son mock (no usan `@react-pdf/renderer`
real). La UI esta lista; falta conectar al motor de render.

## Invariantes

- Cada reporte indica periodo, utility, sitio, fuente y calidad.
- Datos estimados se marcan.
- Balances indican version de diagrama.
- Reportes SGEn no contienen texto ISO propietario.
- No generar reportes decorativos sin datos reales.

## Permisos

Visible para todos los usuarios autenticados.

## Integraciones

- Todos los modulos: reportes consumen datos de cada uno.
- SGEn: paquete de evidencia.

## No hacer

- No incluir texto ISO en reportes SGEn.
- No generar PDF sin datos reales (cuando el motor este conectado).

## Verificacion recomendada

- Cambio frontend: `npm run build`.
