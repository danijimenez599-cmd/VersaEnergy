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
| `00011_sgen_core.sql` | SGEn: `sgen_scopes`, `sgen_policy_documents`, `sgen_energy_reviews`, `sgen_significant_uses`, `sgen_objectives`, `sgen_evidence`, `sgen_audits`, `sgen_management_reviews`, `sgen_nonconformities`. |
| `00012_asset_tree_meter_compat.sql` | Compatibilidad CMMS: metadata de activos, medidores fisicos, calibracion. |
| `00013_diagram_versions.sql` | Versionado: `energy_diagram_versions`. |
| `00014_admin_settings.sql` | Admin: `app_memberships`, `energy_tariffs`, `energy_emission_factors`, `energy_system_parameters`. |
| `00015_assets_convergence.sql` | Convergencia CMMS: vista `assets_compat`, tabla `energy_asset_profiles`. |
| `00016_improvement_monitoring_period.sql` | Acciones: ventana de monitoreo posterior en `energy_improvements`. |
| `00017_sgen_enhancements.sql` | SGEn: mejoras a `sgen_audits`, `sgen_audit_findings`, `sgen_nonconformities`, `sgen_improvements`, `sgen_legal_notices`. |
| `00018_enpi_significant_variables.sql` | Desempeno: `enpi_significant_variables` — variables de ajuste de baselines EnPI. |
| `00019_source_type_realistic.sql` | Modelo: constraint `source_type` en `measurement_points` extendida a 6 tipos reales (`manual`, `iot_db`, `api_pull`, `api_push`, `file_import`, `calculated`). |
| `00020_measurement_readings.sql` | Medicion: **tabla `measurement_readings`** — tabla unificada de lecturas usada por el mapa, inspector, calculated engine y todos los servicios modernos. |
| `00021_balance_sheets.sql` | Balances modernos: `energy_balance_sheets`, `energy_balance_entries`, `energy_balance_results`; E11 renombra sus tablas driver a `relevant_variables` y `relevant_variable_readings`. |
| `00022_enpi_referential.sql` | Desempeno: columnas referenciales en `energy_enpis` para numerador MP/balance y denominador; E11 cambia el denominador canonico a `relevant_variable`. |
| `00023_energy_studies.sql` | Centro de Estudios Energeticos: `energy_studies`, fuentes, modelos, hallazgos y decisiones. |
| `00024_energy_study_decision_links.sql` | Centro de Estudios: trazabilidad `source_study_id/source_study_model_id` en acciones y decision `create_sgen_evidence`. |
| `00025_hierarchical_diagrams.sql` | Mapa: diagramas jerarquicos y scopes visuales. |
| `00026_e1_registry_lifecycle.sql` | E1: eventos de Core Asset Registry, historial de solicitudes y safeguard de acumuladores. |
| `00027_e2_core_site_scope.sql` | E2: `site_access`, helpers de scope y RLS por sede para tablas Core/mock. |
| `00028_e3_energy_satellite_schema.sql` | E3: perfiles Energy, grupos, miembros, bindings, excepciones y extension semantica de topologias. |
| `00029_e5_measurement_point_contract.sql` | E5: contrato MeasurementPoint compartido; scope `asset`/`energy_group`, medidor fisico opcional, indices por scope/domains y captura manual como fuente vigente. |
| `00030_e6_topology.sql` | E6: `energy_sources`, identidad tipada de nodos (`identity_kind`), `energy_role`, boundary primario por grupo/utility, normalizadores y reglas de topologia 2.0. |
| `00031_e7_official_balances.sql` | E7: resultados oficiales de balance con scope, diagrama/version publicada, versiones hijas, cobertura, hallazgos, confianza y estado `current/superseded`. |
| `00032_e8_study_workflow.sql` | E8: workflow de estudios, variables candidatas, decision payload, accion rapida/proyecto y modelos ampliados. |
| `00033_e9_execution_audit_cmms.sql` | E9: planes M&V formales, solicitudes Energy<->Maint/CMMS y bitacora auditada de ejecucion. |
| `00034_e11_enpi_relevant_variables.sql` | E11: grupos de EnPIs, buckets de variables relevantes, lecturas flexibles, links EnPI-variable y reemplazo canonico de `production_*` por `relevant_*`. |
| `00035_e12_diagram_workspace.sql` | E12: clasificacion de `energy_diagrams` por tipo, lente, scope ampliado, metadata de workspace e indices por tipo/scope. |
| `00037_e13_study_case_management.sql` | E13: expedientes de Estudios tipo OT energetica; actividades, evidencia, eventos, decision final y cierre. |

