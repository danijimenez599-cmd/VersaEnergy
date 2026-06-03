# Modulo: Mapa Energy & Utilities

## Responsabilidad

Canvas de ingenieria para dibujar redes de utilities (unifilares electricos,
redes de vapor, aire comprimido, agua helada, gas). Es el corazon del
producto. Traduce el arbol de activos en un grafo semantico calculable con
nodos, edges, medidores vinculados, validaciones y versionado.

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/mapa/index.tsx` |
| Canvas React Flow | `src/modules/mapa/canvas/EnergyUtilitiesCanvas.tsx` |
| Paleta de nodos | `src/modules/mapa/palette/NodePalette.tsx` |
| Inspector principal | `src/modules/mapa/inspector/InspectorPanel.tsx` |
| Panel de validacion | `src/modules/mapa/inspector/ValidationPanel.tsx` |
| Resumen de diagrama | `src/modules/mapa/inspector/DiagramSummaryPanel.tsx` |
| Historial de versiones | `src/modules/mapa/inspector/VersionHistoryPanel.tsx` |
| Leyenda | `src/modules/mapa/canvas/MapLegend.tsx` |
| Barra de overlays | `src/modules/mapa/canvas/OverlayBar.tsx` |
| Auto-layout | `src/modules/mapa/canvas/autoLayout.ts` |
| Scope de medidores | `src/modules/mapa/canvas/meterScopePreview.ts` |
| Plantillas por utility | `src/modules/mapa/DiagramTemplates.ts` |
| Persistencia | `src/modules/mapa/canvas/hooks/useDiagramPersistence.ts` |
| Store de diagrama | `src/modules/mapa/canvas/hooks/useDiagramStore.ts` |
| Servicio versiones | `src/services/diagramVersions.ts` |

### Topology Engine (servicios puros)

| Responsabilidad | Archivo |
|-----------------|---------|
| Tipos del grafo | `src/services/topology-engine/graphTypes.ts` |
| Compilador canvas->grafo | `src/services/topology-engine/compiler.ts` |
| Validaciones | `src/services/topology-engine/validators.ts` |
| Queries de grafo | `src/services/topology-engine/graphQueries.ts` |
| Reglas por utility | `src/services/topology-engine/utilityRules.ts` |
| Conversion de unidades | `src/services/topology-engine/unitConversion.ts` |
| Versionado | `src/services/topology-engine/topologyVersioning.ts` |
| Serializacion | `src/services/topology-engine/serialization.ts` |
| Meter binding | `src/services/topology-engine/meterBinding.ts` |

## Modelo/Tablas

- `energy_diagrams` — diagrama principal.
- `energy_diagram_versions` — versiones publicadas congeladas.
- `energy_diagram_nodes` — nodos del canvas.
- `energy_diagram_edges` — edges del canvas.
- `energy_topology_validation_issues` — issues de validacion.

Migraciones:
- `00005_diagrams.sql` — tablas de diagramas.
- `00006_topology_engine.sql` — issues de validacion.
- `00013_diagram_versions.sql` — versionado.

## Flujo actual

1. Lista de diagramas con filtro por utility y estado (draft/publicado).
2. Crear diagrama nuevo con selector de utility y plantilla.
3. Canvas editable: drag-and-drop de nodos, conexion de edges.
4. Al arrastrar equipo/medidor: modal obligatorio de vinculacion al arbol.
5. Inspector derecho muestra propiedades del nodo/edge seleccionado.
6. Validar: ejecuta `validators.ts` y muestra issues en `ValidationPanel`.
7. Publicar: congela version, bloquea si hay errores criticos.
8. Clonar: crea draft desde version publicada.
9. Overlay de cobertura de medicion via `OverlayBar`.
10. Leyenda viva por utility.

## Invariantes

- **Grafo-first**: el mapa almacena nodos/edges/semantica, nunca SVG plano.
- Versiones publicadas son inmutables; editar requiere clonar.
- Los balances guardan `diagram_version_id`.
- Edges DEBEN mostrar: color + patron de linea + etiqueta + flecha + tooltip.
- Nunca solo color para identificar utility.
- Equipos y medidores requieren `asset_binding` / `measurement_binding`
  (regla R13 bloquea publicacion sin enlace).
- Conectores y controles pueden existir sin enlace al arbol.
- Medidor visual → enlazado a equipo medidor + MeasurementPoint.
- Aristas fisicas (`cable`, `busbar`, `pipe`, `duct`) separadas de
  anotaciones (`signal`, `logical`).
- Calculos y compilacion en `src/services/topology-engine/`, no en React.

## Permisos

Visible para todos los usuarios autenticados.
Editar/publicar/clonar requiere permisos de escritura.

## Integraciones

- Equipos: nodos vinculados al arbol via `asset_binding`.
- Medicion: MeasurementPoints vinculados via `measurement_binding`.
- Balances: usa diagrama publicado + grafo compilado + lecturas.
- Cockpit: estado de diagramas para KPIs.

## No hacer

- No almacenar SVG/canvas plano como verdad.
- No crear equipos desde el mapa sin vincular al arbol.
- No usar color solo para distinguir utilities.
- No poner logica de compilacion/validacion en React.
- No publicar diagrama con equipos/medidores sin enlace.

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Cambio en topology-engine: `npm run build`.
- Cambio de migracion: verificar coherencia de nodos/edges.
