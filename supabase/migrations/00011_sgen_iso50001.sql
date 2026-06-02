-- 00011_sgen_iso50001.sql
-- VersaEnergy — SGEn alineado con ISO 50001 (Core)

create table if not exists sgen_scopes (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  description text,
  boundaries text,
  included_utilities text[] not null default '{}',
  excluded_utilities text[] not null default '{}',
  exclusions_rationale text,
  owner_id uuid references profiles(id),
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft','in_review','approved','archived')),
  content_origin text not null default 'user_original' check (content_origin in ('app_original','user_original','public_source','tenant_reference')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sgen_scopes enable row level security;

create policy "SGEn scopes — view in own company"
  on sgen_scopes for select
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

create policy "SGEn scopes — manage in own company"
  on sgen_scopes for all
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

------------------------------------------------------------
-- sgen_policy_documents
------------------------------------------------------------
create table if not exists sgen_policy_documents (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  title text not null,
  version text,
  owner_id uuid references profiles(id),
  effective_date date,
  review_due_date date,
  content text,
  file_url text,
  communication_evidence text,
  content_origin text not null default 'user_original' check (content_origin in ('app_original','user_original','public_source','tenant_reference')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sgen_policy_documents enable row level security;

create policy "SGEn policies — view in own company"
  on sgen_policy_documents for select
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

create policy "SGEn policies — manage in own company"
  on sgen_policy_documents for all
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

------------------------------------------------------------
-- sgen_energy_reviews
------------------------------------------------------------
create table if not exists sgen_energy_reviews (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  summary text,
  data_quality_score integer,
  total_cost numeric,
  consumption_by_utility jsonb default '{}',
  key_findings jsonb default '[]',
  linked_balances uuid[] default '{}',
  linked_enpis uuid[] default '{}',
  content_origin text not null default 'user_original' check (content_origin in ('app_original','user_original','public_source','tenant_reference')),
  status text not null default 'draft' check (status in ('draft','reviewed','approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sgen_energy_reviews enable row level security;

create policy "SGEn reviews — view in own company"
  on sgen_energy_reviews for select
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

create policy "SGEn reviews — manage in own company"
  on sgen_energy_reviews for all
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

------------------------------------------------------------
-- sgen_significant_uses
------------------------------------------------------------
create table if not exists sgen_significant_uses (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  review_id uuid references sgen_energy_reviews(id) on delete set null,
  name text not null,
  utility text not null references utility_definitions(id),
  area_id uuid references energy_areas(id) on delete set null,
  equipment_id uuid references energy_equipment(id) on delete set null,
  node_ids text[] default '{}',
  measurement_point_ids uuid[] default '{}',
  enpi_id uuid references energy_enpis(id) on delete set null,
  consumption_value numeric,
  cost_value numeric,
  significance_score integer,
  significance_rationale text,
  owner_id uuid references profiles(id),
  linked_opportunity_ids uuid[] default '{}',
  content_origin text not null default 'user_original' check (content_origin in ('app_original','user_original','public_source','tenant_reference')),
  status text not null default 'candidate' check (status in ('candidate','active','monitoring','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sgen_significant_uses enable row level security;

create policy "SGEn SEUs — view in own company"
  on sgen_significant_uses for select
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

create policy "SGEn SEUs — manage in own company"
  on sgen_significant_uses for all
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

------------------------------------------------------------
-- sgen_risks_opportunities
------------------------------------------------------------
create table if not exists sgen_risks_opportunities (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  type text not null check (type in ('risk','opportunity')),
  title text not null,
  description text,
  source text,
  utility text references utility_definitions(id),
  area_id uuid references energy_areas(id) on delete set null,
  probability text check (probability in ('low','medium','high')),
  impact text check (impact in ('low','medium','high')),
  priority text,
  climate_action_related boolean default false,
  linked_improvement_id uuid references energy_improvements(id) on delete set null,
  owner_id uuid references profiles(id),
  content_origin text not null default 'user_original' check (content_origin in ('app_original','user_original','public_source','tenant_reference')),
  status text not null default 'open' check (status in ('open','in_progress','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sgen_risks_opportunities enable row level security;

create policy "SGEn risks — view in own company"
  on sgen_risks_opportunities for select
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

create policy "SGEn risks — manage in own company"
  on sgen_risks_opportunities for all
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

------------------------------------------------------------
-- sgen_objectives
------------------------------------------------------------
create table if not exists sgen_objectives (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  description text,
  enpi_id uuid references energy_enpis(id) on delete set null,
  baseline_id uuid references energy_baselines(id) on delete set null,
  target_id uuid references energy_targets(id) on delete set null,
  period_start date,
  period_end date,
  owner_id uuid references profiles(id),
  estimated_savings numeric,
  estimated_investment numeric,
  linked_improvement_id uuid references energy_improvements(id) on delete set null,
  verification_method text,
  content_origin text not null default 'user_original' check (content_origin in ('app_original','user_original','public_source','tenant_reference')),
  status text not null default 'active' check (status in ('draft','active','achieved','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sgen_objectives enable row level security;

create policy "SGEn objectives — view in own company"
  on sgen_objectives for select
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

create policy "SGEn objectives — manage in own company"
  on sgen_objectives for all
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

------------------------------------------------------------
-- sgen_evidence
------------------------------------------------------------
create table if not exists sgen_evidence (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  title text not null,
  description text,
  domain text not null,
  linked_entity_type text not null,
  linked_entity_id uuid not null,
  source_type text not null default 'manual_note' check (source_type in ('system_snapshot','uploaded_file','manual_note','generated_report')),
  content_origin text not null default 'user_original' check (content_origin in ('app_original','user_original','public_source','tenant_reference')),
  file_url text,
  captured_at timestamptz not null default now(),
  captured_by uuid references profiles(id),
  status text not null default 'accepted' check (status in ('suggested','accepted','rejected','superseded')),
  created_at timestamptz not null default now()
);

alter table sgen_evidence enable row level security;

create policy "SGEn evidence — view in own company"
  on sgen_evidence for select
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

create policy "SGEn evidence — manage in own company"
  on sgen_evidence for all
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

------------------------------------------------------------
-- sgen_audits
------------------------------------------------------------
create table if not exists sgen_audits (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  title text not null,
  scope text,
  planned_date date,
  actual_date date,
  lead_auditor uuid references profiles(id),
  questions jsonb default '[]',
  content_origin text not null default 'app_original' check (content_origin in ('app_original','user_original','public_source','tenant_reference')),
  status text not null default 'planned' check (status in ('planned','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sgen_audits enable row level security;

create policy "SGEn audits — view in own company"
  on sgen_audits for select
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

create policy "SGEn audits — manage in own company"
  on sgen_audits for all
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

------------------------------------------------------------
-- sgen_audit_findings
------------------------------------------------------------
create table if not exists sgen_audit_findings (
  id uuid primary key default uuid_generate_v4(),
  audit_id uuid not null references sgen_audits(id) on delete cascade,
  finding_text text not null,
  severity text not null default 'observation' check (severity in ('observation','minor','major','critical')),
  linked_nc_id uuid,
  content_origin text not null default 'user_original' check (content_origin in ('app_original','user_original','public_source','tenant_reference')),
  status text not null default 'open' check (status in ('open','addressed','closed')),
  created_at timestamptz not null default now()
);

alter table sgen_audit_findings enable row level security;

create policy "SGEn findings — view via audit"
  on sgen_audit_findings for select
  using (audit_id in (
    select a.id from sgen_audits a join sites s on s.id = a.site_id where s.company_id = get_my_company_id()
  ));

create policy "SGEn findings — manage via audit"
  on sgen_audit_findings for all
  using (audit_id in (
    select a.id from sgen_audits a join sites s on s.id = a.site_id where s.company_id = get_my_company_id()
  ));

------------------------------------------------------------
-- sgen_management_reviews
------------------------------------------------------------
create table if not exists sgen_management_reviews (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  title text not null,
  period_start date,
  period_end date,
  meeting_date date,
  attendees text[],
  energy_performance_summary text,
  objectives_status text,
  actions_projects_status text,
  audit_results text,
  risks_opportunities_status text,
  resource_needs text,
  decisions jsonb default '[]',
  follow_up_deadline date,
  content_origin text not null default 'user_original' check (content_origin in ('app_original','user_original','public_source','tenant_reference')),
  status text not null default 'draft' check (status in ('draft','completed','approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sgen_management_reviews enable row level security;

create policy "SGEn mgmt reviews — view in own company"
  on sgen_management_reviews for select
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

create policy "SGEn mgmt reviews — manage in own company"
  on sgen_management_reviews for all
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

------------------------------------------------------------
-- sgen_nonconformities
------------------------------------------------------------
create table if not exists sgen_nonconformities (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  source text,
  description text not null,
  severity text not null default 'minor' check (severity in ('observation','minor','major')),
  probable_cause text,
  corrective_action text,
  owner_id uuid references profiles(id),
  due_date date,
  verification_of_effectiveness text,
  linked_evidence_ids uuid[],
  content_origin text not null default 'user_original' check (content_origin in ('app_original','user_original','public_source','tenant_reference')),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sgen_nonconformities enable row level security;

create policy "SGEn NCs — view in own company"
  on sgen_nonconformities for select
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

create policy "SGEn NCs — manage in own company"
  on sgen_nonconformities for all
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

------------------------------------------------------------
-- sgen_improvements
------------------------------------------------------------
create table if not exists sgen_improvements (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  description text not null,
  origin text,
  expected_impact text,
  verified_result text,
  lesson_learned text,
  replicable boolean default false,
  linked_improvement_id uuid references energy_improvements(id) on delete set null,
  content_origin text not null default 'user_original' check (content_origin in ('app_original','user_original','public_source','tenant_reference')),
  status text not null default 'active' check (status in ('identified','active','verified','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sgen_improvements enable row level security;

create policy "SGEn improvements — view in own company"
  on sgen_improvements for select
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

create policy "SGEn improvements — manage in own company"
  on sgen_improvements for all
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

------------------------------------------------------------
-- sgen_legal_notices
------------------------------------------------------------
create table if not exists sgen_legal_notices (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  notice_type text not null default 'legal',
  title text not null,
  body text not null,
  version text not null default '1.0.0',
  acknowledged boolean default false,
  acknowledged_by uuid references profiles(id),
  acknowledged_at timestamptz,
  content_origin text not null default 'app_original' check (content_origin in ('app_original','user_original','public_source','tenant_reference')),
  created_at timestamptz not null default now()
);

alter table sgen_legal_notices enable row level security;

create policy "SGEn legal notices — view in own company"
  on sgen_legal_notices for select
  using (site_id in (select s.id from sites s where s.company_id = get_my_company_id()));

create index if not exists idx_sgen_scope_site on sgen_scopes(site_id);
create index if not exists idx_sgen_seus_site on sgen_significant_uses(site_id);
create index if not exists idx_sgen_evidence_site on sgen_evidence(site_id);
