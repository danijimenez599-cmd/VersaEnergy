# VersaEnergy — Referencia de estado actual

> Ultima actualizacion: 2026-06-03 (post SCADA Fases 0-5 completadas).
>
> Este documento describe lo ya construido, lo que funciona y las brechas
> conocidas. Es la fuente de verdad para responder: que existe hoy.

## Arquitectura de navegacion

### Shell asset-tree-first con lentes (post refactor MP-R)

La navegacion de VersaEnergy NO es un sidebar de modulos independientes. Es
un shell con arbol de activos persistente a la izquierda y disciplinas
(modulos) como lentes del activo seleccionado.

```txt
┌──────────────────────────────────────────────────────────┐
│ Header: logo, sitio, utility, periodo                    │
├─────────────┬────────────────────────────────────────────┤
│ Asset Tree  │  Barra de lentes                          │
│ persistente │  [Medicion] [Balance] [EnPI] [Acciones]   │
│ con busq.   │  [Mapa] [Mantenimiento]                   │
│ filtro util │                                           │
│ expand/     │  Contenido del modulo/lente activo         │
│ collapse    │  filtrado por activo seleccionado          │
│ contextual  │                                           │
└─────────────┴────────────────────────────────────────────┘
```

Comportamiento:

- Seleccionar un activo en el arbol actualiza `selectedAssetSourceId` y
  `selectedAssetType` en `uiStore`.
- Lentes disponibles cambian segun tipo de activo: planta, area, sistema,
  equipo, medidor.
- Un equipo muestra Medicion + Balance + Desempeno + Acciones + Mapa +
  Mantenimiento.
- Una planta o area muestra Balance + Desempeno + Acciones (scope sitio).
- Modulos globales (Cockpit, SGEn, Reportes, Admin) no requieren seleccion de
  activo.

### Modulos como lentes

| Modulo | Tipo | Scope |
|--------|------|-------|
| Inicio (Cockpit) | Global | Sitio + periodo + utility |
| Equipos | Arbol | Arbol completo |
| Medicion | Lente | Activo seleccionado |
| Mapa | Global + lente | Diagrama + activo |
| Balances | Lente | Sitio o activo |
| Desempeno | Lente | Sitio o activo |
| Acciones | Lente | Sitio o activo |
| SGEn | Global | Sitio |
| Reportes | Global | Sitio |
| Admin | Global | Empresa |

## Estado por modulo

### Inicio (Cockpit) ✅
- 5 tabs operacionales: Ahora, Utilities, Riesgo, Acciones, Tendencias.
- KPIs calculados en `src/services/cockpit.ts`.
- Alertas accionables con navegacion a modulo correcto.
- Graficos de tendencia con Recharts.

### Equipos (Arbol) ✅
- Arbol de activos con busqueda, filtro utility, expand/collapse.
- Ficha de equipo con barra de lentes.
- MeasurementPoints con wizard de 4 pasos (tag ISA-5.1, utility, vinculacion,
  magnitud/fuente).
- Vista `assets_compat` para convergencia CMMS.
- Mantenimiento de medidores con estado de calibracion.

### Mapa ✅ (SCADA Fases 0-5 completadas — 2026-06-03)

**Fases 0-2: Base arquitectural**
- Canvas React Flow con paleta agrupada, inspector multitab, validaciones.
- Plantillas por utility (electricidad, vapor, aire, agua, gas).
- Leyenda viva, overlays (consumo, cobertura, desviaciones).
- Versionado: draft → publicar → clonar.
- Binding obligatorio para equipos y medidores.
- Palette limpia: grupo IoT eliminado — fuente de datos es `source_type` en Modelo.
- `source_type` con 6 fuentes realistas: `manual / iot_db / api_pull / api_push / file_import / calculated`.
- Burbuja ISA muestra icono de fuente en esquina (⌨ 📡 📁 ⚙).
- EquipmentNode muestra MPs del equipo inline (SCADA-style) via `useEquipmentMPs`.

