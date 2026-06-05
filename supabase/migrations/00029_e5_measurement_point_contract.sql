-- 00029_e5_measurement_point_contract.sql
-- E5 — MeasurementPoint compartido:
-- - scope explicito sobre asset Core, Energy group, topologia, formula o externo;
-- - medidor fisico opcional;
-- - captura manual como fuente productiva vigente.

alter table public.measurement_points
  drop constraint if exists measurement_points_target_type_check;

alter table public.measurement_points
  add constraint measurement_points_target_type_check
  check (
    target_type is null
    or target_type in (
      'node',
      'edge',
      'system',
      'area',
      'equipment',
      'asset',
      'energy_group',
      'topology_node',
      'topology_edge',
      'formula',
      'external'
    )
  );

alter table public.measurement_points
  alter column source_type set default 'manual';

create index if not exists idx_mp_scope_asset
  on public.measurement_points(scope_asset_id)
  where scope_asset_id is not null;

create index if not exists idx_mp_physical_meter
  on public.measurement_points(physical_meter_asset_id)
  where physical_meter_asset_id is not null;

create index if not exists idx_mp_domains
  on public.measurement_points using gin(domains);

comment on column public.measurement_points.physical_meter_asset_id is
  'Optional Core asset for the physical meter. MeasurementPoints can exist without a physical meter.';

comment on column public.measurement_points.scope_asset_id is
  'Optional Core asset scope measured by this point. Energy group/topology/formula scopes are represented by target_type/target_id and energy_measurement_bindings.';

comment on column public.measurement_points.source_type is
  'E5 productive source is manual. file_import, api_pull/api_push, iot_db and calculated remain in development placeholders.';
