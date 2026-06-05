-- 00034_e11_enpi_relevant_variables.sql
-- E11: EnPI portfolio groups + relevant variables registry.
--
-- This migration keeps the historical reset chain intact but makes the new
-- canonical model neutral: relevant variables, not only production variables.

-- ── 1. Rename old production tables into the canonical registry ──────────────

do $$
begin
  if to_regclass('public.production_variables') is not null
     and to_regclass('public.relevant_variables') is null then
    alter table public.production_variables rename to relevant_variables;
  end if;

  if to_regclass('public.production_readings') is not null
     and to_regclass('public.relevant_variable_readings') is null then
    alter table public.production_readings rename to relevant_variable_readings;
  end if;
end $$;

-- ── 2. Relevant variables registry ───────────────────────────────────────────

alter table public.relevant_variables
  add column if not exists code text,
  add column if not exists variable_type text not null default 'production',
  add column if not exists unit_family text,
  add column if not exists default_frequency text not null default 'monthly',
  add column if not exists aggregation_method text not null default 'sum',
  add column if not exists scope_type text not null default 'site',
  add column if not exists scope_id uuid,
  add column if not exists is_driver_candidate boolean not null default true,
  add column if not exists properties jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.relevant_variables
  drop constraint if exists production_variables_source_type_check,
  drop constraint if exists relevant_variables_source_type_check,
  drop constraint if exists relevant_variables_variable_type_check,
  drop constraint if exists relevant_variables_default_frequency_check,
  drop constraint if exists relevant_variables_aggregation_method_check,
  drop constraint if exists relevant_variables_scope_type_check,
  drop constraint if exists relevant_variables_properties_object_check;

alter table public.relevant_variables
  add constraint relevant_variables_source_type_check
    check (source_type in ('manual','iot_db','api_pull','api_push','file_import','calculated')),
  add constraint relevant_variables_variable_type_check
    check (variable_type in (
      'production',
      'environment',
      'occupancy',
      'area',
      'runtime',
      'quality',
      'weather',
      'cost',
      'tariff',
      'operation',
      'custom'
    )),
  add constraint relevant_variables_default_frequency_check
    check (default_frequency in (
      'realtime',
      'hourly',
      'daily',
      'weekly',
      'monthly',
      'quarterly',
      'annual',
      'event',
      'ad_hoc'
    )),
  add constraint relevant_variables_aggregation_method_check
    check (aggregation_method in ('sum','avg','min','max','last','delta','weighted_avg','count')),
  add constraint relevant_variables_scope_type_check
    check (scope_type in ('site','asset','energy_group','enpi_group','manual','custom')),
  add constraint relevant_variables_properties_object_check
    check (jsonb_typeof(properties) = 'object');

create unique index if not exists idx_relevant_variables_site_code
  on public.relevant_variables(site_id, code)
  where code is not null;

create index if not exists idx_relevant_variables_site_type
  on public.relevant_variables(site_id, variable_type, is_active);