**Fase 3: Ancla por arrastre visual** ✅
- `useSnapStore` rastrea `isDraggingMeasurement` y `hoveredEdgeId`.
- `findClosestPhysicalEdge` en `EnergyUtilitiesCanvas` detecta la linea fisica
  mas cercana al soltar un nodo medidor.
- `onDrop` calcula `snapAnchor` (position, side, offset) y lo persiste en
  `properties.measurement_binding.anchor`.
- `onConnect` auto-crea edge tipo `signal` cuando se conecta medidor a
  equipo/linea — detecta automaticamente `measuredNodeId`.
- Tap-dot ISA en `UtilityEdge`: circulo en la posicion del anchor de señal.
- `autoDetectMeterRole` en `meterBinding.ts`: rol `boundary` vs `submeter`
  segun posicion topologica, con badge 🤖 auto en Inspector.

**Fase 4: Ingreso manual inline desde inspector** ✅
- `ManualReadingSection` en `InspectorPanel` — aparece cuando MP tiene
  `source_type === 'manual'`.
- Campo numerico + boton "Registrar" guarda a `measurement_readings` con
  `quality = 'manual'`.
- Badge "Pendiente lectura" (🟡 reloj ambar) en inspector y en burbuja ISA
  cuando la ultima lectura manual tiene >24h o no existe.
- Feedback inmediato sin recargar pagina.

**Fase 5: MPs calculados** ✅
- Engine puro en `src/services/measurement-engine/calculated.ts`.
- Operaciones: `sum / average / max / min / ratio / product`.
- `evaluateCalculatedMPs(siteId)` fetches MPs con `source_type='calculated'`,
  resuelve inputs, evalua formula, persiste resultado con `quality='calculated'`.
- Exportado desde `src/services/measurement-engine/index.ts`.
- Idempotente: solo inserta nueva lectura si el valor cambio >0.01%.
- Burbuja ISA muestra icono ⚙ para MPs calculados.

### Medicion ✅
- 4 tabs: Captura manual, Import CSV, Calidad, Validadas.
- Auto-deteccion CSV, mapeo columnas, tracking batch.
- Calidad por MeasurementPoint.
- Filtrado por activo seleccionado.

### Balances ✅
- Wizard 3 pasos: Configurar → Revisar → Resultado.
- Soporte de supuestos de simulacion.
- CTA cruzado no-explicado → Acciones.
- Trazabilidad de version de diagrama.

### Desempeno ✅
- EnPI con constructor visual de formula.
- Baselines versionados.
- Targets con preview en tiempo real.
- Graficos de tendencia por periodo.
- Variables significativas (EnPI con vars).

### Acciones ✅
- **3 tabs operacionales:**
  - **Oportunidades (Inbox):** lista priorizada de mejoras con score, utilidad,
    categoria y filtros. Detalle de oportunidad con timeline.
  - **Acciones rapidas (Kanban):** tablero Kanban `identificado → aprobado →
    en_progreso → verificando → cerrado` para acciones no-proyecto.
    Cada tarjeta muestra estimado de ahorro, responsable, M&V y evidencia.
  - **Proyectos (Portfolio):** tarjetas de proyectos energeticos con progreso,
    presupuesto, utilidad y estado de fases.
- **Workspace de proyecto completo:**
  - Gantt por fases con fechas, progreso y estado.
  - Tareas por fase con prioridad, responsable y fecha.
  - Panel M&V (medicion y verificacion): metodo, periodo, linea base M&V,
    ahorro reportado vs estimado.
  - Evidencia de proyecto: snapshots, notas, documentos.
  - Presupuesto por fase y total.
- **Formulario completo (`ImprovementForm`):**
  - `work_type`: quick_action vs project.
  - Campos: titulo, descripcion, categoria, utility, prioridad, ahorro estimado
    (energia + costo), inversion, payback, responsable, fechas, metodo M&V.
  - Guardado a `energy_improvements` en Supabase.

