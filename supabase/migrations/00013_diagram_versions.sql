-- 00013_diagram_versions.sql
-- VersaEnergy — Historial de versiones de diagramas
--
-- Reemplaza la obligación de "clonar para editar": cada guardado crea un
-- snapshot inmutable. El usuario puede ver el historial y restaurar cualquier
-- versión. "Publicar" marca una versión como oficial sin bloquear la edición.

create table if not exists energy_diagram_versions (
  id uuid primary key default uuid_generate_v4(),
  diagram_id uuid not null references energy_diagrams(id) on delete cascade,
  version_number int not null,
  label text,
  is_published boolean not null default false,
  snapshot jsonb not null default '{}',   -- { nodes: [...], edges: [...] }
  node_count int not null default 0,
  edge_count int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (diagram_id, version_number)
);

-- 00006 already introduced this table with a lighter schema
-- (`status`, nullable `snapshot`). Keep this migration safe for both fresh
-- databases and databases that have already applied the earlier topology phase.
alter table energy_diagram_versions
  add column if not exists label text;

alter table energy_diagram_versions
  add column if not exists is_published boolean not null default false;

alter table energy_diagram_versions
  add column if not exists node_count int not null default 0;

alter table energy_diagram_versions
  add column if not exists edge_count int not null default 0;

alter table energy_diagram_versions
  alter column snapshot set default '{}';

update energy_diagram_versions
  set snapshot = '{}'
  where snapshot is null;

alter table energy_diagram_versions
  alter column snapshot set not null;

update energy_diagram_versions
  set is_published = true
  where status = 'published'
    and is_published = false;

create index if not exists idx_diagram_versions_diagram
  on energy_diagram_versions(diagram_id, version_number desc);

create index if not exists idx_diagram_versions_published
  on energy_diagram_versions(diagram_id, is_published)
  where is_published = true;

alter table energy_diagram_versions enable row level security;

drop policy if exists "Diagram versions — view via diagram" on energy_diagram_versions;
create policy "Diagram versions — view via diagram"
  on energy_diagram_versions for select
  using (
    diagram_id in (
      select d.id from energy_diagrams d
      join sites s on s.id = d.site_id
      where s.company_id = get_my_company_id()
    )
  );

drop policy if exists "Diagram versions — manage via diagram" on energy_diagram_versions;
create policy "Diagram versions — manage via diagram"
  on energy_diagram_versions for all
  using (
    diagram_id in (
      select d.id from energy_diagrams d
      join sites s on s.id = d.site_id
      where s.company_id = get_my_company_id()
    )
  );