## Tablas principales

### Tenancy y auth

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `companies` | `id` | Si |
| `profiles` | `company_id` | Si |
| `sites` | `company_id` | Si |
| `app_memberships` | `company_id` | Si |
| `site_access` | `company_id` | Si |

### Modelo de planta

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `energy_areas` | `company_id` | Si |
| `utility_systems` | `company_id` | Si |
| `energy_equipment` | `company_id` | Si |
| `energy_sources` | `company_id` | Si |
| `measurement_points` | `company_id` | Si |
| `assets` | via `sites.company_id` | Si — mock local Core/CMMS |
| `energy_asset_profiles` | via `assets.site_id` | Si |
| `asset_registry_requests` | `company_id` | Si |
| `asset_registry_events` | `company_id` | Si |
| `energy_groups` | `site_id` | Si |
| `energy_group_members` | via `energy_groups` | Si |
| `energy_measurement_point_profiles` | via `measurement_points` | Si |
| `energy_measurement_bindings` | `site_id` | Si |
| `energy_scope_exceptions` | `site_id` | Si |

### Diagramas y topologia

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `energy_diagrams` | `company_id` | Si |
| `energy_diagram_nodes` | via FK a `energy_diagrams` | Si |
| `energy_diagram_edges` | via FK a `energy_diagrams` | Si |
| `energy_diagram_versions` | via FK a `energy_diagrams` | Si |
| `energy_topology_validation_issues` | via FK a `energy_diagrams` | Si |

#### E12: metadata de Workspace en `energy_diagrams`

`00035_e12_diagram_workspace.sql` agrega:

- `diagram_type`: `overview | utility | boundary | group | equipment |
  generated | custom`.
- `view_preset`: `macro | technical | balance | audit`.
- `workspace_notes`: nota libre opcional.
- `metadata`: objeto JSONB para preferencias de presentacion, origen de
  generacion e hints AI.
- Scope ampliado: `site | area | system | equipment | energy_group | asset |
  custom`.

Indices:

- `idx_diagrams_site_type_status(site_id, diagram_type, status)`.
- `idx_diagrams_site_scope_type(site_id, scope_type, scope_id)` cuando
  `scope_type` no es null.

Regla funcional: crear un diagrama crea una vista guardada del modelo
topologico; no crea ni duplica activos fisicos, medidores ni MeasurementPoints.

### Medicion

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `measurement_readings` | via FK a `measurement_points` | Si — `00020_measurement_readings.sql` |
| `energy_readings_raw` | `company_id` | Si — tabla heredada; el seed escribe en ambas |
| `energy_readings_validated` | `company_id` | Si |
| `energy_import_batches` | `company_id` | Si |

> **Nota:** `measurement_readings` es la tabla canonica usada por:
> `lastReadings.ts`, `useEquipmentMPs.ts`, `InspectorPanel.tsx` (ingreso manual),
> el modulo Medicion E5 y `calculated.ts` (MPs calculados). `energy_readings_raw`
> queda como tabla heredada para historico/importaciones futuras. El seed escribe
> en ambas por compatibilidad.
> La columna `quality` admite: `good | manual | calculated | estimated | delayed | suspect | missing`.
> Desde `00026_e1_registry_lifecycle.sql`, las lecturas acumuladoras/counter no
> pueden bajar contra la lectura anterior salvo evento auditado
> `meter_reset`, `meter_changed`, `meter_rollover` o `manual_correction`.

