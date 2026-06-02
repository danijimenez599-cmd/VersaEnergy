# Fase 2 — Modelo + Utility Definitions + Standards + MeasurementPoints

## Estado

✅ **Completada** — 2026-06-01

---

## Visión general

La Fase 2 establece el **modelo de dominio completo** de VersaEnergy. Define QUÉ se puede dibujar y medir antes de implementar el canvas (Fase 3). Incluye el catálogo configurable de utilities, tipos de equipos por familia, catálogo de estándares (ISA-5.1, IEC 60617), y la entidad **MeasurementPoint** como entidad independiente.

---

## Arquitectura del módulo

### Tipos del dominio (`src/services/topology-engine/graphTypes.ts`)

Define todos los tipos TypeScript del grafo semántico:

| Categoría | Tipos |
|-----------|-------|
| **Utility** | `UtilityCategory`, `UtilityType` (16 utilities), `UtilityDefinition`, `UtilityEdgeStyle` |
| **Nodos** | `DiagramNodeType` (7 familias, 40+ tipos), `NodeFamily`, `DiagramNodeData` |
| **Edges** | `DiagramEdgeType` (pipe/cable/duct/busbar/signal/logical), `FlowDirection`, `DiagramEdgeData` |
| **Medición** | `MeasurementPoint`, `MeasurementType` (6 tipos), `MeasurementQuantity` (12 magnitudes), `MeasurementSource` (manual/iot/calculated), `AccumulatorConfig` |
| **Validación** | `ValidationSeverity`, `ValidationIssue` |
| **Estándares** | `StandardsProfile` |

### Tablas y migraciones

| Migración | Contenido | Filas seed |
|-----------|-----------|------------|
| `00002_utility_definitions.sql` | `utility_definitions` + `utility_units` + `equipment_types` | 16 utilities, 19 unidades, 35 tipos de equipo |
| `00003_standards.sql` | `standards_catalog` + `standard_tag_patterns` + `standard_symbols` | 6 estándares, 14 patrones ISA-5.1, 11 símbolos IEC 60617 |
| `00004_model.sql` | `energy_areas` + `utility_systems` + `energy_equipment` + `energy_sources` + `measurement_points` | 0 (CRUD desde UI) |

### Catálogo de Utility Definitions (16 utilities)

Cada utility define:
- `category`: fluid | gas | electrical | thermal | custom
- `default_unit`, `flow_units[]`, `energy_units[]`
- `allowed_node_types[]`, `allowed_meter_types[]`
- `line_color`, `line_stroke_width`, `line_stroke_dasharray` (para visualización en el canvas)

| Utility | Color | Línea |
|---------|-------|-------|
| electricidad | `#1e40af` azul | sólida 2px |
| vapor | `#7c3aed` púrpura | dash 8 4, 4px |
| gas natural | `#ea580c` naranja | dash 2 4, 3px |
| aire comprimido | `#0d9488` teal | sólida 3px |
| agua helada | `#06b6d4` cyan | sólida 3px |

### Catálogo de Equipos por Familia

7 familias, 35+ tipos, cada uno con:
- `tag_prefix` (ej: `B` para boiler, `T` para transformer, `FE/FQI` para flow meter)
- `compatible_utilities[]`
- `default_properties` JSONB
- `icon_name`

### MeasurementPoint Strategy

**Regla clave**: MeasurementPoint NO es un nodo visual. Es una entidad independiente que se vincula a:
- `node` → nodo del canvas (futuro)
- `edge` → conexión del canvas (futura)
- `system` → utility_system existente
- `area` → energy_area existente

Configuración:
- `source_config` JSONB: según `source_type` (manual/iot/calculated)
- `accumulator_config` JSONB: `{ multiplier, offset, allowNegativeDelta, resetDetection, rollover }`

### Vistas del módulo Modelo

6 pestañas con navegación por tabs:

