-- 00010_improvements.sql
-- VersaEnergy — Acciones y Proyectos de Mejora (Core)

create table if not exists energy_improvements (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  work_type text not null check (work_type in ('quick_action', 'project')),
  title text not null,
  description text,
  status text not null default 'identified'
    check (status in ('identified','triage','approved','planned','in_progress','verification','closed','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  category text not null default 'efficiency'
    check (category in ('leakage','efficiency','behavioral','maintenance','controls','measurement','investment','iso')),

  utility text references utility_definitions(id),
  area_id uuid references energy_areas(id) on delete set null,
  equipment_id uuid references energy_equipment(id) on delete set null,
  utility_system_id uuid references utility_systems(id) on delete set null,
  source_node_ids jsonb,
  source_edge_ids jsonb,
  source_measurement_point_ids jsonb,
  source_balance_id uuid references energy_balances(id) on delete set null,
  source_enpi_id uuid references energy_enpis(id) on delete set null,

  owner_id uuid references profiles(id),
  sponsor_id uuid references profiles(id),
  department text,

  estimated_energy_savings numeric default 0,
  savings_unit text,
  estimated_cost_savings numeric default 0,
  estimated_co2e_savings numeric,
  estimated_investment numeric default 0,
  currency text default 'USD',
  payback_months numeric,

  actual_energy_savings numeric,
  actual_cost_savings numeric,
  actual_co2e_savings numeric,
  measurement_verification_method text check (measurement_verification_method in ('before_after','baseline_model','metered','engineering_estimate')),

  identified_at timestamptz not null default now(),
  approved_at timestamptz,
  planned_start date,
  planned_finish date,
  actual_start date,
  actual_finish date,

  external_project_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table energy_improvements enable row level security;

create policy "Improvements — view in own company"
  on energy_improvements for select
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

create policy "Improvements — manage in own company"
  on energy_improvements for all
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

------------------------------------------------------------
-- energy_improvement_projects
------------------------------------------------------------
create table if not exists energy_improvement_projects (
  id uuid primary key default uuid_generate_v4(),
  improvement_id uuid unique not null references energy_improvements(id) on delete cascade,
  project_code text,
  scope text,
  business_case text,
  constraints text,
  assumptions text,
  risk_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table energy_improvement_projects enable row level security;

create policy "Project details — view via improvement"
  on energy_improvement_projects for select
  using (improvement_id in (
    select i.id from energy_improvements i
    join sites s on s.id = i.site_id where s.company_id = get_my_company_id()
  ));

create policy "Project details — manage via improvement"
  on energy_improvement_projects for all
  using (improvement_id in (
    select i.id from energy_improvements i
    join sites s on s.id = i.site_id where s.company_id = get_my_company_id()
  ));

------------------------------------------------------------
-- energy_project_phases
------------------------------------------------------------
create table if not exists energy_project_phases (
  id uuid primary key default uuid_generate_v4(),
  improvement_id uuid not null references energy_improvements(id) on delete cascade,
  "order" integer not null default 1,
  name text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','in_progress','completed','paused')),
  budget numeric default 0,
  progress numeric default 0 check (progress >= 0 and progress <= 100),
  planned_start date,
  planned_finish date,
  actual_start date,
  actual_finish date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table energy_project_phases enable row level security;

create policy "Phases — view via improvement"
  on energy_project_phases for select
  using (improvement_id in (
    select i.id from energy_improvements i
    join sites s on s.id = i.site_id where s.company_id = get_my_company_id()
  ));

create policy "Phases — manage via improvement"
  on energy_project_phases for all
  using (improvement_id in (
    select i.id from energy_improvements i
    join sites s on s.id = i.site_id where s.company_id = get_my_company_id()
  ));

------------------------------------------------------------
-- energy_project_tasks
------------------------------------------------------------
create table if not exists energy_project_tasks (
  id uuid primary key default uuid_generate_v4(),
  improvement_id uuid not null references energy_improvements(id) on delete cascade,
  phase_id uuid references energy_project_phases(id) on delete set null,
  title text not null,
  status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  priority text not null default 'normal' check (priority in ('normal','high','urgent')),
  owner_id uuid references profiles(id),
  planned_date date,
  actual_date date,
  estimated_hours numeric,
  actual_hours numeric,
  checklist jsonb default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table energy_project_tasks enable row level security;

create policy "Tasks — view via improvement"
  on energy_project_tasks for select
  using (improvement_id in (
    select i.id from energy_improvements i
    join sites s on s.id = i.site_id where s.company_id = get_my_company_id()
  ));

create policy "Tasks — manage via improvement"
  on energy_project_tasks for all
  using (improvement_id in (
    select i.id from energy_improvements i
    join sites s on s.id = i.site_id where s.company_id = get_my_company_id()
  ));

------------------------------------------------------------
-- energy_improvement_evidence
------------------------------------------------------------
create table if not exists energy_improvement_evidence (
  id uuid primary key default uuid_generate_v4(),
  improvement_id uuid not null references energy_improvements(id) on delete cascade,
  file_name text not null,
  file_url text,
  file_type text,
  description text,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);

alter table energy_improvement_evidence enable row level security;

create policy "Evidence — view via improvement"
  on energy_improvement_evidence for select
  using (improvement_id in (
    select i.id from energy_improvements i
    join sites s on s.id = i.site_id where s.company_id = get_my_company_id()
  ));

create policy "Evidence — manage via improvement"
  on energy_improvement_evidence for all
  using (improvement_id in (
    select i.id from energy_improvements i
    join sites s on s.id = i.site_id where s.company_id = get_my_company_id()
  ));

------------------------------------------------------------
-- energy_improvement_comments
------------------------------------------------------------
create table if not exists energy_improvement_comments (
  id uuid primary key default uuid_generate_v4(),
  improvement_id uuid not null references energy_improvements(id) on delete cascade,
  author_id uuid references profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);

alter table energy_improvement_comments enable row level security;

create policy "Comments — view via improvement"
  on energy_improvement_comments for select
  using (improvement_id in (
    select i.id from energy_improvements i
    join sites s on s.id = i.site_id where s.company_id = get_my_company_id()
  ));

create policy "Comments — manage via improvement"
  on energy_improvement_comments for all
  using (improvement_id in (
    select i.id from energy_improvements i
    join sites s on s.id = i.site_id where s.company_id = get_my_company_id()
  ));

------------------------------------------------------------
-- energy_improvement_status_log
------------------------------------------------------------
create table if not exists energy_improvement_status_log (
  id uuid primary key default uuid_generate_v4(),
  improvement_id uuid not null references energy_improvements(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);

alter table energy_improvement_status_log enable row level security;

create policy "Status log — view via improvement"
  on energy_improvement_status_log for select
  using (improvement_id in (
    select i.id from energy_improvements i
    join sites s on s.id = i.site_id where s.company_id = get_my_company_id()
  ));

create index if not exists idx_improvements_site on energy_improvements(site_id);
create index if not exists idx_improvements_status on energy_improvements(status);
create index if not exists idx_phases_improvement on energy_project_phases(improvement_id);
create index if not exists idx_tasks_improvement on energy_project_tasks(improvement_id);