### Balances y desempeno

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `energy_balances` | `company_id` | Si |
| `energy_balance_sheets` | via `site_id` | Si — `00021_balance_sheets.sql`; E7 agrega scope/version oficial. |
| `energy_balance_entries` | via FK a `energy_balance_sheets` | Si |
| `energy_balance_results` | via FK a `energy_balance_sheets` | Si; E7 guarda `coverage_breakdown`, `topology_snapshot`, `findings`, `confidence_score`. |
| `relevant_variables` | via `site_id` | Si — E11; drivers, contexto y denominadores de EnPIs/Estudios. |
| `relevant_variable_readings` | via FK a `relevant_variables` | Si — E11; lecturas por frecuencia flexible. |
| `relevant_variable_groups` | via `site_id` | Si — buckets libres para variables relevantes. |
| `relevant_variable_group_members` | via FK a `relevant_variable_groups` | Si |
| `energy_enpis` | `company_id` | Si |
| `energy_enpi_groups` | via `site_id` | Si — portfolios libres de indicadores. |
| `energy_enpi_group_members` | via FK a `energy_enpi_groups` | Si |
| `energy_enpi_variable_links` | via FK a `energy_enpis` | Si — roles `denominator`, `driver`, `adjustment`, `context`, `segmentation`, `exclusion`. |
| `energy_baselines` | `company_id` | Si |
| `energy_targets` | `company_id` | Si |
| `energy_performance_results` | `company_id` | Si |
| `energy_studies` | via `site_id` | Si — `00023_energy_studies.sql`; E13 agrega `case_type`, prioridad, vencimiento, suficiencia, decision final y cierre. |
| `energy_study_sources` | via FK a `energy_studies` | Si |
| `energy_study_models` | via FK a `energy_studies` | Si |
| `energy_study_findings` | via FK a `energy_studies` | Si |
| `energy_study_decisions` | via FK a `energy_studies` | Si |
| `energy_study_activities` | via FK a `energy_studies` | Si — E13; tareas tecnicas tipo OT energetica. |
| `energy_study_evidence` | via FK a `energy_studies` | Si — E13; adjuntos/referencias/evidencias. |
| `energy_study_events` | via FK a `energy_studies` | Si — E13; bitacora append-only. |

`00024_energy_study_decision_links.sql` agrega trazabilidad directa desde
`energy_improvements` hacia estudios con `source_study_id` y
`source_study_model_id`.

### Acciones y proyectos

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `energy_improvements` | `company_id` | Si |
| `energy_improvement_evidence` | via FK | Si |
| `energy_project_phases` | via FK | Si |
| `energy_project_tasks` | via FK | Si |
| `energy_mv_plans` | via FK a `energy_improvements` | Si |
| `energy_cmms_handoff_requests` | via `site_id` | Si |
| `energy_improvement_events` | via FK o `site_id` | Si |

#### Monitoreo posterior de mejoras

`00016_improvement_monitoring_period.sql` agrega a `energy_improvements`:

- `monitoring_start` — inicio de la ventana de seguimiento.
- `monitoring_end` — fecha objetivo para validar sostenimiento.
- `monitoring_status` — `not_started`, `in_progress`, `passed` o `failed`.
- `monitoring_notes` — criterio o notas de sostenimiento.

La UI usa estos campos para evitar cierres instantaneos: una mejora
implementada pasa a verificacion, se monitorea durante un periodo
personalizado y solo despues se cierra como sostenida.

#### E9: M&V formal, auditoria y handoff CMMS

`00033_e9_execution_audit_cmms.sql` agrega:

- `energy_improvements.mv_plan_status`, `cmms_handoff_status` y `audit_status`.
- `energy_mv_plans` — baseline source, metodo, version, ventana de
  verificacion, ahorro esperado/real, criterios de aceptacion y evidencia.
- `energy_cmms_handoff_requests` — cola de solicitudes Energy<->Maint/CMMS.
  Energy no crea OTs directamente cuando Maint/CMMS existe; registra una
  solicitud y conserva M&V.
- `energy_improvement_events` — bitacora auditada de origen, cambios de estado,
  M&V, handoff, feedback CMMS y cierres.

Flujos seed E9:

- Proyecto Nave A: estudio E8 -> proyecto -> plan M&V aprobado -> solicitud
  Energy->CMMS con `VM-WO-2026-0007`.
- Feedback mantenimiento: CMMS->Energy por aislamiento termico deteriorado con
  `VM-WO-2026-0012`, creando accion energetica de seguimiento.

