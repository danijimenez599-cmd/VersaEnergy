# Fase 3 — Mapa — Grafo Técnico MVP (React Flow)

> Nota documental: esta fase queda como referencia de construccion original.
> Para trabajo futuro usa `05_MASTER_IMPROVEMENT_PLAN.md`.

## Estado

✅ **Completada** — 2026-06-01

---

## Visión general

La Fase 3 implementa el **Mapa Energético y de Utilities** — el diferenciador central de VersaEnergy. El usuario dibuja redes de utilities como un **grafo técnico semántico** con React Flow, no como un dibujo decorativo.

---

## Arquitectura del módulo

```
src/modules/mapa/
  index.tsx                         ← Página principal (lista de diagramas + editor)
  canvas/
    EnergyUtilitiesCanvas.tsx        ← React Flow wrapper
    nodes/index.tsx                  ← 6 custom nodes por familia
    edges/UtilityEdge.tsx            ← Custom edge multi-canal
    hooks/useDiagramStore.ts         ← Zustand: nodes, edges, selección
    hooks/useDiagramPersistence.ts   ← CRUD Supabase: load, save, delete
  palette/NodePalette.tsx            ← Sidebar izquierdo con drag & drop
  inspector/InspectorPanel.tsx       ← Sidebar derecho (node + edge props)
```

### Canvas (`EnergyUtilitiesCanvas`)

- React Flow con grid (16px snap), zoom, pan, minimapa
- Drag & drop desde la paleta
- Conexiones entre nodos vía handles
- Selección de nodos/edges → abre inspector

### Custom Nodes (6 tipos por familia)

| Familia | Visual | Tipos |
|---------|--------|-------|
| Equipment | Rectángulo con header coloreado + icono | boiler, pump, compressor, chiller, tank, transformer, panel, generator, etc. |
| Connector | Círculo con punto central | pipe, duct, cable, busbar, header, manifold |
| Control | Círculo naranja | valve, breaker, regulator, control_valve, check_valve |
| Measurement | Círculo púrpura con icono | flow_meter, power_meter, pressure_sensor, temperature_sensor, etc. |
| Organizational | Rectángulo con borde dashed | area, process, production_line |
| Special | Rectángulo (verde=source, rojo=loss) | utility_source, loss_node, annotation |

Cada nodo muestra: icono + tipo + label + tag + utility badge + handles source/target.

### Custom Edge (`UtilityEdge`)

**Multi-canal visual** (NO solo color):
- **Color** por utility (azul=electricidad, púrpura=vapor, naranja=gas, teal=aire, cyan=agua)
- **Patrón de línea**: sólido (físico), dashed (gas/vapor), dotted (lógico)
- **Flecha de dirección**: source→target, bidireccional
- **Label**: tag o utility + símbolo de dirección
- Marcador SVG con color dinámico por utility

### NodePalette

7 grupos expandibles (Equipment, Conectores, Control, Medición, IoT, Organización, Especial).
Drag & drop nativo con `onDragStart` → `dataTransfer` → `onDrop` en el canvas.

### InspectorPanel

Panel derecho (256px) que se abre al seleccionar nodo/edge:
- **Nodo**: Tag, Label, Utility (select), Tipo, botón eliminar
- **Edge**: Tipo línea, Utility, Dirección, Tag, Label, Factor pérdida/fuga, botón eliminar

### Persistencia

- `energy_diagrams` — diagramas (nombre, site, utility, status)
- `energy_diagram_nodes` — posición + tipo + tag + properties
- `energy_diagram_edges` — source/target + edge_type + utility + flow_direction
- `energy_diagram_measurement_bindings` — vinculación MeasurementPoints futura
- Auto-guardado manual (botón "Guardar"), indicador "Sin guardar" cuando hay cambios

### Flujo de usuario
```
1. Seleccionar sitio → 2. Lista de diagramas → 3. Crear/Abrir diagrama →
4. Arrastrar nodos desde paleta → 5. Conectar con edges →
6. Editar propiedades en inspector → 7. Guardar
```

---

## Decisiones de diseño

1. **React Flow nativo, no wrapper pesado**: nodos son componentes React puros con `memo`
2. **Index signatures en tipos**: `DiagramNodeData` y `DiagramEdgeData` tienen `[key: string]: unknown` para compatibilidad con @xyflow/react
3. **Zustand store separado**: `useDiagramStore` para estado del canvas, `useDiagramPersistence` para Supabase
4. **Edges con estilo dinámico**: color + strokeWidth + strokeDasharray desde utility definition
5. **Drag & drop con dataTransfer**: sin dependencia de DnD Kit (suficiente para MVP)

---

## Build stats

- Módulo `mapa`: **67.22 KB gzipped** (incluye React Flow + Lucide icons)
- CSS del mapa: **2.56 KB gzipped**
- Migración 00005_diagrams.sql aplicada

## Criterios de aceptación

- [x] Canvas funcional con React Flow (zoom, pan, grid, minimapa)
- [x] Drag & drop desde paleta agrupada por 7 familias
- [x] 6 custom nodes con iconos y colores por familia
- [x] Custom edges con multi-canal (color + patrón + flecha + label)
- [x] Inspector lateral edita propiedades de nodo y edge
- [x] Guardar/cargar diagramas en Supabase
- [x] `npm run build` funciona
