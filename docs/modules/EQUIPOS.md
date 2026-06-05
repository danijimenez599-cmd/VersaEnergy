# Modulo: Equipos (Arbol de activos)

## Responsabilidad

Gestiona la jerarquia de activos Energy: Planta -> Area -> Sistema -> Equipo.
Es la espina dorsal del producto. El arbol es la base sobre la que se
construyen medidores, mapa, balances y todo lo demas. Tambien aloja medidores
como equipos mantenibles y MeasurementPoints.

Desde el refactor MP-R, el arbol es persistente en el shell y los modulos
operativos funcionan como lentes del activo seleccionado.

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/modelo/index.tsx` |
| Arbol + detalle | `src/modules/modelo/views/PlantAssetTreeView.tsx` |
| Wizard MeasurementPoint | `src/modules/modelo/views/MeasurementPointsView.tsx` |
| Areas (vista interna) | `src/modules/modelo/views/AreasView.tsx` |
| Sistemas (vista interna) | `src/modules/modelo/views/UtilitySystemsView.tsx` |
| Equipos (vista interna) | `src/modules/modelo/views/EquipmentView.tsx` |
| Fuentes (vista interna) | `src/modules/modelo/views/SourcesView.tsx` |
| Catalogo utilities | `src/modules/modelo/views/UtilityDefinitionsView.tsx` |
| Componente arbol compartido | `src/shared/AssetTree/index.tsx` |
| Detalle/lentes compartido | `src/shared/AssetLenses/AssetDetail.tsx` |
| Mantenimiento de medidores | `src/shared/AssetLenses/AssetMaintenance.tsx` |
| Servicio arbol | `src/services/asset-tree.ts` |
| Specs por equipo | `src/services/equipmentSpecs.ts` |
| Helpers de activos | `src/shared/assetHelpers.ts` |
| Catalogo de unidades | `src/services/measurement-engine/unitCatalog.ts` |

## Modelo/Tablas

- `sites` — sedes.
- `assets` — base Core/CMMS para agrupadores, mantenibles y medidores fisicos.
- `energy_asset_profiles` — capa satelite Energy por activo Core.
- `energy_groups` / `energy_group_members` — agrupadores energeticos propios de
  Energy, independientes del arbol CMMS cuando haga falta.
- `energy_measurement_point_profiles` / `energy_measurement_bindings` —
  semantica y vinculacion energetica de MeasurementPoints.
- `energy_areas` — areas legacy de planta, fallback temporal.
- `utility_systems` — sistemas legacy por utility, fallback temporal.
- `energy_equipment` — equipos legacy, fallback temporal.
- `energy_sources` — fuentes de utility.
- `measurement_points` — puntos de medicion compartidos; pueden tener scope en
  asset Core o Energy group y medidor fisico opcional via
  `physical_meter_asset_id`.
- `asset_registry_requests` — solicitudes hacia Maint cuando ambos productos
  estan activos en la sede. Maint/Core decide con
  `fn_approve_asset_registry_request_tx` o
  `fn_reject_asset_registry_request_tx`.
- `asset_registry_events` — historial comun de solicitudes, decisiones,
  adopciones, merges y eventos de medidor/acumulador.
- `assets_compat` — vista SQL de compatibilidad; no es contrato futuro.

Migraciones relevantes:
- `00004_model.sql` — modelo base.
- `00012_asset_tree_meter_compat.sql` — compatibilidad CMMS y medidores.
- `00015_assets_convergence.sql` — vista `assets_compat` y tabla `energy_asset_profiles`.

## Flujo actual

1. `loadEnergyAssetTree()` en `asset-tree.ts` lee primero `assets` Core y
   compone el arbol con `energy_asset_profiles`; usa `assets_compat` solo como
   fallback temporal si el ambiente todavia no tiene Core.
2. `<AssetTree>` renderiza el arbol con busqueda, filtro utility, filtros por
   rol (`Todos`, `Grupos`, `Equipos`, `Med.`), expand/collapse y menu
   contextual.
3. Al seleccionar un nodo, `AssetDetail` muestra ficha con barra de lentes.
4. Lentes disponibles varian por `node_role` y `maintainable_kind`:
   agrupadores muestran informacion, medicion, mapa y registro; mantenibles
   agregan especificaciones; medidores fisicos conservan cualidades de equipo
   mantenible y priorizan el lente de medicion.
5. Crear desde arbol revisa `fn_site_product_mode(site_id)`: si la sede esta
   `energy_only`, crea en `assets` Core y `energy_asset_profiles`; si Maint
   gobierna, crea `asset_registry_requests` para que CMMS apruebe, rechace,
   adopte, fusione o actualice.
6. Wizard de MeasurementPoint de 4 pasos: Utility -> Tipo/Cantidad ->
   Unidad/Config -> Vinculacion.

La deduplicacion no es flujo normal cuando Maint y Energy estan activos en la
misma sede, porque Energy no crea activos fisicos maestros en ese modo. Solo se
usa para adopciones posteriores, imports o fusiones administrativas.

## Invariantes

- Jerarquia visual actual: planta -> area/scope -> sistema -> equipo, derivada
  de `node_type/node_role/maintainable_kind` Core.
- VersaEnergy es multitenant igual que VersaMaint: el arbol, perfiles,
  MeasurementPoints, solicitudes y eventos siempre deben quedar filtrados por
  sede.
- El seed global de `assets` lo gobierna CMMS/Core. Energy puede sembrar
  perfiles, groups, bindings, topologias y excepciones encima.
- Los agrupadores Core/CMMS se importan como scopes disponibles, pero Energy no
  los mueve para cambiar la jerarquia fisica. La reorganizacion energetica se
  hace con `energy_groups`, topology y diagramas.
- La lectura/escritura de `assets`, perfiles Energy, MeasurementPoints,
  solicitudes y eventos debe respetar `fn_user_can_access_site`.
- Un medidor fisico es un activo mantenible Core con
  `maintainable_kind='meter'`.
- Un MeasurementPoint es una entidad de datos, no un nodo visual.
- El detalle completo del contrato compartido esta en
  `docs/modules/CORE_ASSET_REGISTRY.md`.
- No se permiten MeasurementPoints con `target_id` dummy.
- Tag se auto-genera si se deja vacio.
- Unidad/magnitud/utility se validan con `unitCatalog.ts`.
- El arbol no debe volver a depender de `asset_type` como contrato.
- Escrituras fisicas van a Core si Energy esta solo o a solicitudes si Maint
  esta activo.

## Permisos

Visible para todos los usuarios autenticados. Crear/editar requiere rol admin
o gestor energetico (cuando `app_memberships` este activo).

## Integraciones

- Mapa: equipos y medidores se vinculan como nodos del diagrama via
  `asset_binding` y `measurement_binding`.
- Medicion: MeasurementPoints alimentan lecturas y calidad.
- Balances: medidores de frontera definen el alcance del balance.
- CMMS: campos `cmms_asset_id`, `integration_key`, `sync_status`,
  `last_synced_at` preparan sincronizacion futura.

## No hacer

- No crear componentes como hijos del arbol (dominio del CMMS).
- No permitir MeasurementPoints sin target real.
- No exponer JSON crudo al usuario.
- No duplicar arbol en el mapa; el mapa referencia activos del arbol.
- No modificar el CMMS (`../CMMSFSC`).

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Cambio en `asset-tree.ts`: `npm run build`.
- Cambio de migracion: verificar coherencia de `assets_compat`.
