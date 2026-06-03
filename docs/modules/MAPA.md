# Modulo: Mapa Energy & Utilities

> Ultima actualizacion: 2026-06-03.
> Plan de refactor activo: `docs/MAPA_SCADA_PLAN.md` — leer antes de tocar este modulo.

## Responsabilidad

Canvas de ingenieria para dibujar redes de utilities (unifilares electricos,
redes de vapor, aire comprimido, agua helada, gas). Es el corazon del
producto. Traduce el arbol de activos en un grafo semantico calculable con
nodos, edges, medidores vinculados, validaciones y versionado.

El modulo sigue un modelo inspirado en SCADA (OSIsoft PI Vision):
- **El diagrama es capa de presentacion** — muestra lo que el Modelo ya configuro.
- **El Modelo es la fuente de verdad** — fuentes de datos, roles y config de MPs.
- **Los medidores de proceso** aparecen inline en la tarjeta de su equipo.
- **Las burbujas ISA standalone** son solo para medidores de entrada sin equipo padre.

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/mapa/index.tsx` |
| Canvas React Flow | `src/modules/mapa/canvas/EnergyUtilitiesCanvas.tsx` |
| Paleta de nodos | `src/modules/mapa/palette/NodePalette.tsx` |
| Config de palette | `src/modules/mapa/palette/paletteConfig.ts` |
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
| Lecturas en vivo (nodos medidor) | `src/modules/mapa/canvas/hooks/useDiagramReadings.ts` |
| MPs de equipos en vivo | `src/modules/mapa/canvas/hooks/useEquipmentMPs.ts` |
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

## Fuentes de datos de MPs (source_type)

Los MeasurementPoints declaran su fuente en `measurement_points.source_type`.
El diagrama solo lee el icono — la config vive en el Modelo.

| source_type | Icono | Descripcion |
|-------------|-------|-------------|
| `manual` | ⌨ | Operador ingresa valor manualmente |
| `iot_db` | 📡 | Gateway IoT escribe a tabla Supabase |
| `api_pull` | 🔗 | Versa llama a endpoint externo periodicamente |
| `api_push` | 📥 | Sistema externo empuja datos a Versa |
| `file_import` | 📁 | CSV / Excel cargado periodicamente |
| `calculated` | ⚙ | Formula sobre otros MPs |

Fuentes NO soportadas (sin interfaz directa): Modbus, OPC-UA, MQTT, BACnet.

## Tipos de nodo del canvas

### Familia `measurement` — burbuja ISA standalone
Usada SOLO para medidores sin equipo padre en el arbol:
- Medidores de entrada al sitio (CFE, gas municipal, agua potable)
- Medidores virtuales/calculados independientes

Los medidores de proceso (caldera, compresor, chiller...) aparecen
automaticamente como indicadores inline en la tarjeta de su equipo.

### Familia `equipment`
Tarjeta con cabecera (icono + nombre + TAG) y seccion de MPs inline.
La seccion de MPs se pobla automaticamente desde `useEquipmentMPs`
consultando MPs con `target_type='equipment'` para el `entity_id` del nodo.

### Familias eliminadas del canvas (2026-06-03)
Las siguientes familias ya NO estan en la palette — su rol lo cumple
`source_type` en el Modelo:
- `iot_device`, `gateway`, `plc`, `rtu`, `edge_device`
- `virtual_point`, `api_source`, `manual_reading_source`

Nodos de esos tipos en diagramas legacy siguen renderizando como EquipmentNode
via fallback — no se rompen diagramas existentes.

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
- `00019_source_type_realistic.sql` — constraint source_type a 6 tipos reales.

## Flujo actual

1. Lista de diagramas con filtro por utility y estado (draft/publicado).
2. Crear diagrama nuevo con selector de utility y plantilla.
3. Canvas editable: drag-and-drop de nodos, conexion de edges.
4. Al arrastrar **equipo/area**: modal obligatorio de vinculacion al arbol.
5. Al arrastrar **medidor ISA**: modal de seleccion de MP (solo para standalone).
   - Los MPs de proceso son visibles inline en la tarjeta del equipo.
6. Inspector derecho: propiedades del nodo/edge seleccionado.
   - Nodo medidor: MP vinculado + icono de fuente + ancla (info) + rol.
   - Nodo equipo: specs + MPs inline en tiempo real.
7. Validar: ejecuta `validators.ts` y muestra issues en `ValidationPanel`.
8. Publicar: congela version, bloquea si hay errores criticos.
9. Clonar: crea draft desde version publicada.
10. Overlay de cobertura de medicion via `OverlayBar`.
11. Leyenda viva por utility.

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
- No volver a agregar nodos de infraestructura de datos a la palette
  (`iot_device`, `gateway`, `plc`, `virtual_point`, etc.) — la fuente
  de datos se configura en `source_type` del Modelo, no en el canvas.
- No configurar ancla de medidor con selects/chips en el Inspector —
  la ancla se define visualmente conectando el nodo en el canvas
  (Fase 3 del plan SCADA).
- No duplicar config de MPs en el diagrama que ya esta en el Modelo.

## Pendiente (ver MAPA_SCADA_PLAN.md)

| Fase | Descripcion | Estado |
|------|-------------|--------|
| 3a | Snap-to-edge al soltar medidor | Pendiente |
| 3b | Signal edge como ancla primaria | Pendiente |
| 3c | Rol auto-detectado del grafo | Pendiente |
| 4 | Ingreso manual inline desde inspector | Pendiente |
| 5 | MPs calculados con formula en Modelo | Pendiente |

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Cambio en topology-engine: `npm run build`.
- Cambio de migracion: verificar coherencia de nodos/edges.
