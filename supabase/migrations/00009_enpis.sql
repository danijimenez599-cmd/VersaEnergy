-- 00009_enpis.sql
-- VersaEnergy — EnPI, Baselines, Targets, Performance Results

create table if not exists energy_enpis (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  description text,
  utility text not null references utility_definitions(id),
  formula jsonb not null,
  unit text not null,
  scope text not null check (scope in ('site', 'area', 'equipment', 'process', 'utility_system')),
  scope_id uuid,
  frequency text not null default 'monthly' check (frequency in ('hourly', 'daily', 'weekly', 'monthly')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table energy_enpis enable row level security;

create policy "EnPIs — view in own company"
  on energy_enpis for select
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
  );

create policy "EnPIs — manage in own company"
  on energy_enpis for all
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
  );

create table if not exists energy_baselines (
  id uuid primary key default uuid_generate_v4(),
  enpi_id uuid not null references energy_enpis(id) on delete cascade,
  version integer not null default 1,
  reference_period_start date,
  reference_period_end date,
  method text not null default 'average' check (method in ('average', 'linear_regression', 'moving_average')),
  value numeric not null,
  unit text not null,
  created_at timestamptz not null default now()
);

alter table energy_baselines enable row level security;

create policy "Baselines — view via enpi"
  on energy_baselines for select
  using (
    enpi_id in (
      select e.id from energy_enpis e
      join sites s on s.id = e.site_id
      where s.company_id = get_my_company_id()
    )
  );

create policy "Baselines — manage via enpi"
  on energy_baselines for all
  using (
    enpi_id in (
      select e.id from energy_enpis e
      join sites s on s.id = e.site_id
      where s.company_id = get_my_company_id()
    )
  );

create table if not exists energy_targets (
  id uuid primary key default uuid_generate_v4(),
  enpi_id uuid not null references energy_enpis(id) on delete cascade,
  name text not null,
  target_type text not null check (target_type in ('reduction_percent', 'absolute_value')),
  target_value numeric not null,
  unit text not null,
  deadline date,
  status text not null default 'active' check (status in ('active', 'achieved', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table energy_targets enable row level security;

create policy "Targets — view via enpi"
  on energy_targets for select
  using (
    enpi_id in (
      select e.id from energy_enpis e
      join sites s on s.id = e.site_id
      where s.company_id = get_my_company_id()
    )
  );

create policy "Targets — manage via enpi"
  on energy_targets for all
  using (
    enpi_id in (
      select e.id from energy_enpis e
      join sites s on s.id = e.site_id
      where s.company_id = get_my_company_id()
    )
  );

create table if not exists energy_performance_results (
  id uuid primary key default uuid_generate_v4(),
  enpi_id uuid not null references energy_enpis(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  actual_value numeric not null,
  baseline_value numeric,
  target_value numeric,
  deviation_percent numeric,
  created_at timestamptz not null default now(),
  unique(enpi_id, period_start)
);

alter table energy_performance_results enable row level security;

create policy "Results — view via enpi"
  on energy_performance_results for select
  using (
    enpi_id in (
      select e.id from energy_enpis e
      join sites s on s.id = e.site_id
      where s.company_id = get_my_company_id()
    )
  );

create policy "Results — manage via enpi"
  on energy_performance_results for all
  using (
    enpi_id in (
      select e.id from energy_enpis e
      join sites s on s.id = e.site_id
      where s.company_id = get_my_company_id()
    )
  );
