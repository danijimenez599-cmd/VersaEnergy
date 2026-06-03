# Mapa — Refactor SCADA-inspired
> Archivo de control de fases. Leer antes de tocar cualquier cosa del módulo Mapa o Modelo.
> Actualizar el estado de cada tarea al completarla.

---

## Decisiones de arquitectura (bloqueadas — no revertir)

| Decisión | Razón |
|---|---|
| Diagrama = capa de presentación (como PI Vision) | No reconfigura, solo muestra |
| Modelo = capa de configuración (como PI AF) | Una sola fuente de verdad |
| Fuentes realistas: `manual`, `iot_db`, `api_pull`, `api_push`, `file_import`, `calculated` | No hay interfaz Modbus/OPC-UA/MQTT directo |
| Nodos de infraestructura fuera del diagrama | `iot_device`, `gateway`, `plc`, `rtu`, etc. van al Modelo |
| Medidor en diagrama = instrumento físico solamente | La burbuja ISA representa el instrumento, no la fuente de datos |
| Ancla = derivada del edge de señal (ETAP-like) | El usuario conecta visualmente, no configura en panel |
| Rol = auto-detectado del grafo, override manual | Sin menú obligatorio de frontera/submedidor |
| MP binding = ÚNICA config del diagrama para medidores | Solo "¿qué tag representa esta burbuja?" |

---

## Modelo de fuentes de datos

```
source_type     ícono   descripción
──────────────────────────────────────────────────────
manual          ⌨       Operador ingresa valor manualmente
iot_db          📡      Dispositivo IoT escribe a tabla Supabase/SQL
api_pull        🔗      Versa llama a endpoint externo periódicamente
api_push        📥      Sistema externo empuja datos a endpoint de Versa
file_import     📁      CSV / Excel cargado periódicamente
calculated      ⚙       Fórmula sobre otros MPs (suma, promedio, etc.)
```

Config por fuente vive en `measurement_points.source_config` (jsonb).
El diagrama solo lee el `source_type` para mostrar el ícono. Nada más.

---

## Lo que ya existe y sirve de base

- `edgeType: 'signal'` en graphTypes — ya modelado
- `measuredNodeFromSignalEdge()` en meterBinding.ts — ya implementado
- `diagramStatus: draft | published` — ya existe (draft = editable, published = solo lectura)
- `measurement_engine/quality.ts` — calcula calidad del dato, el diagrama solo lo muestra
- `MeasurementPointsView.tsx` — el form del Modelo donde agregar source_type

---

## Estado de fases

### ✅ Fase 0 — Mejoras UX inmediatas
Mejoras sobre la UI anterior mientras se define la arquitectura final.

- [x] Modal de colocación de medidor: lista de MPs directa (no equipment picker)
- [x] Modal: selector de rol (Frontera / Submedidor) como tarjetas grandes
- [x] Modal: opción "Colocar sin MP — configurar después"
- [x] MeasurementTab Inspector: sección MP vinculado con card compacta
- [x] MeasurementTab Inspector: rol como 2 botones toggle
- [x] MeasurementTab Inspector: modal de cambio de MP con búsqueda
- [x] MeasurementTab Inspector: chips de ancla → reemplazados por info-only en Fase 2c
- [ ] Snap-to-edge al soltar medidor cerca de un cable → Fase 3a

---

### ✅ Fase 1 — Palette limpia + source_type en Modelo
**Objetivo:** El diagrama deja de mostrar infraestructura de datos. El Modelo gana config de fuente.

#### 1a — Limpiar palette ✅
- [x] Remover grupo IoT completo de `paletteConfig.ts` (iot_device, gateway, plc, edge_device)
- [x] Remover tipo 'iot' de `PaletteFamily` en paletteConfig.ts y EnergyUtilitiesCanvas.tsx
- [x] Limpiar PALETTE_UTILITY_FILTER: quitar referencias a nodos de infraestructura
- [x] nodes/index.tsx: tipos removidos caen en EquipmentNode via fallback `selector[nt] || EquipmentNode` — diagramas legacy siguen funcionando

#### 1b — source_type en Modelo ✅
- [x] Migración 00019: constraint source_type actualizada ('manual','iot_db','api_pull','api_push','file_import','calculated')
- [x] SOURCE_TYPE_LABELS + SOURCE_TYPE_ICONS en unitCatalog.ts
- [x] MeasurementPointsView.tsx: wizard step 3 con tarjetas por fuente + config contextual
- [x] seed.sql: MPs con mezcla realista de fuentes (manual/iot_db/file_import/calculated)

