# Modulo: Mapa Energy & Utilities

> Ultima actualizacion: 2026-06-05.
> Refactor SCADA Fases 0-5, diagramas jerarquicos HD-0..HD-6 y E6.5-data
> completados. E12 Diagram Workspace 2.0 completado.
> Roadmap vivo: `docs/ENERGY_ENGINEERING_BLUEPRINT.md`.

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
| Modulo UI (entry) — galeria + canvas libre | `src/modules/mapa/index.tsx` |
| **Lente operativo "Diagramas" (HD-2..4 + E12 workspace)** | `src/modules/mapa/DiagramaLens.tsx` |
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
| **Generador de esqueleto desde arbol (HD-4)** | `src/services/diagramSkeleton.ts` |
| Summary E6.5 de bloques hijo | `src/services/topology-engine/e65GroupSummaries.ts` |

### Nodos jerarquicos (HD-1)

| node_type | Componente | Proposito |
|-----------|-----------|-----------|
| `child_block` | `ChildBlockNode.tsx` | Bloque hijo clickeable para drill-down; lleva `child_scope_id` |
| `port_in` | `PortNode.tsx` | Entrada de utility desde el nivel padre; click → drill-up |
| `port_out` | `PortNode.tsx` | Salida de utility hacia el nivel padre |

Properties JSONB esperadas/presentadas:

```
child_block: { child_scope_type, child_scope_id, child_name, utilities[] }
child_block recomendado: { energy_group_id } cuando el bloque representa un grupo Energy conocido
port_in:     { utility, source_label, parent_scope_type, parent_scope_id? }
port_out:    { utility, dest_label }
```

Overlay transitorio E6.5:

```
child_block.properties.e65_data = {
  source: 'energy_group',
  energy_group_id,
  group_type,
  utility_type,
  measurement_summary: {
    boundary_value,
    submeter_value,
    residual_value,
    coverage_percent,
    unit,
    mixed_units
  },
  boundary_meters[],
  submeters[],
  children_preview[]
}
```

`e65_data` se calcula al cargar el diagrama desde `energy_groups`,
`energy_measurement_bindings`, `measurement_points` y `measurement_readings`.
No es mock, fixture ni dato hardcodeado del componente. No se persiste al
guardar, publicar o versionar; se elimina antes de escribir el diagrama. Es
preview operacional calculado desde Supabase; el balance oficial y rollups
auditables quedan para E7.

Regla de matching:
- Si el `child_block` trae `energy_group_id`, ese grupo manda.
- Si no lo trae, el loader intenta resolver por `scope_type/scope_id`.
- Si hay varios grupos bajo el mismo scope, se prefiere la utility del bloque.
- Si no hay identidad explicita ni scope confiable, no se inventan numeros.

### Vinculacion al arbol (HD-0)

`energy_diagrams` tiene columnas `scope_type` + `scope_id` (migracion 00025):
- `scope_type`: `site | area | system | equipment`
- `scope_id`: UUID del nodo del arbol

Busqueda: `loadDiagramByScope(siteId, scopeType, scopeId)` en `useDiagramPersistence`.

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
- `energy_measurement_bindings` — binding formal de MeasurementPoints a
  assets, grupos Energy, nodos/edges, formulas o fuentes externas.
- `energy_scope_exceptions` — excepciones de alcance/topologia sin alterar el
  arbol CMMS.

Migraciones:
- `00005_diagrams.sql` — tablas de diagramas.
- `00006_topology_engine.sql` — issues de validacion.
- `00013_diagram_versions.sql` — versionado.
- `00019_source_type_realistic.sql` — constraint source_type a 6 tipos reales.
- `00025_hierarchical_diagrams.sql` — `scope_type` + `scope_id` para drill-down.
- `00028_e3_energy_satellite_schema.sql` — semantica topologica, bindings y
  excepciones Energy.
