-- 00035_e12_diagram_workspace.sql
-- E12: Diagram Workspace 2.0
--
-- Diagrams are no longer only canvas documents. They are saved views of the
-- semantic topology model, with an explicit purpose, lens preset and scope.

alter table public.energy_diagrams
  add column if not exists diagram_type text not null default 'utility',
  add column if not exists view_preset text not null default 'technical',
  add column if not exists workspace_notes text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.energy_diagrams
  drop constraint if exists energy_diagrams_diagram_type_check,
  drop constraint if exists energy_diagrams_view_preset_check,
  drop constraint if exists energy_diagrams_metadata_object_check,
  drop constraint if exists energy_diagrams_scope_type_check;

alter table public.energy_diagrams
  add constraint energy_diagrams_diagram_type_check
    check (diagram_type in ('overview','utility','boundary','group','equipment','generated','custom')),
  add constraint energy_diagrams_view_preset_check
    check (view_preset in ('macro','technical','balance','audit')),
  add constraint energy_diagrams_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  add constraint energy_diagrams_scope_type_check
    check (scope_type is null or scope_type in ('site','area','system','equipment','energy_group','asset','custom'));

create index if not exists idx_diagrams_site_type_status
  on public.energy_diagrams(site_id, diagram_type, status);

create index if not exists idx_diagrams_site_scope_type
  on public.energy_diagrams(site_id, scope_type, scope_id)
  where scope_type is not null;

update public.energy_diagrams
set
  diagram_type = case
    when scope_type = 'site' and utility_type is null then 'overview'
    when scope_type in ('area','system') then 'group'
    when scope_type = 'equipment' then 'equipment'
    else 'utility'
  end,
  view_preset = case
    when scope_type = 'site' and utility_type is null then 'macro'
    else 'technical'
  end
where diagram_type = 'utility'
  and view_preset = 'technical';

comment on column public.energy_diagrams.diagram_type is
  'E12 purpose of the saved diagram view: overview, utility, boundary, group, equipment, generated or custom.';

comment on column public.energy_diagrams.view_preset is
  'E12 default visual lens: macro, technical, balance or audit.';

comment on column public.energy_diagrams.metadata is
  'E12 AI-first diagram metadata. Store UX hints, lane settings, generation source and non-canonical presentation preferences.';
