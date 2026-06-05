-- 00030_e6_topology.sql
-- VersaEnergy E6-A — Topology Engine 2.0 data model hardening.
-- Additive over E3/E5: typed node identity, canonical energy_role,
-- external energy sources, canonical group/binding roles, and boundary uniqueness.

------------------------------------------------------------
-- Canonical role normalizers
------------------------------------------------------------

create or replace function public.fn_e6_normalize_energy_role(input_role text)
returns text
language sql
immutable
as $$
  select case input_role
    when 'consumer' then 'load'
    when 'producer' then 'source'
    when 'distributor' then 'distribution'
    when 'converter' then 'conversion'
    when 'meter' then 'instrument'
    when 'measurement_device' then 'instrument'
    when 'measurement_subsystem' then 'instrument'
    when 'boundary' then 'virtual'
    when 'group' then 'virtual'
    else input_role
  end;
$$;

create or replace function public.fn_e6_energy_role_from_node_type(input_node_type text)
returns text
language sql
immutable
as $$
  select case input_node_type
    when 'utility_source' then 'source'
    when 'port_in' then 'source'
    when 'source' then 'source'
    when 'generator' then 'source'
    when 'consumer' then 'load'
    when 'load' then 'load'
    when 'motor' then 'load'
    when 'pump' then 'load'
    when 'fan' then 'load'
    when 'heat_exchanger' then 'conversion'
    when 'converter' then 'conversion'
    when 'boiler' then 'conversion'
    when 'chiller' then 'conversion'
    when 'transformer' then 'distribution'
    when 'panel' then 'distribution'
    when 'breaker' then 'distribution'
    when 'header' then 'distribution'
    when 'pipe' then 'distribution'
    when 'duct' then 'distribution'
    when 'busbar' then 'distribution'
    when 'valve' then 'distribution'
    when 'regulator' then 'distribution'
    when 'storage' then 'storage'
    when 'battery_storage' then 'storage'
    when 'tank' then 'storage'
    when 'junction' then 'junction'
    when 'child_block' then 'virtual'
    when 'area' then 'virtual'
    when 'process' then 'virtual'
    when 'meter' then 'instrument'
    when 'power_meter' then 'instrument'
    when 'energy_meter' then 'instrument'
    when 'gas_meter' then 'instrument'
    when 'steam_meter' then 'instrument'
    when 'flow_meter' then 'instrument'
    when 'current_transformer' then 'instrument'
    else null
  end;
$$;

create or replace function public.fn_e6_normalize_group_type(input_group_type text)
returns text
language sql
immutable
as $$
  select case input_group_type
    when 'utility_boundary' then 'balance_boundary'
    when 'tariff_boundary' then 'balance_boundary'
    when 'metering_zone' then 'measurement_zone'
    when 'operational_scope' then 'reporting_scope'
    when 'topology_group' then 'reporting_scope'
    when 'production_line' then 'seu'
    when 'energy_project' then 'custom'
    else input_group_type
  end;
$$;

------------------------------------------------------------
-- energy_sources as first-class external supply entity
------------------------------------------------------------

alter table public.energy_sources
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists supplier text,
  add column if not exists account_ref text,
  add column if not exists default_unit text,
  add column if not exists calorific_basis text,
  add column if not exists calorific_value numeric,
  add column if not exists calorific_unit text,
  add column if not exists emission_factor_ref text,
  add column if not exists tariff_ref text,
  add column if not exists is_maintainable boolean not null default false,
  add column if not exists active boolean not null default true,
  add column if not exists properties jsonb not null default '{}'::jsonb;

update public.energy_sources es
set company_id = s.company_id
from public.sites s
where es.company_id is null
  and es.site_id = s.id;

update public.energy_sources es
set default_unit = ud.default_unit
from public.utility_definitions ud
where es.default_unit is null
  and es.utility_type = ud.id;

update public.energy_sources
set default_unit = coalesce(default_unit, 'unit'),
    active = coalesce(active, is_active, true),
    properties = coalesce(properties, '{}'::jsonb);

alter table public.energy_sources
  alter column site_id drop not null,
  alter column company_id set not null,
  alter column default_unit set not null,
  drop constraint if exists energy_sources_calorific_basis_check,
  drop constraint if exists energy_sources_properties_object_check;

alter table public.energy_sources
  add constraint energy_sources_calorific_basis_check
    check (calorific_basis is null or calorific_basis in ('HHV', 'LHV')),
  add constraint energy_sources_properties_object_check
    check (jsonb_typeof(properties) = 'object');

create or replace function public.fn_e6_normalize_energy_source()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.company_id is null and new.site_id is not null then
    select s.company_id into new.company_id
    from public.sites s
    where s.id = new.site_id;
  end if;

  if new.default_unit is null and new.utility_type is not null then
    select ud.default_unit into new.default_unit
    from public.utility_definitions ud
    where ud.id = new.utility_type;
  end if;

  new.default_unit := coalesce(new.default_unit, 'unit');
  new.active := coalesce(new.active, new.is_active, true);
  new.properties := coalesce(new.properties, '{}'::jsonb);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_e6_normalize_energy_source on public.energy_sources;
