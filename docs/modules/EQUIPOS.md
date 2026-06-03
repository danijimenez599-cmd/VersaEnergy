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
- `energy_areas` — areas de planta.
- `utility_systems` — sistemas por utility.
- `energy_equipment` — equipos (incluye medidores con `equipment_type='meter'`).
- `energy_sources` — fuentes de utility.
- `measurement_points` — puntos de medicion (enlazados a equipos via
  `meter_equipment_id`).
- `assets_compat` — vista SQL UNION ALL que unifica las tablas anteriores con
  el shape de `assets` del CMMS, para la convergencia futura.

Migraciones relevantes:
- `00004_model.sql` — modelo base.
- `00012_asset_tree_meter_compat.sql` — compatibilidad CMMS y medidores.
- `00015_assets_convergence.sql` — vista `assets_compat` y tabla `energy_asset_profiles`.

## Flujo actual

1. `loadEnergyAssetTree()` en `asset-tree.ts` lee de `assets_compat` y compone
   arbol.
2. `<AssetTree>` renderiza el arbol con busqueda, filtro utility,
   expand/collapse, menu contextual.
3. Al seleccionar un nodo, `AssetDetail` muestra ficha con barra de lentes.
4. Lentes disponibles varian por tipo de activo: Medicion, Balance, Desempeno,
   Acciones, Mapa, Mantenimiento.
5. Crear medidor desde arbol crea `energy_equipment` + `measurement_points`
   enlazados.
6. Wizard de MeasurementPoint de 4 pasos: Utility -> Tipo/Cantidad ->
   Unidad/Config -> Vinculacion.

## Invariantes

- Jerarquia: planta -> area -> sistema -> equipo. `component` no forma parte
  del arbol Energy.
- Un medidor fisico es un equipo con `equipment_type='meter'`.
- Un MeasurementPoint es una entidad de datos, no un nodo visual.
- No se permiten MeasurementPoints con `target_id` dummy.
- Tag se auto-genera si se deja vacio.
- Unidad/magnitud/utility se validan con `unitCatalog.ts`.
- El arbol usa `assets_compat` como unica fuente de lectura.
- Escrituras siguen yendo a tablas legacy hasta el cut-over de datos.

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
