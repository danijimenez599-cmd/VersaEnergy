# VersaEnergy — Referencia de estado actual

> Ultima actualizacion: 2026-06-03.
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
- MeasurementPoints con wizard de 4 pasos.
- Vista `assets_compat` para convergencia CMMS.
- Mantenimiento de medidores con estado de calibracion.

### Mapa ✅
- Canvas React Flow con paleta, inspector, validaciones.
- Plantillas por utility (electricidad, vapor, aire, agua, gas).
- Leyenda viva y overlays (consumo, cobertura, deviaciones).
- Versionado: draft -> publicar -> clonar.
- Binding obligatorio para equipos y medidores.

### Medicion ✅
- 4 tabs: Captura manual, Import CSV, Calidad, Validadas.
- Auto-deteccion CSV, mapeo columnas, tracking batch.
- Calidad por MeasurementPoint.
- Filtrado por activo seleccionado.

### Balances ✅
- Wizard 3 pasos: Configurar -> Revisar -> Resultado.
- Soporte de supuestos de simulacion.
- CTA cruzado no-explicado -> Acciones.
- Trazabilidad de version de diagrama.

### Desempeno ✅
- EnPI con constructor visual de formula.
- Baselines versionados.
- Targets con preview en tiempo real.
- Graficos de tendencia.

### Acciones ✅
- Inbox, acciones rapidas medibles y portfolio visual de proyectos.
- Acciones rapidas con EnPI asociado, M&V, checklist, responsable y evidencia.
- Workspace de proyecto con Gantt, fases, tareas, presupuesto, responsables,
  M&V y evidencia.
- Cierre en dos pasos: implementacion -> monitoreo personalizado
  (`verification`) -> cierre sostenido (`closed`).

### SGEn (ISO 50001) ✅
- Workspace con secciones principales.
- Evidence Snapshot transversal.
- Aviso legal visible.
- No copia texto ISO.

### Reportes ⚠️ (UI ready, backend pendiente)
- Builder interactivo funcional.
- Tipos de reporte: mensual, balance, EnPI, acciones, SGEn.
- Exportaciones PDF/CSV son mock — falta conectar `@react-pdf/renderer`.

### Admin ⚠️ (UI ready, backend pendiente)
- Layout 4 tabs: Sitios, Tarifas, Usuarios, Parametros.
- Tablas de DB creadas en `00014_admin_settings.sql`.
- UI tiene datos mock — falta conectar a Supabase JS.

## Servicios (engines puros)

| Servicio | Ubicacion | Estado |
|----------|-----------|--------|
| Topology engine | `src/services/topology-engine/` | ✅ Operativo |
| Balance engine | `src/services/balance-engine/` | ✅ Operativo |
| Measurement engine | `src/services/measurement-engine/` | ✅ Operativo |
| Cockpit KPIs | `src/services/cockpit.ts` | ✅ Operativo |
| Improvement engine | `src/services/improvement-engine/` | ✅ Operativo |
| SGEn engine | `src/services/sgen-engine/` | ✅ Operativo |
| Asset tree | `src/services/asset-tree.ts` | ✅ Operativo |
| Equipment specs | `src/services/equipmentSpecs.ts` | ✅ Operativo |
| Diagram versions | `src/services/diagramVersions.ts` | ✅ Operativo |

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

- 16 migraciones incrementales en `supabase/migrations/`.
- RLS habilitado en todas las tablas con `company_id`.
- Helper `get_my_company_id()` para policies.
- Vista `assets_compat` para convergencia CMMS.
- Detalle: ver `docs/DATABASE.md`.

## Build

- `npm run build` pasa sin errores.
- Warning: chunk `index-*.js` > 500 kB — no bloquea.

## Brechas conocidas

| Brecha | Severidad | Donde |
|--------|-----------|-------|
| Admin UI no conectada a Supabase | Media | `src/modules/admin/` |
| Reportes PDF/CSV son mock | Media | `src/modules/reportes/` |
| Convergencia CMMS: escrituras a tablas legacy | Baja | `src/services/asset-tree.ts` |
| Code splitting para chunks > 500 kB | Baja | `vite.config.ts` |
| `OperationalContext.tsx` posiblemente huerfano | Baja | `src/shared/` |
| Inline `fontFamily` residuales en ~15 componentes | Baja | Varios |
| Seed demo: no existe script completo de planta real | Media | `supabase/seed.sql` falta |

## Deuda tecnica documentada

Estas deudas fueron creadas intencionalmente durante el refactor MP-R:

1. **Admin mock**: la UI existe pero los formularios no guardan a Supabase.
   Esto se resuelve en MP-12.
2. **Reportes mock**: la UI builder existe pero no genera PDF real con
   `@react-pdf/renderer`. Esto se resuelve en MP-11.
3. **Medidores PM mock**: la tab de mantenimiento muestra datos mock de
   calibracion y planes PM. Esto se resuelve cuando exista la integracion
   CMMS real.
4. **Cut-over de datos**: `asset-tree.ts` lee de `assets_compat` pero las
   escrituras van a tablas legacy. Falta script de consolidacion.