create trigger trg_e6_normalize_energy_source
  before insert or update on public.energy_sources
  for each row execute function public.fn_e6_normalize_energy_source();

alter table public.energy_sources enable row level security;

drop policy if exists "Sources — view in own company" on public.energy_sources;
drop policy if exists "Sources — manage in own company" on public.energy_sources;
drop policy if exists "Energy sources - view scoped sites" on public.energy_sources;
drop policy if exists "Energy sources - manage scoped sites" on public.energy_sources;

create policy "Energy sources - view scoped sites"
  on public.energy_sources for select
  using (
    (
      site_id is not null
      and public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
    )
    or (
      site_id is null
      and company_id = public.get_my_company_id()
    )
  );

create policy "Energy sources - manage scoped sites"
  on public.energy_sources for all
  using (
    public.get_my_role() in ('admin', 'engineer', 'manager')
    and (
      (
        site_id is not null
        and public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
      )
      or (
        site_id is null
        and company_id = public.get_my_company_id()
      )
    )
  )
  with check (
    public.get_my_role() in ('admin', 'engineer', 'manager')
    and (
      (
        site_id is not null
        and public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
      )
      or (
        site_id is null
        and company_id = public.get_my_company_id()
      )
    )
  );

comment on table public.energy_sources is
  'E6 external energy supply identity. Infrastructure remains a Core asset; diagram nodes only reference this entity.';
comment on column public.energy_sources.calorific_basis is
  'Fuel energy basis for combustion utilities. Allowed values: HHV or LHV.';

------------------------------------------------------------
-- Canonical energy_role on asset profiles
------------------------------------------------------------

alter table public.energy_asset_profiles
  drop constraint if exists energy_asset_profiles_energy_role_check;

update public.energy_asset_profiles
set energy_role = public.fn_e6_normalize_energy_role(energy_role)
where energy_role is not null;

alter table public.energy_asset_profiles
  add constraint energy_asset_profiles_energy_role_check
    check (
      energy_role is null
      or energy_role in (
        'source', 'distribution', 'conversion', 'storage',
        'load', 'junction', 'virtual', 'instrument'
      )
    );

create or replace function public.fn_e6_normalize_energy_asset_profile()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.energy_role := public.fn_e6_normalize_energy_role(new.energy_role);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_e6_normalize_energy_asset_profile on public.energy_asset_profiles;
create trigger trg_e6_normalize_energy_asset_profile
  before insert or update on public.energy_asset_profiles
  for each row execute function public.fn_e6_normalize_energy_asset_profile();

------------------------------------------------------------
-- Canonical energy groups
------------------------------------------------------------

alter table public.energy_groups
  drop constraint if exists energy_groups_group_type_check;

update public.energy_groups
set group_type = public.fn_e6_normalize_group_type(group_type)
where group_type is not null;

create or replace function public.fn_e6_normalize_energy_group()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.group_type := public.fn_e6_normalize_group_type(new.group_type);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_e6_normalize_energy_group on public.energy_groups;
create trigger trg_e6_normalize_energy_group
  before insert or update on public.energy_groups
  for each row execute function public.fn_e6_normalize_energy_group();

alter table public.energy_groups
  add constraint energy_groups_group_type_check
    check (group_type in (
      'balance_boundary',
      'measurement_zone',
      'reporting_scope',
      'seu',
      'custom'
    ));

comment on column public.energy_groups.group_type is
  'E6 canonical group purpose: balance_boundary, measurement_zone, reporting_scope, seu, or custom.';

------------------------------------------------------------
-- Diagram nodes: typed identity and canonical energy_role
------------------------------------------------------------

alter table public.energy_diagram_nodes
  add column if not exists energy_source_id uuid references public.energy_sources(id) on delete set null,
  add column if not exists energy_role text;

update public.energy_diagram_nodes
set energy_role = coalesce(
      public.fn_e6_normalize_energy_role(energy_role),
      public.fn_e6_normalize_energy_role(semantic_role),
      public.fn_e6_energy_role_from_node_type(node_type)
    ),
    semantic_role = null
where energy_role is null
   or semantic_role is not null;