### SGEn (ISO 50001) ✅
- **10 tabs operacionales:**
  - **Cockpit:** madurez del SGEn (score %), SEUs activos, objetivos activos,
    acciones abiertas, NC abiertas. Ciclo guiado de trabajo. "Proxima mejor
    accion".
  - **Planificacion:** revisiones energeticas, SEUs, objetivos SGEn y acciones
    vinculadas.
  - **Politica:** workspace de politica energetica con compromisos trazables.
  - **Riesgos:** registro de riesgos y oportunidades con probabilidad, impacto,
    plan de tratamiento y estado.
  - **Auditoria:** checklist operativo con 28+ preguntas por dominio (contexto,
    liderazgo, planificacion, revision, SEUs, indicadores, plan de accion,
    medicion, control, correcciones, evidencia, revision directiva). Marca OK /
    GAP / N/A. Genera NCs desde GAPs.
  - **No conformidades:** registro de NCs con causa, accion correctiva,
    responsable, fecha y verificacion de eficacia.
  - **Evidencia:** galeria de snapshots del sistema, notas y documentos por
    dominio SGEn.
  - **Direccion:** workspace de revision por la direccion con entradas y
    decisiones con responsable y estado.
  - **Alcance:** definicion de limites del SGEn, utilities incluidos y versiones.
  - **Legal:** aviso legal que el modulo no reemplaza ISO 50001.
- Evidence Snapshot transversal (boton en Cockpit).
- No copia texto ISO.

### Reportes ⚠️ (UI ready, exportacion pendiente)
- Builder interactivo funcional.
- Tipos de reporte: mensual, balance, EnPI, acciones, SGEn.
- Exportaciones PDF/CSV son mock — falta conectar `@react-pdf/renderer`.

### Admin ⚠️ (UI ready, backend pendiente)
- Layout 4 tabs: Sitios, Tarifas, Usuarios, Parametros.
- Tablas de DB creadas en `00014_admin_settings.sql`.
- UI tiene datos mock — falta conectar a Supabase JS.

## Servicios (engines puros sin dependencia React)

| Servicio | Ubicacion | Estado |
|----------|-----------|--------|
| Topology engine | `src/services/topology-engine/` | ✅ Operativo |
| Balance engine | `src/services/balance-engine/` | ✅ Operativo |
| Measurement engine | `src/services/measurement-engine/` | ✅ Operativo |
| Calculated MPs engine | `src/services/measurement-engine/calculated.ts` | ✅ Nuevo (Fase 5) |
| Last readings service | `src/services/measurement-engine/lastReadings.ts` | ✅ Operativo |
| Cockpit KPIs | `src/services/cockpit.ts` | ✅ Operativo |
| Improvement engine | `src/services/improvement-engine/` | ✅ Operativo |
| SGEn engine | `src/services/sgen-engine/` | ✅ Operativo |
| Asset tree | `src/services/asset-tree.ts` | ✅ Operativo |
| Equipment specs | `src/services/equipmentSpecs.ts` | ✅ Operativo |
| Diagram versions | `src/services/diagramVersions.ts` | ✅ Operativo |
| Equipment MPs store | `src/modules/mapa/canvas/hooks/useEquipmentMPs.ts` | ✅ Operativo |
| Snap store | `src/modules/mapa/canvas/hooks/useSnapStore.ts` | ✅ Operativo (Fase 3) |
| Meter binding | `src/services/topology-engine/meterBinding.ts` | ✅ Operativo |

## Componentes compartidos

