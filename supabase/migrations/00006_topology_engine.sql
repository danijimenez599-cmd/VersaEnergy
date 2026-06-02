-- 00006_topology_engine.sql
-- VersaEnergy — Topology Engine: diagram versions + validation issues

alter table energy_diagrams
  add column if not exists version integer not null default 1;

create table if not exists energy_diagram_versions (
  id uuid primary key default uuid_generate_v4(),
  diagram_id uuid not null references energy_diagrams(id) on delete cascade,
  version_number integer not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  snapshot jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique(diagram_id, version_number)
);

alter table energy_diagram_versions enable row level security;

create policy "Diagram versions — view via diagram"
  on energy_diagram_versions for select
  using (
    diagram_id in (
      select d.id from energy_diagrams d
      join sites s on s.id = d.site_id
      where s.company_id = get_my_company_id()
    )
  );

create policy "Diagram versions — manage via diagram"
  on energy_diagram_versions for all
  using (
    diagram_id in (
      select d.id from energy_diagrams d
      join sites s on s.id = d.site_id
      where s.company_id = get_my_company_id()
    )
  );

create table if not exists energy_topology_validation_issues (
  id uuid primary key default uuid_generate_v4(),
  diagram_version_id uuid not null references energy_diagram_versions(id) on delete cascade,
  rule_id text not null,
  severity text not null check (severity in ('error', 'warning', 'info')),
  message text not null,
  target_id text,
  target_type text,
  created_at timestamptz not null default now()
);

alter table energy_topology_validation_issues enable row level security;

create policy "Validation issues — view via version"
  on energy_topology_validation_issues for select
  using (
    diagram_version_id in (
      select v.id from energy_diagram_versions v
      join energy_diagrams d on d.id = v.diagram_id
      join sites s on s.id = d.site_id
      where s.company_id = get_my_company_id()
    )
  );
