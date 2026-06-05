-- 00033_e9_execution_audit_cmms.sql
-- VersaEnergy E9 — Acciones, M&V formal, auditoria de ejecucion y handoff Maint/CMMS.
--
-- Aditiva sobre 00010/00016/00024/00032. No crea OTs de mantenimiento:
-- Energy registra solicitudes y estados de handoff; Maint/CMMS sigue siendo
-- el sistema maestro de activos mantenibles y ordenes de trabajo cuando existe.

alter table public.energy_improvements
  add column if not exists mv_plan_status text not null default 'not_defined',
  add column if not exists cmms_handoff_status text not null default 'not_required',
  add column if not exists audit_status text not null default 'open';

alter table public.energy_improvements
  drop constraint if exists energy_improvements_mv_plan_status_check,
  drop constraint if exists energy_improvements_cmms_handoff_status_check,
  drop constraint if exists energy_improvements_audit_status_check;

alter table public.energy_improvements
  add constraint energy_improvements_mv_plan_status_check
    check (mv_plan_status in ('not_defined','draft','approved','in_progress','verified','failed')),
  add constraint energy_improvements_cmms_handoff_status_check
    check (cmms_handoff_status in ('not_required','draft','requested','accepted','rejected','work_order_created','completed','cancelled')),
  add constraint energy_improvements_audit_status_check
    check (audit_status in ('open','ready_for_review','reviewed','locked'));

create table if not exists public.energy_mv_plans (
  id uuid primary key default uuid_generate_v4(),
  improvement_id uuid not null references public.energy_improvements(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft'
    check (status in ('draft','approved','in_progress','verified','failed','cancelled')),
  method text not null
    check (method in ('before_after','baseline_model','metered','engineering_estimate')),
  baseline_source_type text
    check (baseline_source_type is null or baseline_source_type in ('measurement_point','balance_result','enpi','study','manual')),
  baseline_source_id uuid,
  baseline_period_start date,
  baseline_period_end date,
  verification_period_start date,
  verification_period_end date,
  expected_savings numeric,
  expected_savings_unit text,
  actual_savings numeric,
  actual_savings_unit text,
  confidence_score numeric check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 100)),
  acceptance_criteria text,
  calculation_notes text,
  evidence_ref jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint energy_mv_plans_evidence_object_check check (jsonb_typeof(evidence_ref) = 'object'),
  constraint energy_mv_plans_baseline_period_check check (
    baseline_period_start is null or baseline_period_end is null or baseline_period_start <= baseline_period_end
  ),
  constraint energy_mv_plans_verification_period_check check (
    verification_period_start is null or verification_period_end is null or verification_period_start <= verification_period_end
  )
);

create unique index if not exists uq_energy_mv_plans_improvement_version
  on public.energy_mv_plans(improvement_id, version);

create index if not exists idx_energy_mv_plans_improvement
  on public.energy_mv_plans(improvement_id, status, version desc);

alter table public.energy_mv_plans enable row level security;

drop policy if exists "MV plans — view via improvement" on public.energy_mv_plans;
create policy "MV plans — view via improvement"
  on public.energy_mv_plans for select
  using (improvement_id in (
    select i.id from public.energy_improvements i
    join public.sites s on s.id = i.site_id
    where s.company_id = get_my_company_id()
  ));

drop policy if exists "MV plans — manage via improvement" on public.energy_mv_plans;
create policy "MV plans — manage via improvement"
  on public.energy_mv_plans for all
  using (improvement_id in (
    select i.id from public.energy_improvements i
    join public.sites s on s.id = i.site_id
    where s.company_id = get_my_company_id()
  ))
  with check (improvement_id in (
    select i.id from public.energy_improvements i
    join public.sites s on s.id = i.site_id
    where s.company_id = get_my_company_id()
  ));

create table if not exists public.energy_cmms_handoff_requests (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references public.sites(id) on delete cascade,
  improvement_id uuid references public.energy_improvements(id) on delete set null,
  request_direction text not null default 'energy_to_cmms'
    check (request_direction in ('energy_to_cmms','cmms_to_energy')),
  request_type text not null
    check (request_type in (
      'repair_request','inspection_request','calibration_request','pm_suggestion',
      'asset_change_request','operational_adjustment','efficiency_work_request',
      'energy_improvement_feedback'
    )),
  status text not null default 'draft'
    check (status in ('draft','requested','accepted','rejected','work_order_created','in_progress','completed','cancelled')),
  target_asset_id uuid references public.assets(id) on delete set null,
  target_equipment_id uuid references public.energy_equipment(id) on delete set null,
  title text not null,
  description text,
  energy_rationale text,
  estimated_savings numeric,
  savings_unit text,
  maintenance_priority text not null default 'medium'
    check (maintenance_priority in ('low','medium','high','critical')),
  cmms_external_request_id text,
  cmms_work_order_id text,
  cmms_response jsonb not null default '{}'::jsonb,
  requested_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz,
  decided_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint energy_cmms_handoff_response_object_check check (jsonb_typeof(cmms_response) = 'object')
);

