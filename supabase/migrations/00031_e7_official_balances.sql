-- 00031_e7_official_balances.sql
-- VersaEnergy E7 — Official balance metadata and auditable topology rollups.
--
-- Additive over 00021/00030. Manual balance sheets continue to work, but an
-- official E7 result must carry scope, utility, published diagram version and
-- coverage/findings metadata.

alter table public.energy_balance_sheets
  add column if not exists calculation_mode text not null default 'manual',
  add column if not exists scope_type text,
  add column if not exists scope_id uuid,
  add column if not exists diagram_id uuid references public.energy_diagrams(id) on delete set null,
  add column if not exists diagram_version_id uuid references public.energy_diagram_versions(id) on delete set null,
  add column if not exists topology_required boolean not null default true,
  add column if not exists topology_notes jsonb not null default '{}'::jsonb;

alter table public.energy_balance_sheets
  drop constraint if exists energy_balance_sheets_calculation_mode_check,
  drop constraint if exists energy_balance_sheets_scope_type_check,
  drop constraint if exists energy_balance_sheets_topology_notes_object_check;

alter table public.energy_balance_sheets
  add constraint energy_balance_sheets_calculation_mode_check
    check (calculation_mode in ('manual', 'topology_official')),
  add constraint energy_balance_sheets_scope_type_check
    check (scope_type is null or scope_type in ('site', 'area', 'system', 'equipment', 'energy_group')),
  add constraint energy_balance_sheets_topology_notes_object_check
    check (jsonb_typeof(topology_notes) = 'object');

update public.energy_balance_sheets
set scope_type = coalesce(scope_type, boundary_type, 'site'),
    scope_id = coalesce(scope_id, boundary_id, site_id),
    calculation_mode = coalesce(calculation_mode, 'manual'),
    topology_notes = coalesce(topology_notes, '{}'::jsonb)
where scope_type is null
   or scope_id is null
   or calculation_mode is null
   or topology_notes is null;

update public.energy_balance_sheets bs
set diagram_id = d.id
from public.energy_diagrams d
where bs.diagram_id is null
  and d.site_id = bs.site_id
  and d.scope_type = bs.scope_type
  and d.scope_id = bs.scope_id
  and d.status = 'published';

update public.energy_balance_sheets bs
set diagram_version_id = v.id
from public.energy_diagram_versions v
where bs.diagram_id = v.diagram_id
  and bs.diagram_version_id is null
  and v.is_published = true;

alter table public.energy_balance_results
  add column if not exists calculation_mode text not null default 'manual',
  add column if not exists is_official boolean not null default false,
  add column if not exists result_status text not null default 'current',
  add column if not exists scope_type text,
  add column if not exists scope_id uuid,
  add column if not exists utility text references public.utility_definitions(id) on delete restrict,
  add column if not exists diagram_id uuid references public.energy_diagrams(id) on delete set null,
  add column if not exists diagram_version_id uuid references public.energy_diagram_versions(id) on delete set null,
  add column if not exists child_diagram_version_ids uuid[] not null default '{}',
  add column if not exists coverage_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists topology_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists findings jsonb not null default '[]'::jsonb,
  add column if not exists confidence_score numeric,
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by uuid references public.energy_balance_results(id) on delete set null;

alter table public.energy_balance_results
  drop constraint if exists energy_balance_results_calculation_mode_check,
  drop constraint if exists energy_balance_results_status_check,
  drop constraint if exists energy_balance_results_scope_type_check,
  drop constraint if exists energy_balance_results_coverage_object_check,
  drop constraint if exists energy_balance_results_topology_object_check,
  drop constraint if exists energy_balance_results_findings_array_check,
  drop constraint if exists energy_balance_results_confidence_check;

alter table public.energy_balance_results
  add constraint energy_balance_results_calculation_mode_check
    check (calculation_mode in ('manual', 'topology_official')),
  add constraint energy_balance_results_status_check
    check (result_status in ('current', 'superseded')),
  add constraint energy_balance_results_scope_type_check
    check (scope_type is null or scope_type in ('site', 'area', 'system', 'equipment', 'energy_group')),
  add constraint energy_balance_results_coverage_object_check
    check (jsonb_typeof(coverage_breakdown) = 'object'),
  add constraint energy_balance_results_topology_object_check
    check (jsonb_typeof(topology_snapshot) = 'object'),
  add constraint energy_balance_results_findings_array_check
    check (jsonb_typeof(findings) = 'array'),
  add constraint energy_balance_results_confidence_check
    check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 100));

update public.energy_balance_results r
set scope_type = coalesce(r.scope_type, bs.scope_type, bs.boundary_type, 'site'),
    scope_id = coalesce(r.scope_id, bs.scope_id, bs.boundary_id, bs.site_id),
    utility = coalesce(r.utility, bs.utility),
    diagram_id = coalesce(r.diagram_id, bs.diagram_id),
    diagram_version_id = coalesce(r.diagram_version_id, bs.diagram_version_id),
    coverage_breakdown = coalesce(r.coverage_breakdown, '{}'::jsonb),
    topology_snapshot = coalesce(r.topology_snapshot, '{}'::jsonb),
    findings = coalesce(r.findings, '[]'::jsonb)
from public.energy_balance_sheets bs
where r.sheet_id = bs.id;

create index if not exists idx_balance_sheets_scope
  on public.energy_balance_sheets(site_id, scope_type, scope_id);

create index if not exists idx_balance_sheets_diagram_version
  on public.energy_balance_sheets(diagram_version_id);

create index if not exists idx_balance_results_official_current
  on public.energy_balance_results(sheet_id, is_official, result_status, calculated_at desc);

create index if not exists idx_balance_results_diagram_version
  on public.energy_balance_results(diagram_version_id);

comment on column public.energy_balance_sheets.calculation_mode is
  'manual keeps legacy/manual balance sheets. topology_official means E7 requires a published topology version.';
comment on column public.energy_balance_results.coverage_breakdown is
  'E7 auditable coverage: measured/estimated/manual/no_data, entries, residuals and topology context.';
comment on column public.energy_balance_results.topology_snapshot is
  'E7 immutable reference to published parent/child diagram versions consumed by this balance result.';
comment on column public.energy_balance_results.findings is
  'E7 balance findings: data gaps, measurement recommendations, unexplained loss alerts and study handoff hints.';