| Tab | Vista | Funcionalidad |
|-----|-------|---------------|
| Utilities | `UtilityDefinitionsView` | Catálogo de referencia (solo lectura), cards con color de línea |
| Áreas | `AreasView` | CRUD tabla + modal, tag/código/descripción, jerarquía parent_area |
| Sistemas | `UtilitySystemsView` | CRUD tabla + modal, filtro por utility, badges de colores |
| Equipos | `EquipmentView` | CRUD tabla + modal, tag único por sitio, filtro utility, status |
| Fuentes | `SourcesView` | CRUD tabla + modal, source_type, utility |
| Medición | `MeasurementPointsView` | CRUD cards + modal, config de tipo/utility/unidad/source, JSON config |

**Site selector global**: selector de sitio en el header de la página. Filtra todos los datos. El tab Utilities es independiente de sitio (catálogo global).

### RLS y seguridad

Todas las políticas usan las funciones `get_my_company_id()` y `get_my_role()` definidas en `00000_initial.sql`:
- SELECT: usuarios ven datos de su company
- INSERT/UPDATE/DELETE: solo admin, engineer, manager
- Catálogos públicos (utility_definitions, standards, equipment_types): SELECT público, gestión admin

---

## Estructura de archivos

```
src/
  services/
    topology-engine/
      index.ts              ← Barrel export (todos los tipos)
      graphTypes.ts         ← 200+ líneas, tipos completos del dominio
  modules/
    modelo/
      index.tsx             ← Página principal con tabs + site selector
      views/
        AreasView.tsx        ← CRUD energy_areas
        UtilitySystemsView.tsx ← CRUD utility_systems
        EquipmentView.tsx    ← CRUD energy_equipment
        SourcesView.tsx      ← CRUD energy_sources
        MeasurementPointsView.tsx ← CRUD measurement_points + JSON config
        UtilityDefinitionsView.tsx ← Catálogo solo lectura

supabase/
  migrations/
    00002_utility_definitions.sql ← utility_definitions + units + equipment_types (seed)
    00003_standards.sql           ← standards_catalog + tag_patterns + symbols (seed)
    00004_model.sql               ← energy_areas, utility_systems, equipment, sources, measurement_points
```

---

## Decisiones de diseño

1. **MeasurementPoint como entidad independiente**: target_type + target_id permiten binding a cualquier entidad. El MeasurementPoint existe aunque no haya canvas (Fase 3). Las lecturas (Fase 5) se vinculan al MeasurementPoint, no al nodo visual.

2. **Utility definitions como catálogo configurable**: no hay hardcode en el frontend. Cualquier utility nueva se agrega vía SQL. Los colores, estilos de línea y tipos compatibles están en la BD.

3. **Tags únicos por sitio**: constraint `unique(site_id, tag)` en `energy_equipment` y `measurement_points`. Esto previene colisiones en el grafo semántico.

4. **ISA-5.1 como inspiración, no como restricción**: los patrones de tag están en la BD para consulta/referencia, pero no se validan automáticamente (se validan en Fase 4).

5. **Source config y accumulator config como JSONB**: flexibilidad total sin migraciones. La UI expone campos de texto JSON para usuarios avanzados.

6. **Site selector en el módulo Modelo**: los datos están scoped por site. El catálogo de utilities es global (compartido entre sites y companies).

---

## Criterios de aceptación

- [x] 16 utility definitions con seed data (categoría, unidad, línea, nodos compatibles)
- [x] 19 unidades registradas en utility_units
- [x] 35+ equipment types clasificados por 7 familias
- [x] Catálogo de estándares con ISA-5.1 (14 tag patterns) e IEC 60617 (11 symbols)
- [x] CRUD funcional para áreas, sistemas, equipos, fuentes
- [x] MeasurementPoint CRUD con target_type, source_config JSONB, accumulator_config JSONB
- [x] Navegación por tabs con filtro de utility type
- [x] RLS en todas las tablas (sin recursión infinita)
- [x] `npm run build` funciona