create index if not exists idx_energy_cmms_handoff_site
  on public.energy_cmms_handoff_requests(site_id, status, request_direction);

create index if not exists idx_energy_cmms_handoff_improvement
  on public.energy_cmms_handoff_requests(improvement_id, status);

alter table public.energy_cmms_handoff_requests enable row level security;

drop policy if exists "CMMS handoff — view in own company" on public.energy_cmms_handoff_requests;
create policy "CMMS handoff — view in own company"
  on public.energy_cmms_handoff_requests for select
  using (site_id in (
    select s.id from public.sites s where s.company_id = get_my_company_id()
  ));

drop policy if exists "CMMS handoff — manage in own company" on public.energy_cmms_handoff_requests;
create policy "CMMS handoff — manage in own company"
  on public.energy_cmms_handoff_requests for all
  using (site_id in (
    select s.id from public.sites s where s.company_id = get_my_company_id()
  ))
  with check (site_id in (
    select s.id from public.sites s where s.company_id = get_my_company_id()
  ));

create table if not exists public.energy_improvement_events (
  id uuid primary key default uuid_generate_v4(),
  improvement_id uuid references public.energy_improvements(id) on delete cascade,
  site_id uuid references public.sites(id) on delete cascade,
  event_type text not null
    check (event_type in (
      'created_from_study','created_manually','status_changed','mv_plan_defined',
      'mv_plan_approved','mv_started','mv_result_recorded','sent_to_cmms',
      'cmms_request_accepted','cmms_request_rejected','cmms_work_order_created',
      'cmms_work_order_closed','cmms_feedback_received','energy_followup_required',
      'evidence_added','closed_with_savings','closed_without_savings','audit_reviewed'
    )),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  source_type text
    check (source_type is null or source_type in ('study','balance','enpi','manual','cmms','system','mv_plan','handoff')),
  source_id uuid,
  previous_state jsonb not null default '{}'::jsonb,
  new_state jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  constraint energy_improvement_events_scope_check check (improvement_id is not null or site_id is not null),
  constraint energy_improvement_events_previous_object_check check (jsonb_typeof(previous_state) = 'object'),
  constraint energy_improvement_events_new_object_check check (jsonb_typeof(new_state) = 'object')
);

create index if not exists idx_energy_improvement_events_improvement
  on public.energy_improvement_events(improvement_id, created_at desc);

create index if not exists idx_energy_improvement_events_site
  on public.energy_improvement_events(site_id, created_at desc);

alter table public.energy_improvement_events enable row level security;

drop policy if exists "Improvement events — view in own company" on public.energy_improvement_events;
create policy "Improvement events — view in own company"
  on public.energy_improvement_events for select
  using (
    improvement_id in (
      select i.id from public.energy_improvements i
      join public.sites s on s.id = i.site_id
      where s.company_id = get_my_company_id()
    )
    or site_id in (
      select s.id from public.sites s where s.company_id = get_my_company_id()
    )
  );

drop policy if exists "Improvement events — manage in own company" on public.energy_improvement_events;
create policy "Improvement events — manage in own company"
  on public.energy_improvement_events for all
  using (
    improvement_id in (
      select i.id from public.energy_improvements i
      join public.sites s on s.id = i.site_id
      where s.company_id = get_my_company_id()
    )
    or site_id in (
      select s.id from public.sites s where s.company_id = get_my_company_id()
    )
  )
  with check (
    improvement_id in (
      select i.id from public.energy_improvements i
      join public.sites s on s.id = i.site_id
      where s.company_id = get_my_company_id()
    )
    or site_id in (
      select s.id from public.sites s where s.company_id = get_my_company_id()
    )
  );

create or replace function public.update_energy_e9_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_energy_mv_plans_updated_at on public.energy_mv_plans;
create trigger trg_energy_mv_plans_updated_at
  before update on public.energy_mv_plans
  for each row execute function public.update_energy_e9_updated_at();

drop trigger if exists trg_energy_cmms_handoff_updated_at on public.energy_cmms_handoff_requests;
create trigger trg_energy_cmms_handoff_updated_at
  before update on public.energy_cmms_handoff_requests
  for each row execute function public.update_energy_e9_updated_at();

create index if not exists idx_improvements_mv_status
  on public.energy_improvements(mv_plan_status);

create index if not exists idx_improvements_cmms_handoff_status
  on public.energy_improvements(cmms_handoff_status);

comment on table public.energy_mv_plans is
  'E9 M&V plan ledger: baseline source, verification window, acceptance criteria and verified savings per improvement.';
comment on table public.energy_cmms_handoff_requests is
  'E9 Energy<->Maint/CMMS handoff queue. Energy requests maintenance work; CMMS owns work orders when both apps exist.';
comment on table public.energy_improvement_events is
  'E9 audit trail for improvement execution, M&V, handoff and maintenance-originated energy feedback.';