| Componente | Archivo | Estado |
|------------|---------|--------|
| AssetTree | `src/shared/AssetTree/index.tsx` | ✅ |
| AssetDetail (lentes) | `src/shared/AssetLenses/AssetDetail.tsx` | ✅ |
| AssetMaintenance | `src/shared/AssetLenses/AssetMaintenance.tsx` | ✅ |
| Button | `src/shared/Button.tsx` | ✅ |
| Badge | `src/shared/Badge.tsx` | ✅ |
| Card | `src/shared/Card.tsx` | ✅ |
| MetricCard | `src/shared/MetricCard.tsx` | ✅ |
| Modal | `src/shared/Modal.tsx` | ✅ |
| ConfirmDialog | `src/shared/ConfirmDialog.tsx` | ✅ |
| Toast | `src/shared/Toast.tsx` | ✅ |
| FormField | `src/shared/FormField.tsx` | ✅ |
| EmptyState | `src/shared/EmptyState.tsx` | ✅ |
| PageHeader | `src/shared/PageHeader.tsx` | ✅ |
| AlertBanner | `src/shared/AlertBanner.tsx` | ✅ |
| OnboardingWizard | `src/shared/OnboardingWizard.tsx` | ✅ |

## Base de datos

- 21 migraciones incrementales en `supabase/migrations/` (00000-00020).
- RLS habilitado en todas las tablas con `company_id`.
- Helper `get_my_company_id()` y `get_my_role()` para policies.
- Vista `assets_compat` para convergencia CMMS.
- **`00019_source_type_realistic.sql`** — constraint `source_type` a 6 tipos.
- **`00020_measurement_readings.sql`** — tabla `measurement_readings` usada por
  el mapa, inspector, calculated engine y todos los servicios modernos.
- Detalle: ver `docs/DATABASE.md`.

## Seed de datos demo

- Seed rico en `supabase/seed.sql` con:
  - 18 meses de lecturas historicas con patron estacional (enero 2025 - junio 2026).
  - Lecturas "en vivo" hace ~75 minutos para todos los MPs (quality: good).
  - VM-001 calculado (kWh/Nm3) con 18 meses de historia.
  - Lecturas en `measurement_readings` (nueva) Y `energy_readings_raw` (legacy).
  - 4 diagramas completos con nodos, edges y versiones.
  - 4 balances (electricidad y vapor, enero 2025 y junio 2026).
  - 4 EnPIs con baselines, targets y resultados de 6 meses.
  - 4 acciones/proyectos con fases, tareas y M&V.
  - Datos SGEn: alcance, SEUs, evidencias, mejoras verificadas.
- Credenciales demo: `admin@demo.com` / `AdminDemo123!`

## Build

- `npm run build` pasa sin errores ni warnings de TypeScript.
- Warning: chunks `index-*.js` y `mapa-*.js` > 500 kB — no bloquea.

## Brechas conocidas

| Brecha | Severidad | Donde |
|--------|-----------|-------|
| Admin UI no conectada a Supabase | Media | `src/modules/admin/` |
| Reportes PDF/CSV son mock | Media | `src/modules/reportes/` |
| Convergencia CMMS: escrituras a tablas legacy | Baja | `src/services/asset-tree.ts` |
| Code splitting para chunks > 500 kB | Baja | `vite.config.ts` |
| evaluateCalculatedMPs no tiene scheduler automatico | Baja | `src/services/measurement-engine/calculated.ts` |

## Deuda tecnica documentada

1. **Admin mock**: la UI existe pero los formularios no guardan a Supabase.
   Esto se resuelve en MP-12.
2. **Reportes mock**: la UI builder existe pero no genera PDF real con
   `@react-pdf/renderer`. Esto se resuelve en MP-11.
3. **Medidores PM mock**: la tab de mantenimiento muestra datos mock de
   calibracion y planes PM. Esto se resuelve cuando exista la integracion
   CMMS real.
4. **Cut-over de datos**: `asset-tree.ts` lee de `assets_compat` pero las
   escrituras van a tablas legacy. Falta script de consolidacion.
5. **Calculated MPs scheduler**: `evaluateCalculatedMPs` existe como engine
   puro pero no tiene un cron o trigger que lo llame automaticamente. Invocar
   manualmente desde un edge function o desde una accion del usuario.