- `00035_e12_diagram_workspace.sql` — clasificacion de diagramas por
  `diagram_type`, `view_preset`, scope ampliado y metadata de workspace.

## Flujo actual

1. `/diagrama` es el lente operativo principal del sidebar:
   - muestra Workspace lateral persistente;
   - lista diagramas por estado/tipo;
   - abre vistas existentes;
   - crea nuevas vistas guardadas sin duplicar activos ni medidores.
2. `/mapa` es el editor completo:
   - galeria visual;
   - templates;
   - palette;
   - inspector;
   - validacion/publicacion/versionado.
3. Lista de diagramas con filtro por tipo, estado y utility cuando aplica.
4. Crear diagrama nuevo con tipo, utility principal, lente inicial y scope.
5. Canvas editable: drag-and-drop de nodos, conexion de edges.
6. Al arrastrar **equipo/area**: modal obligatorio de vinculacion al arbol.
7. Al arrastrar **medidor ISA**: modal de seleccion de MP (solo para standalone).
   - Los MPs de proceso son visibles inline en la tarjeta del equipo.
8. Inspector derecho: propiedades del nodo/edge seleccionado.
   - Nodo medidor: MP vinculado + icono de fuente + ancla (info) + rol.
   - Nodo equipo: specs + MPs inline en tiempo real.
   - Acciones: crear diagrama hijo, crear balance de frontera, crear estudio
     energetico o ir a ficha de equipo.
9. Validar: ejecuta `validators.ts` y muestra issues en `ValidationPanel`.
10. Publicar: congela version, bloquea si hay errores criticos.
11. Clonar: crea draft desde version publicada.
12. Overlay de cobertura de medicion via `OverlayBar`.
13. Leyenda viva por utility.

## Diagram Workspace 2.0 (E12)

`energy_diagrams` ya no se trata como una lista plana de canvases. Cada fila es
una vista guardada del mismo modelo topologico.

Campos E12:

| Campo | Uso |
|-------|-----|
| `diagram_type` | Proposito de la vista: `overview`, `utility`, `boundary`, `group`, `equipment`, `generated`, `custom`. |
| `view_preset` | Lente inicial: `macro`, `technical`, `balance`, `audit`. |
| `workspace_notes` | Nota humana opcional para organizar vistas. |
| `metadata` | Preferencias de presentacion, origen de generacion y hints AI. |

Tipos de diagrama:

| Tipo | Uso recomendado |
|------|-----------------|
| `overview` | Planta completa, fuentes y agrupadores principales. |
| `utility` | Flujo tecnico por utility. |
| `boundary` | Frontera cerrada para balance, cobertura y residual. |
| `group` | Diagrama hijo de nave, area, proceso, sistema o energy group. |
| `equipment` | Detalle de equipo mantenible, conversion o activo critico. |
| `generated` | Esqueleto preliminar creado desde arbol/datos para revision. |
| `custom` | Vista libre de analisis o comunicacion. |

Reglas:

- Crear un diagrama crea una vista, no crea activos fisicos.
- `diagram_type` no reemplaza `scope_type`; el primero explica el proposito,
  el segundo indica a que parte del modelo se ancla.
- El filtro de utility del canvas no debe ocultar la biblioteca completa de
  diagramas; el Workspace filtra por estado y tipo.
- `generated` no se publica sin revision humana.
- Los scopes validos son `site`, `area`, `system`, `equipment`,
  `energy_group`, `asset` y `custom`.
- El lente `Macro` debe reducir ruido visual: `child_block` muestra cobertura
  compacta y equipos resumen MPs en lugar de desplegarlos todos.
- El lente `Tecnico` muestra el detalle operativo.
- El lente `Balance` enfoca fronteras, medidores y nodos relevantes para
  calculo.

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
  (comportamiento SCADA-3 ya implementado).
- No duplicar config de MPs en el diagrama que ya esta en el Modelo.

## Flujo DiagramaLens (HD-2..4)