#### 1c — Ícono de fuente en burbuja ISA ✅
- [x] lastReadings.ts: `sourceType` en LastReading, añadido al select de measurement_points
- [x] MeasurementNode: ícono de fuente en esquina superior derecha del globo ISA
- [x] MeasurementNode: distingue "Sin MP" (gris) vs "Sin lectura" (italic gris) vs valor activo
- [x] MeasurementOption en EnergyUtilitiesCanvas: incluye source_type, se guarda en measurement_binding al crear
- [x] InspectorPanel handleLink: guarda source_type en measurement_binding al vincular desde inspector
- [x] Inspector MP card: muestra ícono + label de fuente junto a quantity/unit

---

### ✅ Fase 2 — Diagrama hereda del Modelo (no reconfigura)
**Objetivo:** Colocar un equipo en el diagrama muestra automáticamente sus MPs.

#### 2a — MPs inline en EquipmentNode ✅
- [x] Nuevo store `useEquipmentMPs.ts`: batch fetch de MPs por entityId, con lecturas y calidad
- [x] `EquipmentMPsFetcher` en canvas: agrupa todos los entityIds de nodos de equipo, UN solo fetch, refresco cada 60s
- [x] `EquipmentNode`: si tiene `asset_binding.entity_id`, muestra indicadores inline debajo de la cabecera
- [x] Indicador = ícono fuente + TAG + valor + dot de calidad (máx 4, resto "+N más")

#### 2b — Burbuja ISA solo para medidores standalone ✅
- [x] Descripciones en `paletteConfig.ts` actualizadas: "Medidor standalone — para entradas al sitio sin equipo padre"
- [x] Hint en modal de colocación: "Los de proceso aparecen automáticamente en la tarjeta de su equipo"

#### 2c — Inspector simplificado ✅
- [x] Sección "Ancla física" (chips) eliminada del MeasurementTab
- [x] Reemplazada por tarjeta informativa read-only cuando hay ancla configurada
- [x] Variables `physicalEdges`, `anchorableNodes`, `sideOptions`, `setAnchorTarget` eliminadas
- [x] Imports `ArrowLeft`, `ArrowRight`, `Minus` eliminados

---

### ✅ Fase 3 — Ancla por conexión visual (ETAP-like)
**Objetivo:** El usuario conecta el medidor al elemento. El sistema infiere el ancla.

#### 3a — Snap-to-edge en drop ✅
- [x] `useSnapStore.ts` (nuevo): `hoveredEdgeId` + `isDraggingMeasurement`
- [x] `NodePalette.tsx`: `onDragStart` de family 'measurement' setea `isDraggingMeasurement=true`; `onDragEnd` lo limpia
- [x] `EnergyUtilitiesCanvas`: `METER_NODE_TYPES` set a nivel módulo
- [x] `ReactFlowCoordsCapture` (componente interno): captura `screenToFlowPosition` via módulo var
- [x] `findClosestPhysicalEdge()`: helper que devuelve el edge físico más cercano (threshold 130px)
- [x] `onDragOver`: si `isDraggingMeasurement` → detecta closest edge → update `hoveredEdgeId`
- [x] `onDrop` measurement: snap de posición al midpoint del edge más cercano, `snapAnchor` auto en `measurement_binding`
- [x] `PendingNode.snapAnchor` field opcional en la interfaz
- [x] Modal `MapAssetBindingModal`: badge "Anclado automáticamente" cuando viene con snapAnchor; hint actualizado
- [x] `UtilityEdge`: highlight verde pulsante cuando `hoveredEdgeId === id`

#### 3b — Signal edge como ancla primaria ✅
- [x] `meterBinding.ts`: prioridad invertida — 1° signal edge, 2° anchor JSON, 3° MP target
- [x] `onConnect` en canvas: si source es meter node → `edgeType: 'signal'` automático
- [x] `UtilityEdge`: tap-dot SVG (círculo relleno en el target endpoint) para signal edges
- [x] Signal edges: sin arrowhead marker (solo tap-dot)

#### 3c — Rol auto-detectado ✅
- [x] `autoDetectMeterRole(meterNodeId, graph)` exportada en `meterBinding.ts`
  - Usa `getUpstreamNodes` del grafo compilado
  - Sin medidor upstream → 'boundary'; con medidor upstream → 'submeter'
- [x] `MeasurementTab`: compila grafo en `useMemo`, llama `autoDetectMeterRole`
- [x] Inspector: badge "🤖 auto" cuando no hay override manual
- [x] Inspector: botón "auto" para limpiar override manual
- [x] Hint "Detectado automáticamente del grafo · toca un botón para fijar manualmente"

---

### ✅ Fase 4 — Ingreso manual inline
**Objetivo:** Operador ingresa lectura sin salir del mapa.

- [x] En Inspector, si MP tiene `source_type: manual`:
  - Mostrar campo de entrada con valor actual pre-cargado
  - Botón "Registrar lectura"
  - Guarda en `measurement_readings` con `quality: 'manual'`
  - Feedback inmediato: valor se actualiza en la burbuja via `onSaved` callback
