# VersaEnergy — Referencia de base de datos

## Proposito

Referencia viva de tablas, migraciones y RLS de VersaEnergy. Actualizar cuando
cambie schema.

## Migraciones

Las migraciones son incrementales en `supabase/migrations/`:

| Archivo | Contenido |
|---------|-----------|
| `00000_initial.sql` | Tabla `companies`, `profiles`, helpers RLS (`get_my_company_id`). |
| `00001_sites.sql` | Tabla `sites` con `company_id` y RLS. |
| `00002_utility_definitions.sql` | Catalogo de utilities: `utility_definitions`, `utility_units`. Seed de 16 utilities. |
| `00003_standards.sql` | Catalogo de estandares: ISA-5.1, IEC 60617, ISO 14617, ISO/IEC 81346. |
| `00004_model.sql` | Modelo Energy: `energy_areas`, `utility_systems`, `energy_equipment`, `energy_sources`, `measurement_points`. |
| `00005_diagrams.sql` | Diagramas: `energy_diagrams`, `energy_diagram_nodes`, `energy_diagram_edges`. |
| `00006_topology_engine.sql` | Validacion: `energy_topology_validation_issues`. |
| `00007_readings.sql` | Medicion: `energy_readings_raw`, `energy_readings_validated`, `energy_import_batches`. |
| `00008_balances.sql` | Balances: `energy_balances`. |
| `00009_enpis.sql` | Desempeno: `energy_enpis`, `energy_baselines`, `energy_targets`, `energy_performance_results`. |
| `00010_improvements_core.sql` | Acciones: `energy_improvements`, `energy_improvement_evidence`, `energy_project_phases`, `energy_project_tasks`. |
| `00011_sgen_iso50001.sql` | SGEn: `sgen_scope`, `sgen_policy`, `sgen_energy_reviews`, `sgen_significant_uses`, `sgen_objectives`, `sgen_evidence`, `sgen_audits`, `sgen_management_reviews`, `sgen_nonconformities`. |
| `00012_asset_tree_meter_compat.sql` | Compatibilidad CMMS: metadata de activos, medidores fisicos, calibracion. |
| `00013_diagram_versions.sql` | Versionado: `energy_diagram_versions`. |
| `00014_admin_settings.sql` | Admin: `app_memberships`, `energy_tariffs`, `energy_emission_factors`, `energy_system_parameters`. |
| `00015_assets_convergence.sql` | Convergencia CMMS: vista `assets_compat`, tabla `energy_asset_profiles`. |
| `00016_improvement_monitoring_period.sql` | Acciones: ventana de monitoreo posterior en `energy_improvements`. |

## Tablas principales

### Tenancy y auth

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `companies` | `id` | Si |
| `profiles` | `company_id` | Si |
| `sites` | `company_id` | Si |
| `app_memberships` | `company_id` | Si |

### Modelo de planta

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `energy_areas` | `company_id` | Si |
| `utility_systems` | `company_id` | Si |
| `energy_equipment` | `company_id` | Si |
| `energy_sources` | `company_id` | Si |
| `measurement_points` | `company_id` | Si |

### Diagramas y topologia

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `energy_diagrams` | `company_id` | Si |
| `energy_diagram_nodes` | via FK a `energy_diagrams` | Si |
| `energy_diagram_edges` | via FK a `energy_diagrams` | Si |
| `energy_diagram_versions` | via FK a `energy_diagrams` | Si |
| `energy_topology_validation_issues` | via FK a `energy_diagrams` | Si |

### Medicion

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `energy_readings_raw` | `company_id` | Si |
| `energy_readings_validated` | `company_id` | Si |
| `energy_import_batches` | `company_id` | Si |

### Balances y desempeno

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `energy_balances` | `company_id` | Si |
| `energy_enpis` | `company_id` | Si |
| `energy_baselines` | `company_id` | Si |
| `energy_targets` | `company_id` | Si |
| `energy_performance_results` | `company_id` | Si |

### Acciones y proyectos

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `energy_improvements` | `company_id` | Si |
| `energy_improvement_evidence` | via FK | Si |
| `energy_project_phases` | via FK | Si |
| `energy_project_tasks` | via FK | Si |

#### Monitoreo posterior de mejoras

`00016_improvement_monitoring_period.sql` agrega a `energy_improvements`:

- `monitoring_start` — inicio de la ventana de seguimiento.
- `monitoring_end` — fecha objetivo para validar sostenimiento.
- `monitoring_status` — `not_started`, `in_progress`, `passed` o `failed`.
- `monitoring_notes` — criterio o notas de sostenimiento.

La UI usa estos campos para evitar cierres instantaneos: una mejora
implementada pasa a verificacion, se monitorea durante un periodo
personalizado y solo despues se cierra como sostenida.

### SGEn

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `sgen_scope` | `company_id` | Si |
| `sgen_policy` | `company_id` | Si |
| `sgen_energy_reviews` | `company_id` | Si |
| `sgen_significant_uses` | `company_id` | Si |
| `sgen_objectives` | `company_id` | Si |
| `sgen_evidence` | `company_id` | Si |
| `sgen_audits` | `company_id` | Si |
| `sgen_management_reviews` | `company_id` | Si |
| `sgen_nonconformities` | `company_id` | Si |

### Admin y configuracion

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `energy_tariffs` | `company_id` | Si |
| `energy_emission_factors` | `company_id` | Si |
| `energy_system_parameters` | `company_id` | Si |

### Convergencia CMMS

| Objeto | Tipo | Proposito |
|--------|------|-----------|
| `assets_compat` | Vista SQL | UNION ALL de tablas legacy con shape de `assets` del CMMS. |
| `energy_asset_profiles` | Tabla | Perfil energetico satelite por activo. |

## Helpers RLS

- `get_my_company_id()` — retorna el `company_id` del usuario autenticado.
- Cada tabla con `company_id` tiene policy de lectura/escritura scoped.

## Convenciones

- Toda tabla con `company_id` debe tener RLS habilitado.
- No crear migraciones nuevas sin necesidad; preferir extender existentes
  durante desarrollo.
- El seed demo usa `admin@demo.com` / `AdminDemo123!`.
- Las tablas del CMMS (`assets`, `equipment_families`, etc.) no se crean en
  Energy; se referencian via `assets_compat` o integracion futura.
