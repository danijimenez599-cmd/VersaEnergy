-- 00037_e13_study_case_management.sql
-- VersaEnergy E13 — Estudios como expedientes tecnicos tipo OT energetica.

alter table public.energy_studies
  add column if not exists case_type text not null default 'energy_study',
  add column if not exists priority text not null default 'medium',
  add column if not exists due_date date,
  add column if not exists source_module text,
  add column if not exists source_entity_type text,
  add column if not exists source_entity_id uuid,
  add column if not exists data_sufficiency_status text not null default 'preliminary',
  add column if not exists data_quality_summary jsonb not null default '{}'::jsonb,
  add column if not exists closure_summary text,
  add column if not exists closed_at timestamptz,
  add column if not exists final_decision_type text,
  add column if not exists final_decision_target_id uuid;

alter table public.energy_studies
  drop constraint if exists energy_studies_case_type_check,
  drop constraint if exists energy_studies_priority_check,
  drop constraint if exists energy_studies_status_check,
  drop constraint if exists energy_studies_workflow_stage_check,
  drop constraint if exists energy_studies_data_sufficiency_status_check,
  drop constraint if exists energy_studies_data_quality_summary_object_check,
  drop constraint if exists energy_studies_final_decision_type_check;

alter table public.energy_studies
  add constraint energy_studies_case_type_check
    check (case_type in (
      'energy_study',
      'performance_review',
      'measurement_gap',
      'balance_investigation',
      'mv_review',
      'internal_audit',
      'seu_review'
    )),
  add constraint energy_studies_priority_check
    check (priority in ('low','medium','high','critical')),
  add constraint energy_studies_status_check
    check (status in (
      'draft',
      'scoping',
      'data_collection',
      'data_gap',
      'ready_for_analysis',
      'analyzing',
      'findings_review',
      'decision_pending',
      'decided',
      'promoted',
      'closed',
      'archived'
    )),
  add constraint energy_studies_workflow_stage_check
    check (workflow_stage in (
      'intake',
      'scope',
      'data',
      'activities',
      'analysis',
      'findings',
      'decision',
      'closure',
      'question',
      'sources',
      'variables',
      'models',
      'handoff'
    )),
  add constraint energy_studies_data_sufficiency_status_check
    check (data_sufficiency_status in ('preliminary','usable','defensible','blocked')),
  add constraint energy_studies_data_quality_summary_object_check
    check (jsonb_typeof(data_quality_summary) = 'object'),
  add constraint energy_studies_final_decision_type_check
    check (final_decision_type is null or final_decision_type in (
      'promote_enpi',
      'create_quick_action',
      'create_project',
      'request_measurement',
      'cmms_handoff',
      'create_sgen_evidence',
      'close_no_action',
      'follow_up'
    ));

create table if not exists public.energy_study_activities (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.energy_studies(id) on delete cascade,
  title text not null,
  description text,
  activity_type text not null default 'analysis' check (activity_type in (
    'data_validation',
    'inspection',
    'analysis',
    'measurement',
    'operations_review',
    'maintenance_review',
    'documentation',
    'decision'
  )),
  status text not null default 'pending' check (status in (
    'pending',
    'in_progress',
    'blocked',
    'completed',
    'cancelled'
  )),
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.energy_study_evidence (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.energy_studies(id) on delete cascade,
  activity_id uuid references public.energy_study_activities(id) on delete set null,
  evidence_type text not null default 'note' check (evidence_type in (
    'note',
    'file',
    'photo',
    'csv',
    'trend_capture',
    'report',
    'cmms_reference',
    'diagram_snapshot',
    'balance_snapshot'
  )),
  title text not null,
  description text,
  url text,
  metadata jsonb not null default '{}'::jsonb,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint energy_study_evidence_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.energy_study_events (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.energy_studies(id) on delete cascade,
  event_type text not null check (event_type in (
    'created',
    'scope_changed',
    'activity_added',
    'activity_updated',
    'evidence_added',
    'sufficiency_updated',
    'analysis_run',
    'finding_added',
    'decision_recorded',
    'entity_created',
    'closed',
    'reopened'
  )),
  title text not null,
  description text,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  previous_state jsonb not null default '{}'::jsonb,
  new_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint energy_study_events_previous_object_check check (jsonb_typeof(previous_state) = 'object'),
  constraint energy_study_events_new_object_check check (jsonb_typeof(new_state) = 'object')
);

create index if not exists idx_energy_studies_case_site_status
  on public.energy_studies(site_id, case_type, status);
create index if not exists idx_energy_studies_due_date
  on public.energy_studies(due_date);
create index if not exists idx_energy_study_activities_study
  on public.energy_study_activities(study_id, sort_order, created_at);
create index if not exists idx_energy_study_evidence_study
  on public.energy_study_evidence(study_id, created_at desc);
create index if not exists idx_energy_study_events_study
  on public.energy_study_events(study_id, created_at desc);

alter table public.energy_study_activities enable row level security;
alter table public.energy_study_evidence enable row level security;
alter table public.energy_study_events enable row level security;

drop policy if exists "Study activities - access via study" on public.energy_study_activities;
create policy "Study activities - access via study"
  on public.energy_study_activities for all
  using (
    study_id in (
      select st.id from public.energy_studies st
      join public.sites s on s.id = st.site_id
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  )
  with check (
    study_id in (
      select st.id from public.energy_studies st
      join public.sites s on s.id = st.site_id
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

drop policy if exists "Study evidence - access via study" on public.energy_study_evidence;
create policy "Study evidence - access via study"
  on public.energy_study_evidence for all
  using (
    study_id in (
      select st.id from public.energy_studies st
      join public.sites s on s.id = st.site_id
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  )
  with check (
    study_id in (
      select st.id from public.energy_studies st
      join public.sites s on s.id = st.site_id
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

drop policy if exists "Study events - access via study" on public.energy_study_events;
create policy "Study events - access via study"
  on public.energy_study_events for all
  using (
    study_id in (
      select st.id from public.energy_studies st
      join public.sites s on s.id = st.site_id
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  )
  with check (
    study_id in (
      select st.id from public.energy_studies st
      join public.sites s on s.id = st.site_id
      join public.profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

create or replace function public.update_energy_study_activity_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_energy_study_activities_updated_at on public.energy_study_activities;
create trigger trg_energy_study_activities_updated_at
  before update on public.energy_study_activities
  for each row execute function public.update_energy_study_activity_updated_at();

comment on table public.energy_study_activities is
  'E13 task ledger for energy study cases. Activities behave like technical OT tasks without becoming CMMS work orders.';
comment on table public.energy_study_evidence is
  'E13 evidence and attachment references for study cases. Stores metadata/links, not binary file blobs.';
comment on table public.energy_study_events is
  'E13 append-only history for study cases: scope, activities, evidence, decisions and closure.';