create table if not exists public.relevant_variable_groups (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  parent_group_id uuid references public.relevant_variable_groups(id) on delete cascade,
  name text not null,
  code text,
  description text,
  group_type text not null default 'custom'
    check (group_type in ('production','environment','operation','area','quality','cost','custom')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  properties jsonb not null default '{}'::jsonb
    check (jsonb_typeof(properties) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id, code)
);

create table if not exists public.relevant_variable_group_members (
  group_id uuid not null references public.relevant_variable_groups(id) on delete cascade,
  variable_id uuid not null references public.relevant_variables(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (group_id, variable_id)
);

-- ── 3. Flexible readings ─────────────────────────────────────────────────────

alter table public.relevant_variable_readings
  drop constraint if exists production_readings_variable_id_period_start_period_end_key,
  drop constraint if exists relevant_variable_readings_variable_id_period_start_period_end_key;

alter table public.relevant_variable_readings
  alter column period_start type timestamptz using period_start::timestamptz,
  alter column period_end type timestamptz using period_end::timestamptz;

alter table public.relevant_variable_readings
  add column if not exists frequency text not null default 'monthly',
  add column if not exists unit_snapshot text,
  add column if not exists quality text not null default 'measured',
  add column if not exists source_type text not null default 'manual',
  add column if not exists source_ref text,
  add column if not exists properties jsonb not null default '{}'::jsonb;

alter table public.relevant_variable_readings
  drop constraint if exists relevant_variable_readings_frequency_check,
  drop constraint if exists relevant_variable_readings_quality_check,
  drop constraint if exists relevant_variable_readings_source_type_check,
  drop constraint if exists relevant_variable_readings_properties_object_check,
  add constraint relevant_variable_readings_frequency_check
    check (frequency in (
      'realtime',
      'hourly',
      'daily',
      'weekly',
      'monthly',
      'quarterly',
      'annual',
      'event',
      'ad_hoc'
    )),
  add constraint relevant_variable_readings_quality_check
    check (quality in ('measured','estimated','manual','calculated','imported','missing','suspect')),
  add constraint relevant_variable_readings_source_type_check
    check (source_type in ('manual','iot_db','api_pull','api_push','file_import','calculated')),
  add constraint relevant_variable_readings_properties_object_check
    check (jsonb_typeof(properties) = 'object');

alter table public.relevant_variable_readings
  add constraint relevant_variable_readings_var_period_frequency_key
  unique (variable_id, period_start, period_end, frequency);

create index if not exists idx_relevant_readings_var_period
  on public.relevant_variable_readings(variable_id, period_start, frequency);

-- ── 4. EnPI groups and links ─────────────────────────────────────────────────

create table if not exists public.energy_enpi_groups (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  parent_group_id uuid references public.energy_enpi_groups(id) on delete cascade,
  name text not null,
  code text,
  description text,
  group_type text not null default 'custom'
    check (group_type in ('utility','line','area','process','sgen','study','custom')),
  utility_type text references public.utility_definitions(id),
  scope_type text check (scope_type is null or scope_type in ('site','asset','energy_group','manual','custom')),
  scope_id uuid,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  properties jsonb not null default '{}'::jsonb
    check (jsonb_typeof(properties) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id, code)
);

create table if not exists public.energy_enpi_group_members (
  group_id uuid not null references public.energy_enpi_groups(id) on delete cascade,
  enpi_id uuid not null references public.energy_enpis(id) on delete cascade,
  membership_role text not null default 'portfolio'
    check (membership_role in ('primary','portfolio','analysis','reporting')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (group_id, enpi_id, membership_role)
);

alter table public.energy_enpis
  add column if not exists primary_group_id uuid references public.energy_enpi_groups(id) on delete set null,
  add column if not exists calculation_frequency text,
  add column if not exists aggregation_window text,
  add column if not exists normalization_basis jsonb not null default '{}'::jsonb;

alter table public.energy_enpis
  drop constraint if exists energy_enpis_denominator_type_check,
  drop constraint if exists energy_enpis_calculation_frequency_check,
  drop constraint if exists energy_enpis_normalization_basis_object_check;

update public.energy_enpis
set denominator_type = 'relevant_variable'
where denominator_type = 'production_variable';

alter table public.energy_enpis
  add constraint energy_enpis_denominator_type_check
    check (denominator_type in ('formula','relevant_variable')),
  add constraint energy_enpis_calculation_frequency_check
    check (calculation_frequency is null or calculation_frequency in (
      'hourly','daily','weekly','monthly','quarterly','annual','ad_hoc'
    )),
  add constraint energy_enpis_normalization_basis_object_check
    check (jsonb_typeof(normalization_basis) = 'object');

create table if not exists public.energy_enpi_variable_links (
  id uuid primary key default gen_random_uuid(),
  enpi_id uuid not null references public.energy_enpis(id) on delete cascade,
  variable_id uuid not null references public.relevant_variables(id) on delete cascade,
  link_role text not null
    check (link_role in ('denominator','driver','adjustment','context','segmentation','exclusion')),
  is_required boolean not null default false,
  aggregation_method text
    check (aggregation_method is null or aggregation_method in ('sum','avg','min','max','last','delta','weighted_avg','count')),
  notes text,
  created_at timestamptz not null default now(),
  unique(enpi_id, variable_id, link_role)
);

create index if not exists idx_enpi_groups_site
  on public.energy_enpi_groups(site_id, group_type, is_active);

create index if not exists idx_enpi_group_members_enpi
  on public.energy_enpi_group_members(enpi_id);

create index if not exists idx_enpi_variable_links_enpi
  on public.energy_enpi_variable_links(enpi_id, link_role);

-- ── 5. Study vocabulary now points to relevant variables ─────────────────────

alter table public.energy_study_sources
  drop constraint if exists energy_study_sources_source_type_check;

update public.energy_study_sources
set source_type = 'relevant_variable'
where source_type = 'production_variable';

alter table public.energy_study_sources
  add constraint energy_study_sources_source_type_check
  check (source_type in (
    'measurement_point',
    'balance_sheet',
    'relevant_variable',
    'manual',
    'external',
    'calculated'
  ));

alter table public.energy_study_variable_candidates
  drop constraint if exists energy_study_variable_candidates_variable_type_check;

update public.energy_study_variable_candidates
set variable_type = 'relevant_variable'
where variable_type = 'production_variable';

alter table public.energy_study_variable_candidates
  add constraint energy_study_variable_candidates_variable_type_check
  check (variable_type in (
    'relevant_variable',
    'operational',
    'weather',
    'quality',
    'manual'
  ));

-- ── 6. RLS ───────────────────────────────────────────────────────────────────

alter table public.relevant_variables enable row level security;
alter table public.relevant_variable_readings enable row level security;
alter table public.relevant_variable_groups enable row level security;
alter table public.relevant_variable_group_members enable row level security;
alter table public.energy_enpi_groups enable row level security;
alter table public.energy_enpi_group_members enable row level security;
alter table public.energy_enpi_variable_links enable row level security;

drop policy if exists "prod_variables_auth" on public.relevant_variables;
drop policy if exists "relevant_variables_auth" on public.relevant_variables;
create policy "relevant_variables_auth" on public.relevant_variables
  for all to authenticated
  using (
    site_id in (
      select s.id from public.sites s
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  )
  with check (
    site_id in (
      select s.id from public.sites s
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

drop policy if exists "prod_readings_auth" on public.relevant_variable_readings;
drop policy if exists "relevant_variable_readings_auth" on public.relevant_variable_readings;
create policy "relevant_variable_readings_auth" on public.relevant_variable_readings
  for all to authenticated
  using (
    variable_id in (
      select rv.id from public.relevant_variables rv
      join public.sites s on s.id = rv.site_id
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  )
  with check (
    variable_id in (
      select rv.id from public.relevant_variables rv
      join public.sites s on s.id = rv.site_id
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

drop policy if exists "relevant_variable_groups_auth" on public.relevant_variable_groups;
create policy "relevant_variable_groups_auth" on public.relevant_variable_groups
  for all to authenticated
  using (
    site_id in (
      select s.id from public.sites s
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  )
  with check (
    site_id in (
      select s.id from public.sites s
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

drop policy if exists "relevant_variable_group_members_auth" on public.relevant_variable_group_members;
create policy "relevant_variable_group_members_auth" on public.relevant_variable_group_members
  for all to authenticated
  using (
    group_id in (
      select g.id from public.relevant_variable_groups g
      join public.sites s on s.id = g.site_id
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  )
  with check (
    group_id in (
      select g.id from public.relevant_variable_groups g
      join public.sites s on s.id = g.site_id
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

drop policy if exists "energy_enpi_groups_auth" on public.energy_enpi_groups;
create policy "energy_enpi_groups_auth" on public.energy_enpi_groups
  for all to authenticated
  using (
    site_id in (
      select s.id from public.sites s
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  )
  with check (
    site_id in (
      select s.id from public.sites s
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

drop policy if exists "energy_enpi_group_members_auth" on public.energy_enpi_group_members;
create policy "energy_enpi_group_members_auth" on public.energy_enpi_group_members
  for all to authenticated
  using (
    group_id in (
      select g.id from public.energy_enpi_groups g
      join public.sites s on s.id = g.site_id
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  )
  with check (
    group_id in (
      select g.id from public.energy_enpi_groups g
      join public.sites s on s.id = g.site_id
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

drop policy if exists "energy_enpi_variable_links_auth" on public.energy_enpi_variable_links;
create policy "energy_enpi_variable_links_auth" on public.energy_enpi_variable_links
  for all to authenticated
  using (
    enpi_id in (
      select e.id from public.energy_enpis e
      join public.sites s on s.id = e.site_id
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  )
  with check (
    enpi_id in (
      select e.id from public.energy_enpis e
      join public.sites s on s.id = e.site_id
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

comment on table public.relevant_variables is
  'E11 canonical registry for relevant variables used by EnPIs, studies and energy reviews. Variables may represent production, weather, occupancy, area, runtime, quality, cost or custom operational drivers.';

comment on table public.energy_enpi_groups is
  'E11 custom EnPI portfolio groups. One EnPI may belong to multiple groups for utility, line, process, reporting or study workflows.';

comment on table public.energy_enpi_variable_links is
  'E11 formal relationship between EnPIs and relevant variables: denominator, driver, adjustment, context, segmentation or exclusion.';
