-- 00028_e3_energy_satellite_schema.sql
-- VersaEnergy E3 — schema satelite Energy sobre Core Asset Registry.

alter table public.energy_asset_profiles
  add column if not exists energy_status text not null default 'active'
    check (energy_status in ('active', 'excluded', 'under_review', 'retired')),
  add column if not exists energy_class text
    check (energy_class in ('primary_consumer', 'support_consumer', 'utility_infrastructure', 'generation', 'storage', 'instrumentation', 'other')),
  add column if not exists rated_power_kw numeric check (rated_power_kw is null or rated_power_kw >= 0),
  add column if not exists rated_flow numeric check (rated_flow is null or rated_flow >= 0),
  add column if not exists normal_operating_hours_per_year numeric check (normal_operating_hours_per_year is null or normal_operating_hours_per_year >= 0),
  add column if not exists baseline_relevance text not null default 'optional'
    check (baseline_relevance in ('primary', 'secondary', 'optional', 'excluded')),
  add column if not exists tags text[] not null default array[]::text[],
  add column if not exists notes text;

create table if not exists public.energy_groups (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references public.sites(id) on delete cascade,
  parent_energy_group_id uuid references public.energy_groups(id) on delete set null,
  code text,
  name text not null,
  description text,
  group_type text not null
    check (group_type in (
      'operational_scope',
      'utility_boundary',
      'metering_zone',
      'tariff_boundary',
      'production_line',
      'energy_project',
      'topology_group',
      'custom'
    )),
  utility_type text references public.utility_definitions(id),
  source text not null default 'manual'
    check (source in ('manual', 'generated_from_core', 'generated_from_topology', 'import')),
  active boolean not null default true,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id, code),
  check (jsonb_typeof(properties) = 'object')
);

create table if not exists public.energy_group_members (
  id uuid primary key default uuid_generate_v4(),
  energy_group_id uuid not null references public.energy_groups(id) on delete cascade,
  member_type text not null
    check (member_type in ('asset', 'physical_meter', 'measurement_point', 'topology_node', 'topology_edge', 'energy_group')),
  asset_id uuid references public.assets(id) on delete cascade,
  measurement_point_id uuid references public.measurement_points(id) on delete cascade,
  child_energy_group_id uuid references public.energy_groups(id) on delete cascade,
  topology_node_id uuid references public.energy_diagram_nodes(id) on delete cascade,
  topology_edge_id uuid references public.energy_diagram_edges(id) on delete cascade,
  role text not null default 'included'
    check (role in ('included', 'excluded', 'boundary', 'submeter', 'context')),
  allocation_factor numeric check (allocation_factor is null or allocation_factor >= 0),
  properties jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(properties) = 'object'),
  check (
    (member_type in ('asset', 'physical_meter') and asset_id is not null)
    or (member_type = 'measurement_point' and measurement_point_id is not null)
    or (member_type = 'energy_group' and child_energy_group_id is not null)
    or (member_type = 'topology_node' and topology_node_id is not null)
    or (member_type = 'topology_edge' and topology_edge_id is not null)
  )
);

create unique index if not exists uq_energy_group_members_asset
  on public.energy_group_members(energy_group_id, member_type, asset_id)
  where asset_id is not null and active = true;
create unique index if not exists uq_energy_group_members_mp
  on public.energy_group_members(energy_group_id, measurement_point_id)
  where measurement_point_id is not null and active = true;
create index if not exists idx_energy_groups_site
  on public.energy_groups(site_id, active, group_type);
create index if not exists idx_energy_group_members_group
  on public.energy_group_members(energy_group_id, active);