update public.energy_diagram_nodes
set asset_id = (properties #>> '{asset_binding,entity_id}')::uuid
where asset_id is null
  and properties #>> '{asset_binding,entity_type}' in ('asset', 'equipment')
  and properties #>> '{asset_binding,entity_id}' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.assets a
    where a.id = (properties #>> '{asset_binding,entity_id}')::uuid
  );

alter table public.energy_diagram_nodes
  drop constraint if exists energy_diagram_nodes_energy_role_check,
  drop constraint if exists energy_diagram_nodes_single_identity;

alter table public.energy_diagram_nodes
  add constraint energy_diagram_nodes_energy_role_check
    check (
      energy_role is null
      or energy_role in (
        'source', 'distribution', 'conversion', 'storage',
        'load', 'junction', 'virtual', 'instrument'
      )
    ),
  add constraint energy_diagram_nodes_single_identity
    check (
      ((asset_id is not null)::int
      + (energy_group_id is not null)::int
      + (energy_source_id is not null)::int) <= 1
    );

alter table public.energy_diagram_nodes
  add column if not exists identity_kind text
    generated always as (
      case
        when asset_id is not null then 'core_asset'
        when energy_group_id is not null then 'energy_group'
        when energy_source_id is not null then 'external_source'
        else 'virtual'
      end
    ) stored;

create or replace function public.fn_e6_normalize_energy_diagram_node()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  asset_binding_id text;
begin
  new.energy_role := coalesce(
    public.fn_e6_normalize_energy_role(new.energy_role),
    public.fn_e6_normalize_energy_role(new.semantic_role),
    public.fn_e6_energy_role_from_node_type(new.node_type)
  );

  -- The node role is energy_role. semantic_role is left only as a dormant legacy column.
  new.semantic_role := null;

  if new.asset_id is null then
    asset_binding_id := new.properties #>> '{asset_binding,entity_id}';
    if new.properties #>> '{asset_binding,entity_type}' in ('asset', 'equipment')
       and asset_binding_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       and exists (
         select 1
         from public.assets a
         where a.id = asset_binding_id::uuid
       ) then
      new.asset_id := asset_binding_id::uuid;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_e6_normalize_energy_diagram_node on public.energy_diagram_nodes;
create trigger trg_e6_normalize_energy_diagram_node
  before insert or update on public.energy_diagram_nodes
  for each row execute function public.fn_e6_normalize_energy_diagram_node();

comment on column public.energy_diagram_nodes.energy_role is
  'E6 canonical topology role. split/merge are derived from graph shape; meter_anchor is a measurement binding, not a node role.';
comment on column public.energy_diagram_nodes.identity_kind is
  'Generated discriminator from typed FKs: core_asset, energy_group, external_source, or virtual.';
comment on column public.energy_diagram_nodes.semantic_role is
  'Deprecated for node roles after E6. Edge semantic_role remains active.';

------------------------------------------------------------
-- Measurement bindings: canonical roles and boundary uniqueness
------------------------------------------------------------

alter table public.energy_measurement_bindings
  add column if not exists utility_type text references public.utility_definitions(id) on delete restrict;

alter table public.energy_measurement_bindings
  drop constraint if exists energy_measurement_bindings_role_check,
  drop constraint if exists energy_measurement_bindings_group_boundary_utility_check;

update public.energy_measurement_bindings emb
set role = case when emb.role = 'indicator' then 'context' else emb.role end,
    utility_type = coalesce(emb.utility_type, emp.utility_type, mp.utility)
from public.measurement_points mp
left join public.energy_measurement_point_profiles emp
  on emp.measurement_point_id = mp.id
where emb.measurement_point_id = mp.id;

create or replace function public.fn_e6_normalize_energy_measurement_binding()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role = 'indicator' then
    new.role := 'context';
  end if;

  if new.utility_type is null and new.measurement_point_id is not null then
    select coalesce(emp.utility_type, mp.utility)
    into new.utility_type
    from public.measurement_points mp
    left join public.energy_measurement_point_profiles emp
      on emp.measurement_point_id = mp.id
    where mp.id = new.measurement_point_id;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_e6_normalize_energy_measurement_binding on public.energy_measurement_bindings;
create trigger trg_e6_normalize_energy_measurement_binding
  before insert or update on public.energy_measurement_bindings
  for each row execute function public.fn_e6_normalize_energy_measurement_binding();

alter table public.energy_measurement_bindings
  add constraint energy_measurement_bindings_role_check
    check (role in ('boundary', 'submeter', 'allocation', 'context')),
  add constraint energy_measurement_bindings_group_boundary_utility_check
    check (
      role <> 'boundary'
      or binding_type <> 'energy_group'
      or energy_group_id is null
      or utility_type is not null
    );

drop index if exists public.uq_emb_group_boundary;
create unique index uq_emb_group_boundary
  on public.energy_measurement_bindings(energy_group_id, utility_type)
  where role = 'boundary'
    and is_primary = true
    and active = true
    and energy_group_id is not null;

create index if not exists idx_energy_measurement_bindings_group_utility
  on public.energy_measurement_bindings(energy_group_id, utility_type)
  where energy_group_id is not null;

comment on column public.energy_measurement_bindings.utility_type is
  'E6 utility discriminator for boundary uniqueness and compiler scope resolution.';
comment on index public.uq_emb_group_boundary is
  'E6 invariant: one primary boundary MeasurementPoint per energy group and utility.';
