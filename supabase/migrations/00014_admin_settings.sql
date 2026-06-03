-- 00014_admin_settings.sql
-- MP-R5: Admin y prerequisitos (tarifas, factores, usuarios, RLS)

------------------------------------------------------------
-- 1. Identidad global + rol por app (app_memberships)
------------------------------------------------------------
create table if not exists app_memberships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  app_key text not null check (app_key in ('energy', 'cmms', 'project', 'platform')),
  role text not null check (role in ('admin', 'manager', 'engineer', 'operator', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, company_id, app_key)
);

alter table app_memberships enable row level security;

create policy "AppMemberships — view own and company members"
  on app_memberships for select
  using (user_id = auth.uid() or company_id = get_my_company_id());

create policy "AppMemberships — admin manage in company"
  on app_memberships for all
  using (
    company_id = get_my_company_id() 
    and exists (
      select 1 from app_memberships am 
      where am.user_id = auth.uid() 
      and am.app_key = app_memberships.app_key 
      and am.role = 'admin'
    )
  );

------------------------------------------------------------
-- 2. Tarifas de Energía
------------------------------------------------------------
create table if not exists energy_tariffs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  site_id uuid references sites(id) on delete cascade, -- opcional si es global de la empresa
  utility_type text not null,
  rate numeric not null,
  currency text not null default 'USD',
  unit text not null,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table energy_tariffs enable row level security;

create policy "EnergyTariffs — view by company"
  on energy_tariffs for select
  using (company_id = get_my_company_id());

create policy "EnergyTariffs — admin manage"
  on energy_tariffs for all
  using (
    company_id = get_my_company_id() 
    and exists (
      select 1 from app_memberships am 
      where am.user_id = auth.uid() and am.app_key = 'energy' and am.role = 'admin'
    )
  );

------------------------------------------------------------
-- 3. Factores de Emisión
------------------------------------------------------------
create table if not exists energy_emission_factors (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  utility_type text not null,
  factor numeric not null,
  unit text not null, -- ej: kgCO2e/kWh
  valid_from timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table energy_emission_factors enable row level security;

create policy "EmissionFactors — view by company"
  on energy_emission_factors for select
  using (company_id = get_my_company_id());

create policy "EmissionFactors — admin manage"
  on energy_emission_factors for all
  using (
    company_id = get_my_company_id() 
    and exists (
      select 1 from app_memberships am 
      where am.user_id = auth.uid() and am.app_key = 'energy' and am.role = 'admin'
    )
  );

------------------------------------------------------------
-- 4. Parámetros de Sistema (Globales por empresa)
------------------------------------------------------------
create table if not exists energy_system_parameters (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  quality_alert_threshold numeric not null default 80.0,
  unexplained_alert_threshold numeric not null default 10.0,
  default_energy_period text not null default 'monthly',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id)
);

alter table energy_system_parameters enable row level security;

create policy "SystemParameters — view by company"
  on energy_system_parameters for select
  using (company_id = get_my_company_id());

create policy "SystemParameters — admin manage"
  on energy_system_parameters for all
  using (
    company_id = get_my_company_id() 
    and exists (
      select 1 from app_memberships am 
      where am.user_id = auth.uid() and am.app_key = 'energy' and am.role = 'admin'
    )
  );
