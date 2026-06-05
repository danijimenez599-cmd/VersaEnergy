-- 00023_energy_studies.sql
-- Centro de Estudios Energeticos: hipotesis, fuentes, modelos, hallazgos y decisiones.

create table if not exists energy_studies (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  title text not null,
  study_type text not null check (study_type in (
    'equipment_efficiency',
    'area_process_intensity',
    'multi_utility_normalization',
    'utility_choice',
    'peak_detective',
    'loss_hunt',
    'baseline_model',
    'mv_guardian'
  )),
  scope_type text not null check (scope_type in ('site','area','system','equipment','meter','custom')),
  scope_id uuid,
  scope_label text,
  utility text references utility_definitions(id),
  period_start date not null,
  period_end date not null,
  hypothesis text,
  status text not null default 'draft' check (status in ('draft','analyzing','decided','promoted','archived')),
  owner_id uuid references profiles(id),
  confidence_score numeric check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 100)),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists energy_study_sources (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references energy_studies(id) on delete cascade,
  source_type text not null check (source_type in (
    'measurement_point',
    'balance_sheet',
    'production_variable',
    'manual',
    'external',
    'calculated'
  )),
  source_id uuid,
  label text not null,
  utility text references utility_definitions(id),
  quantity text,
  unit text,
  aggregation_method text check (aggregation_method is null or aggregation_method in ('sum','average','min','max','last','delta')),
  data_role text not null check (data_role in ('numerator','denominator','driver','output','constraint')),
  expected_impact text check (expected_impact is null or expected_impact in ('positive','negative','neutral','unknown')),
  quality_notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists energy_study_models (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references energy_studies(id) on delete cascade,
  model_type text not null check (model_type in ('ratio','regression','efficiency','choice','peak','mv')),
  formula jsonb not null default '{}',
  coefficients jsonb,
  statistics jsonb,
  assumptions jsonb,
  output_unit text,
  quality_score numeric check (quality_score is null or (quality_score >= 0 and quality_score <= 100)),
  is_selected boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists energy_study_findings (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references energy_studies(id) on delete cascade,
  finding_type text not null check (finding_type in ('insight','risk','opportunity','data_gap','recommendation')),
  severity text check (severity is null or severity in ('low','medium','high','critical')),
  confidence text check (confidence is null or confidence in ('low','medium','high')),
  title text not null,
  description text,
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists energy_study_decisions (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references energy_studies(id) on delete cascade,
  decision_type text not null check (decision_type in (
    'promote_enpi',
    'create_improvement',
    'request_meter',
    'update_baseline',
    'archive'
  )),
  target_id uuid,
  notes text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz not null default now()
);

create index if not exists idx_energy_studies_site on energy_studies(site_id);
create index if not exists idx_energy_studies_status on energy_studies(status);
create index if not exists idx_energy_studies_scope on energy_studies(scope_type, scope_id);
create index if not exists idx_energy_study_sources_study on energy_study_sources(study_id);
create index if not exists idx_energy_study_models_study on energy_study_models(study_id);
create index if not exists idx_energy_study_findings_study on energy_study_findings(study_id);
create index if not exists idx_energy_study_decisions_study on energy_study_decisions(study_id);

alter table energy_studies enable row level security;
alter table energy_study_sources enable row level security;
alter table energy_study_models enable row level security;
alter table energy_study_findings enable row level security;
alter table energy_study_decisions enable row level security;

create policy "Studies - view in own company"
  on energy_studies for select
  using (
    site_id in (
      select s.id from sites s
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

create policy "Studies - manage in own company"
  on energy_studies for all
  using (
    site_id in (
      select s.id from sites s
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  )
  with check (
    site_id in (
      select s.id from sites s
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

create policy "Study sources - access via study"
  on energy_study_sources for all
  using (
    study_id in (
      select st.id from energy_studies st
      join sites s on s.id = st.site_id
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  )
  with check (
    study_id in (
      select st.id from energy_studies st
      join sites s on s.id = st.site_id
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

create policy "Study models - access via study"
  on energy_study_models for all
  using (
    study_id in (
      select st.id from energy_studies st
      join sites s on s.id = st.site_id
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  )
  with check (
    study_id in (
      select st.id from energy_studies st
      join sites s on s.id = st.site_id
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

create policy "Study findings - access via study"
  on energy_study_findings for all
  using (
    study_id in (
      select st.id from energy_studies st
      join sites s on s.id = st.site_id
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  )
  with check (
    study_id in (
      select st.id from energy_studies st
      join sites s on s.id = st.site_id
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

create policy "Study decisions - access via study"
  on energy_study_decisions for all
  using (
    study_id in (
      select st.id from energy_studies st
      join sites s on s.id = st.site_id
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  )
  with check (
    study_id in (
      select st.id from energy_studies st
      join sites s on s.id = st.site_id
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

create or replace function update_energy_study_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_energy_studies_updated_at
  before update on energy_studies
  for each row execute function update_energy_study_updated_at();