- [x] Badge visual en burbuja: "Pendiente lectura" (🟡 reloj ámbar) si hace más de 24h
- [x] Badge en Inspector: si MP.source_type === 'manual' y última lectura > 24h, muestra alerta Clock

---

### ✅ Fase 5 — MPs calculados
**Objetivo:** Fórmulas simples definidas en Modelo, evaluadas por el engine.

- [x] `src/services/measurement-engine/calculated.ts` (nuevo engine puro):
  - Operaciones: `sum`, `average`, `max`, `min`, `ratio`, `product`
  - Inputs: lista de MP IDs del `source_config.formula_inputs`
  - Fetches última lectura por input MP, evalúa, persiste con `quality: 'calculated'`
  - Idempotente: solo inserta si el resultado cambió >0.01%
- [x] `src/services/measurement-engine/index.ts`: exporta `evaluateCalculatedMPs`
- [x] En burbuja ISA: ícono ⚙ para MPs con `source_type: calculated`
- [x] Migración 00020: tabla `measurement_readings` creada con RLS
- [x] Seed: lecturas calculadas (VM-001 kWh/Nm3) con 18 meses de historia

---

## Palette final (después de Fase 1)

```
EQUIPOS           CONECTORES        CONTROL           MEDICIÓN
─────────────     ────────────      ───────────        ──────────
Caldera           Tubería           Válvula            Flujo
Bomba             Ducto             Damper             Energía
Compresor         Cable             Breaker            Potencia
Chiller           Barra bus         Válv. Control      Temperatura
Torre enfr.       Header            Válv. Check        Presión
Tanque            Bifurcación       Regulador          Nivel
Transformador                       Seccionador        Gas
Tablero                                                Agua / Vapor
Generador                                              Personalizado
Intercambiador
Motor
Consumidor

ORGANIZACIONAL    ESPECIAL
──────────────    ────────────
Área              Fuente utility
Proceso           Nodo pérdida
Línea prod.       Anotación
```

---

## Archivos clave por fase

| Archivo | Fase | Estado |
|---|---|---|
| `src/modules/mapa/palette/paletteConfig.ts` | 1a | ✅ |
| `src/modules/mapa/canvas/nodes/index.tsx` | 1c, 2a, 4 | ✅ |
| `src/modules/modelo/views/MeasurementPointsView.tsx` | 1b | ✅ |
| `src/services/measurement-engine/unitCatalog.ts` | 1b, 1c | ✅ |
| `src/services/measurement-engine/lastReadings.ts` | 1c | ✅ |
| `src/services/measurement-engine/calculated.ts` | 5 | ✅ (nuevo) |
| `src/services/measurement-engine/index.ts` | 5 | ✅ |
| `src/modules/mapa/canvas/EnergyUtilitiesCanvas.tsx` | 0, 1c, 2a, 2b, 3a | ✅ |
| `src/modules/mapa/inspector/InspectorPanel.tsx` | 0, 1c, 2c, 4 | ✅ |
| `src/modules/mapa/canvas/hooks/useEquipmentMPs.ts` | 2a | ✅ |
| `src/modules/mapa/canvas/hooks/useSnapStore.ts` | 3a | ✅ |
| `src/modules/mapa/canvas/edges/UtilityEdge.tsx` | 3b | ✅ |
| `src/services/topology-engine/meterBinding.ts` | 3b, 3c | ✅ |
| `supabase/migrations/00019_source_type_realistic.sql` | 1b | ✅ |
| `supabase/migrations/00020_measurement_readings.sql` | 4, 5 | ✅ (nuevo) |
| `supabase/seed.sql` | 1b, 4, 5 | ✅ |

---

## Notas de sesión

- **2026-06-03**: Definida arquitectura completa. Fase 0 parcialmente completa (modal + inspector).
  Decisión clave: fuentes de datos realistas para SaaS (no Modbus/OPC directo).
  Fase 1a completada: grupo IoT eliminado de palette, PaletteFamily limpiada, filtros por utility actualizados.
  Fase 1b completada: migración 00019 actualiza constraint source_type, unitCatalog con 6 fuentes realistas + iconos, WizardForm con campos por fuente, seed con mezcla manual/iot_db/file_import/calculated.
  Fase 1 completada al 100%.
  Fase 2 completada al 100%. Documentación completa actualizada. Build verde.
  Fase 3 completada al 100%. Build verde.
  Fase 4 completada al 100%: `ManualReadingSection` en InspectorPanel, badge "Pendiente lectura" (Clock ámbar) en burbuja ISA y en inspector. Guarda en `measurement_readings` con `quality: 'manual'`.
  Fase 5 completada al 100%: engine `calculated.ts` con operaciones sum/average/max/min/ratio/product, exportado desde `measurement-engine/index.ts`. Migración `00020_measurement_readings.sql` crea tabla unificada con RLS. Seed rico con 18 meses de historial + lecturas "en vivo" (hace 75 min). Build verde.