### SGEn

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `sgen_scopes` | via `site_id` | Si |
| `sgen_policy_documents` | via `site_id` | Si |
| `sgen_energy_reviews` | via `site_id` | Si |
| `sgen_significant_uses` | via `site_id` | Si |
| `sgen_objectives` | via `site_id` | Si |
| `sgen_evidence` | via `site_id` | Si |
| `sgen_audits` | via `site_id` | Si |
| `sgen_audit_findings` | via FK a `sgen_audits` | Si |
| `sgen_management_reviews` | via `site_id` | Si |
| `sgen_nonconformities` | via `site_id` | Si |
| `sgen_risks_opportunities` | via `site_id` | Si |
| `sgen_improvements` | via `site_id` | Si |
| `sgen_legal_notices` | via `site_id` | Si |

### Admin y configuracion

| Tabla | Clave de tenant | RLS |
|-------|----------------|-----|
| `energy_tariffs` | `company_id` | Si |
| `energy_emission_factors` | `company_id` | Si |
| `energy_system_parameters` | `company_id` | Si |

### Convergencia CMMS

| Objeto | Tipo | Proposito |
|--------|------|-----------|
| `assets` | Tabla Core/mock local | Primer contrato compartido con CMMS: `node_type`, `node_role`, `maintainable_kind`, agrupadores y mantenibles. En producción debe venir de Core/VersaMaint. |
| `energy_asset_profiles` | Tabla | Perfil energetico satelite por activo Core. No reemplaza la identidad fisica. |
| `assets_compat` | Vista SQL | Fallback temporal para modulos legacy; primero proyecta `assets` Core y luego tablas legacy. No debe ser contrato nuevo. |
| `company_products` / `site_products` | Tablas | Capacidades por empresa/sede para resolver `energy_only`, `maint_only`, `maint_and_energy`, `none`. |
| `asset_registry_requests` | Tabla | Solicitudes desde Energy cuando Maint gobierna altas/cambios de activos fisicos. CMMS/Core las decide con `fn_approve_asset_registry_request_tx` y `fn_reject_asset_registry_request_tx`. |
| `asset_registry_events` | Tabla | Historial append-only de solicitudes, adopciones, merges, sincronizacion futura y eventos de medidor/acumulador. |
| `energy_groups` | Tabla | Agrupadores energeticos propios de Energy; pueden diferir del arbol CMMS. |
| `energy_group_members` | Tabla | Miembros de grupos Energy: activos, medidores, MeasurementPoints, nodos/edges o subgrupos. |
| `energy_measurement_point_profiles` | Tabla | Perfil satelite Energy por MeasurementPoint: semantica, agregacion, frecuencia y validacion. |
| `energy_measurement_bindings` | Tabla | Binding formal de MeasurementPoint a asset, energy group, nodo/edge topologico, formula o fuente externa. |
| `energy_scope_exceptions` | Tabla | Excepciones de alcance/medicion sin deformar el arbol CMMS. |

### Permisos y site scope Core

`00027_e2_core_site_scope.sql` agrega `site_access` y los helpers:

| Helper | Uso |
|--------|-----|
| `fn_current_profile_id()` | Resuelve el perfil Energy del usuario autenticado. |
| `fn_user_can_access_site(user_id, site_id)` | Valida si el perfil puede ver/operar una sede. |

Reglas:

- Las tablas Core/mock filtran por sede, no solo por empresa.
- Si un usuario no tiene filas `site_access`, se conserva fallback por empresa
  para no romper el entorno de desarrollo.
- Si existe al menos una fila activa de `site_access`, el acceso queda
  restringido por `all_sites` o `specific_site`.
- Admin/manager gestionan `site_access`; engineer/operator consumen datos
  segun scope.

## Helpers RLS

- `get_my_company_id()` — retorna el `company_id` del usuario autenticado.
- Cada tabla con `company_id` tiene policy de lectura/escritura scoped.

## Convenciones

- Toda tabla con `company_id` debe tener RLS habilitado.
- No crear migraciones nuevas sin necesidad; preferir extender existentes
  durante desarrollo.
- El seed demo usa `admin@demo.com` / `AdminDemo123!`.
- Las tablas Core del CMMS (`assets`, `equipment_families`, etc.) se mockean
  localmente solo para desarrollo. En la base comun deben venir de
  VersaMaint/Core; Energy agrega tablas satelite como `energy_asset_profiles`.
