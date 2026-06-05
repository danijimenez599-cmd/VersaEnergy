-- 00032_e8_study_workflow.sql
-- VersaEnergy E8 — EnPI and Energy Study workflow hardening.
--
-- Studies become the technical lab before governance: rank relevant variables,
-- compare models, and decide between EnPI, quick action, project, measurement
-- request or SGEn evidence.

alter table public.energy_studies
  add column if not exists methodology text not null default 'engineering_workbench',
  add column if not exists workflow_stage text not null default 'question',
  add column if not exists source_balance_result_id uuid references public.energy_balance_results(id) on delete set null,
  add column if not exists promoted_enpi_id uuid references public.energy_enpis(id) on delete set null,
  add column if not exists decision_summary jsonb not null default '{}'::jsonb;

alter table public.energy_studies
  drop constraint if exists energy_studies_methodology_check,
  drop constraint if exists energy_studies_workflow_stage_check,
  drop constraint if exists energy_studies_decision_summary_object_check;

alter table public.energy_studies
  add constraint energy_studies_methodology_check
    check (methodology in ('engineering_workbench', 'sgen_review', 'mv_protocol')),
  add constraint energy_studies_workflow_stage_check
    check (workflow_stage in ('question', 'sources', 'variables', 'models', 'decision', 'handoff')),
  add constraint energy_studies_decision_summary_object_check
    check (jsonb_typeof(decision_summary) = 'object');

create table if not exists public.energy_study_variable_candidates (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.energy_studies(id) on delete cascade,
  variable_type text not null check (variable_type in (
    'production_variable',
    'operational',
    'weather',
    'quality',
    'manual'
  )),
  variable_id uuid,
  label text not null,
  unit text,
  physical_rationale text,
  coverage_percent numeric check (coverage_percent is null or (coverage_percent >= 0 and coverage_percent <= 100)),
  correlation_score numeric check (correlation_score is null or (correlation_score >= -1 and correlation_score <= 1)),
  stability_score numeric check (stability_score is null or (stability_score >= 0 and stability_score <= 100)),
  relevance_score numeric check (relevance_score is null or (relevance_score >= 0 and relevance_score <= 100)),
  selected boolean not null default false,
  recommendation text check (recommendation is null or recommendation in (
    'primary_driver',
    'secondary_driver',
    'monitor_only',
    'reject',
    'needs_data'
  )),
  statistics jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_study_variable_candidates_study
  on public.energy_study_variable_candidates(study_id, relevance_score desc);

alter table public.energy_study_variable_candidates enable row level security;

drop policy if exists "Study variable candidates - access via study" on public.energy_study_variable_candidates;
create policy "Study variable candidates - access via study"
  on public.energy_study_variable_candidates for all
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

alter table public.energy_study_models
  drop constraint if exists energy_study_models_model_type_check;

alter table public.energy_study_models
  add constraint energy_study_models_model_type_check
  check (model_type in (
    'ratio',
    'regression',
    'regression_simple',
    'regression_multiple',
    'baseline_average',
    'cusum',
    'efficiency',
    'choice',
    'peak',
    'mv'
  ));

alter table public.energy_study_decisions
  add column if not exists decision_payload jsonb not null default '{}'::jsonb,
  add column if not exists work_type text;

alter table public.energy_study_decisions
  drop constraint if exists energy_study_decisions_decision_type_check,
  drop constraint if exists energy_study_decisions_payload_object_check,
  drop constraint if exists energy_study_decisions_work_type_check;

alter table public.energy_study_decisions
  add constraint energy_study_decisions_decision_type_check
  check (decision_type in (
    'promote_enpi',
    'create_improvement',
    'create_quick_action',
    'create_project',
    'request_meter',
    'request_measurement',
    'update_baseline',
    'create_sgen_evidence',
    'archive'
  )),
  add constraint energy_study_decisions_payload_object_check
    check (jsonb_typeof(decision_payload) = 'object'),
  add constraint energy_study_decisions_work_type_check
    check (work_type is null or work_type in ('quick_action', 'project'));

comment on table public.energy_study_variable_candidates is
  'E8 variable relevance ledger. Stores candidate drivers, coverage, correlation, stability, rationale and selection before promoting EnPIs.';
comment on column public.energy_study_decisions.work_type is
  'E8 handoff discriminator when a study creates execution work: quick_action or project.';