create table if not exists public.energy_measurement_point_profiles (
  measurement_point_id uuid primary key references public.measurement_points(id) on delete cascade,
  utility_type text references public.utility_definitions(id),
  energy_quantity text
    check (energy_quantity is null or energy_quantity in ('energy', 'power', 'volume', 'mass', 'flow', 'temperature', 'pressure', 'runtime', 'status', 'custom')),
  reading_semantics text not null default 'accumulator_delta'
    check (reading_semantics in ('accumulator_delta', 'instantaneous_value', 'status', 'event_count', 'calculated')),
  aggregation_method text not null default 'sum'
    check (aggregation_method in ('sum', 'avg', 'min', 'max', 'last', 'delta', 'count')),
  expected_frequency text not null default 'monthly'
    check (expected_frequency in ('realtime', 'hourly', 'daily', 'weekly', 'monthly', 'manual', 'on_demand')),
  validation_profile jsonb not null default '{}',
  source_owner text not null default 'energy'
    check (source_owner in ('energy', 'maintenance', 'production', 'external')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(validation_profile) = 'object')
);

create table if not exists public.energy_measurement_bindings (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references public.sites(id) on delete cascade,
  measurement_point_id uuid not null references public.measurement_points(id) on delete cascade,
  binding_type text not null
    check (binding_type in ('asset', 'energy_group', 'topology_node', 'topology_edge', 'formula', 'external')),
  asset_id uuid references public.assets(id) on delete cascade,
  energy_group_id uuid references public.energy_groups(id) on delete cascade,
  topology_node_id uuid references public.energy_diagram_nodes(id) on delete cascade,
  topology_edge_id uuid references public.energy_diagram_edges(id) on delete cascade,
  role text not null default 'indicator'
    check (role in ('boundary', 'submeter', 'allocation', 'indicator', 'context')),
  is_primary boolean not null default false,
  properties jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(properties) = 'object'),
  check (
    (binding_type = 'asset' and asset_id is not null)
    or (binding_type = 'energy_group' and energy_group_id is not null)
    or (binding_type = 'topology_node' and topology_node_id is not null)
    or (binding_type = 'topology_edge' and topology_edge_id is not null)
    or (binding_type in ('formula', 'external'))
  )
);

create unique index if not exists uq_energy_measurement_bindings_primary
  on public.energy_measurement_bindings(measurement_point_id)
  where is_primary = true and active = true;
create index if not exists idx_energy_measurement_bindings_site
  on public.energy_measurement_bindings(site_id, active, binding_type);
create index if not exists idx_energy_measurement_bindings_group
  on public.energy_measurement_bindings(energy_group_id)
  where energy_group_id is not null;