La ruta `/diagrama` muestra el diagrama del activo seleccionado en el arbol:

1. Selecciona activo en el arbol → lente lee `selectedAssetType + selectedAssetSourceId`.
2. Mapea `plant→site, area→area, system→system, equipment→equipment`.
3. `loadDiagramByScope(siteId, scopeType, scopeId)` busca en `energy_diagrams`.
4. Si existe → canvas con toolbar, Workspace lateral, lentes y acceso al editor.
5. Si no existe → empty state con dos CTAs:
   - **"Generar desde arbol"** (site/area): crea esqueleto automatico con
     child_blocks para sub-areas y port_in por utility detectada.
   - **"Abrir editor"**: ruta `/mapa` para crear manualmente.

E12 agrega:

- Workspace lateral colapsable en `/diagrama`.
- Boton `Nuevo` en toolbar y boton `Nuevo diagrama` en Workspace.
- Modal con tipo de diagrama, utility, lente y scope.
- Abrir diagrama desde Workspace actualiza el canvas y el lente inicial.
- `/mapa` sigue siendo el editor completo para dibujo fino y plantillas.

### Drill-down (HD-3)

- Click en `child_block` → `handleDrillDown` → `loadDiagramByScope` para el hijo
  + `setSelectedAsset` (arbol navega al nodo hijo) + push al `scopeStack`.
- Click en `port_in` → `handleDrillUp` → diagrama del frame anterior en el stack.
- Barra oscura sobre el canvas: `Home > Nave A > Area A1` — cada crumb es clickeable.
- `drillingToRef` previene que el useEffect reinicie el stack en navegacion interna.
- Clic externo en el arbol limpia el stack.

### Generador de esqueleto (HD-4)

`generateSkeleton(input)` en `src/services/diagramSkeleton.ts`:
- Para `scope=site`: child_blocks de todas las areas de nivel 0 (sin port_in).
- Para `scope=area`: port_in por cada utility en equipos directos + child_blocks
  para sub-areas; si no hay sub-areas, nodos de equipo directamente.
- Mapea `equipment_type` (espanol/ingles) a tipos de nodo del canvas.
- `DiagramaLens.handleGenerateSkeleton`: hace las queries, llama al generador,
  crea el diagrama en Supabase con scope y carga el resultado.

## Fases SCADA completadas

| Fase | Descripcion | Estado |
|------|-------------|--------|
| 3a | Snap-to-edge al soltar medidor | Completa |
| 3b | Signal edge como ancla primaria | Completa |
| 3c | Rol auto-detectado del grafo | Completa |
| 4 | Ingreso manual inline desde inspector | Completa |
| 5 | MPs calculados con formula en Modelo | Completa |

## Fases HD completadas

| Fase | Descripcion | Estado |
|------|-------------|--------|
| HD-0 | Schema scope_type/scope_id + seed planta industrial (4 diagramas, 18 meses) | Completa |
| HD-1 | ChildBlockNode + PortNode + loadDiagramByScope + Explorador en /mapa | Completa |
| HD-2 | Ruta /diagrama + lente DiagramaLens en asset detail | Completa |
| HD-3 | Drill-down con breadcrumb + sincronizacion con arbol | Completa |
| HD-4 | Generador de esqueleto desde arbol (generateSkeleton) | Completa |
| HD-5 | Semaforo en vivo en child_blocks (banda lateral + badge tiempo + dot) | Completa |
| HD-6 | Sincronizacion bidireccional arbol ↔ diagrama (icono Network + highlight) | Completa |
| E12 | Diagram Workspace 2.0 en /diagrama y /mapa + lentes compactos | Completa |

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Cambio en topology-engine: `npm run build`.
- Cambio de migracion: verificar coherencia de nodos/edges.
- Cambio E12: `supabase db reset` y verificacion visual en `/diagrama`:
  Workspace visible, filtros de estado/tipo, modal de creacion y lente Macro.
