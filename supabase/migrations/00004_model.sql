-- 00004_model.sql
-- VersaEnergy — Modelo Energy & Utilities + MeasurementPoints

create table if not exists energy_areas (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  code text,
  description text,
  parent_area_id uuid references energy_areas(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table energy_areas enable row level security;

create policy "Areas — view in own company"
  on energy_areas for select
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
  );

create policy "Areas — manage in own company"
  on energy_areas for all
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

create table if not exists utility_systems (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  description text,
  utility_type text not null references utility_definitions(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table utility_systems enable row level security;

create policy "Systems — view in own company"
  on utility_systems for select
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
  );

create policy "Systems — manage in own company"
  on utility_systems for all
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

create table if not exists energy_equipment (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  tag text not null,
  name text not null,
  equipment_type text not null,
  utility_type text not null references utility_definitions(id),
  area_id uuid references energy_areas(id) on delete set null,
  utility_system_id uuid references utility_systems(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive', 'planned', 'retired')),
  properties jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id, tag)
);

alter table energy_equipment enable row level security;

create policy "Equipment — view in own company"
  on energy_equipment for select
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
  );

create policy "Equipment — manage in own company"
  on energy_equipment for all
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

create table if not exists energy_sources (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  source_type text not null check (source_type in ('utility_grid', 'renewable', 'generator', 'storage', 'fuel_delivery', 'water_main', 'custom')),
  utility_type text not null references utility_definitions(id),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table energy_sources enable row level security;

create policy "Sources — view in own company"
  on energy_sources for select
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
  );

create policy "Sources — manage in own company"
  on energy_sources for all
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

create table if not exists measurement_points (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  tag text not null,
  name text not null,
  target_type text not null check (target_type in ('node', 'edge', 'system', 'area')),
  target_id uuid not null,
  utility text not null references utility_definitions(id),
  measurement_type text not null check (measurement_type in ('instantaneous', 'accumulator', 'counter', 'status', 'calculated', 'manual')),
  quantity text not null check (quantity in ('flow', 'volume', 'mass', 'energy', 'power', 'pressure', 'temperature', 'level', 'current', 'voltage', 'runtime', 'custom')),
  unit text not null,
  source_type text not null check (source_type in ('manual', 'iot', 'calculated')),
  source_config jsonb not null default '{}',
  accumulator_config jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id, tag)
);

alter table measurement_points enable row level security;

create policy "Measurement points — view in own company"
  on measurement_points for select
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
  );

create policy "Measurement points — manage in own company"
  on measurement_points for all
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

create index if not exists idx_equipment_site on energy_equipment(site_id);
create index if not exists idx_equipment_area on energy_equipment(area_id);
create index if not exists idx_equipment_utility on energy_equipment(utility_type);
create index if not exists idx_mp_site on measurement_points(site_id);
create index if not exists idx_mp_utility on measurement_points(utility);
create index if not exists idx_mp_target on measurement_points(target_type, target_id);