create table if not exists public.energy_scope_exceptions (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references public.sites(id) on delete cascade,
  scope_type text not null check (scope_type in ('asset', 'energy_group', 'topology')),
  scope_asset_id uuid references public.assets(id) on delete cascade,
  energy_group_id uuid references public.energy_groups(id) on delete cascade,
  topology_id uuid references public.energy_diagrams(id) on delete cascade,
  exception_type text not null
    check (exception_type in ('exclude_asset', 'include_asset', 'allocation_override', 'measurement_override', 'manual_note')),
  asset_id uuid references public.assets(id) on delete cascade,
  measurement_point_id uuid references public.measurement_points(id) on delete set null,
  allocation_factor numeric check (allocation_factor is null or allocation_factor >= 0),
  reason text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_energy_scope_exceptions_site
  on public.energy_scope_exceptions(site_id, active, scope_type);
create index if not exists idx_energy_scope_exceptions_group
  on public.energy_scope_exceptions(energy_group_id)
  where energy_group_id is not null;

alter table public.energy_diagrams
  add column if not exists topology_kind text not null default 'utility_flow'
    check (topology_kind in ('utility_flow', 'measurement_logic', 'balance_scope', 'custom')),
  add column if not exists source_model text not null default 'manual'
    check (source_model in ('manual', 'generated_from_core', 'generated_from_energy_group', 'import')),
  add column if not exists compiled_graph jsonb not null default '{}',
  add column if not exists published_version_id uuid references public.energy_diagram_versions(id) on delete set null;

alter table public.energy_diagram_nodes
  add column if not exists asset_id uuid references public.assets(id) on delete set null,
  add column if not exists energy_group_id uuid references public.energy_groups(id) on delete set null,
  add column if not exists measurement_point_id uuid references public.measurement_points(id) on delete set null,
  add column if not exists semantic_role text
    check (semantic_role is null or semantic_role in ('source', 'consumer', 'converter', 'storage', 'meter', 'junction', 'boundary', 'group'));

alter table public.energy_diagram_edges
  add column if not exists semantic_role text
    check (semantic_role is null or semantic_role in ('supply', 'return', 'loss', 'measurement_signal', 'allocation', 'virtual')),
  add column if not exists source_asset_id uuid references public.assets(id) on delete set null,
  add column if not exists target_asset_id uuid references public.assets(id) on delete set null;

alter table public.energy_diagram_versions
  add column if not exists validation_status text not null default 'not_validated'
    check (validation_status in ('not_validated', 'valid', 'warning', 'invalid')),
  add column if not exists compiled_snapshot jsonb not null default '{}';

alter table public.energy_groups enable row level security;
alter table public.energy_group_members enable row level security;
alter table public.energy_measurement_point_profiles enable row level security;
alter table public.energy_measurement_bindings enable row level security;
alter table public.energy_scope_exceptions enable row level security;

create policy "Energy groups - view scoped sites"
  on public.energy_groups for select
  using (public.fn_user_can_access_site(public.fn_current_profile_id(), site_id));
create policy "Energy groups - manage scoped sites"
  on public.energy_groups for all
  using (
    public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
    and get_my_role() in ('admin', 'engineer', 'manager')
  )
  with check (
    public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

create policy "Energy group members - view via group"
  on public.energy_group_members for select
  using (
    exists (
      select 1
      from public.energy_groups g
      where g.id = energy_group_id
        and public.fn_user_can_access_site(public.fn_current_profile_id(), g.site_id)
    )
  );
create policy "Energy group members - manage via group"
  on public.energy_group_members for all
  using (
    exists (
      select 1
      from public.energy_groups g
      where g.id = energy_group_id
        and public.fn_user_can_access_site(public.fn_current_profile_id(), g.site_id)
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  )
  with check (
    exists (
      select 1
      from public.energy_groups g
      where g.id = energy_group_id
        and public.fn_user_can_access_site(public.fn_current_profile_id(), g.site_id)
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

create policy "Energy MP profiles - view via MP"
  on public.energy_measurement_point_profiles for select
  using (
    exists (
      select 1
      from public.measurement_points mp
      where mp.id = measurement_point_id
        and public.fn_user_can_access_site(public.fn_current_profile_id(), mp.site_id)
    )
  );
create policy "Energy MP profiles - manage via MP"
  on public.energy_measurement_point_profiles for all
  using (
    exists (
      select 1
      from public.measurement_points mp
      where mp.id = measurement_point_id
        and public.fn_user_can_access_site(public.fn_current_profile_id(), mp.site_id)
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  )
  with check (
    exists (
      select 1
      from public.measurement_points mp
      where mp.id = measurement_point_id
        and public.fn_user_can_access_site(public.fn_current_profile_id(), mp.site_id)
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

create policy "Energy measurement bindings - view scoped sites"
  on public.energy_measurement_bindings for select
  using (public.fn_user_can_access_site(public.fn_current_profile_id(), site_id));
create policy "Energy measurement bindings - manage scoped sites"
  on public.energy_measurement_bindings for all
  using (
    public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
    and get_my_role() in ('admin', 'engineer', 'manager')
  )
  with check (
    public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

create policy "Energy scope exceptions - view scoped sites"
  on public.energy_scope_exceptions for select
  using (public.fn_user_can_access_site(public.fn_current_profile_id(), site_id));
create policy "Energy scope exceptions - manage scoped sites"
  on public.energy_scope_exceptions for all
  using (
    public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
    and get_my_role() in ('admin', 'engineer', 'manager')
  )
  with check (
    public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
    and get_my_role() in ('admin', 'engineer', 'manager')
  );
