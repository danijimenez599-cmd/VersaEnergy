-- 00008_balances.sql
-- VersaEnergy — Utility Balances

create table if not exists energy_balances (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  diagram_version_id uuid references energy_diagram_versions(id),
  utility text not null references utility_definitions(id),
  period_start date not null,
  period_end date not null,
  total_input numeric,
  measured_consumption numeric,
  calculated_consumption numeric,
  estimated_consumption numeric,
  technical_losses numeric,
  estimated_leaks numeric,
  returns numeric,
  unaccounted_for numeric,
  unaccounted_for_percent numeric,
  measurement_coverage numeric,
  status text not null default 'draft' check (status in ('draft', 'final')),
  node_results jsonb default '[]',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table energy_balances enable row level security;

create policy "Balances — view in own company"
  on energy_balances for select
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
  );

create policy "Balances — manage in own company"
  on energy_balances for all
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
  );
