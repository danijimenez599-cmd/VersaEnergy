-- 00005_diagrams.sql
-- VersaEnergy — Energy Diagrams (canvas → graph persistence)

create table if not exists energy_diagrams (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  description text,
  utility_type text references utility_definitions(id),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  canvas_state jsonb not null default '{}',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table energy_diagrams enable row level security;

create policy "Diagrams — view in own company"
  on energy_diagrams for select
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
  );

create policy "Diagrams — manage in own company"
  on energy_diagrams for all
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
  );

create table if not exists energy_diagram_nodes (
  id uuid primary key default uuid_generate_v4(),
  diagram_id uuid not null references energy_diagrams(id) on delete cascade,
  node_type text not null,
  tag text not null,
  utility text,
  label text not null,
  position_x numeric not null,
  position_y numeric not null,
  width numeric,
  height numeric,
  rotation numeric default 0,
  properties jsonb not null default '{}',
  standard_refs jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(diagram_id, tag)
);

alter table energy_diagram_nodes enable row level security;

create policy "Nodes — view via diagram"
  on energy_diagram_nodes for select
  using (
    diagram_id in (
      select d.id from energy_diagrams d
      join sites s on s.id = d.site_id
      where s.company_id = get_my_company_id()
    )
  );

create policy "Nodes — manage via diagram"
  on energy_diagram_nodes for all
  using (
    diagram_id in (
      select d.id from energy_diagrams d
      join sites s on s.id = d.site_id
      where s.company_id = get_my_company_id()
    )
  );

create table if not exists energy_diagram_edges (
  id uuid primary key default uuid_generate_v4(),
  diagram_id uuid not null references energy_diagrams(id) on delete cascade,
  source_node_id uuid not null references energy_diagram_nodes(id) on delete cascade,
  target_node_id uuid not null references energy_diagram_nodes(id) on delete cascade,
  edge_type text not null,
  utility text,
  tag text,
  flow_direction text not null default 'source_to_target' check (flow_direction in ('source_to_target', 'target_to_source', 'bidirectional', 'unknown')),
  label text,
  line_size text,
  material text,
  loss_factor numeric,
  leak_factor numeric,
  allocation_factor numeric,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table energy_diagram_edges enable row level security;

create policy "Edges — view via diagram"
  on energy_diagram_edges for select
  using (
    diagram_id in (
      select d.id from energy_diagrams d
      join sites s on s.id = d.site_id
      where s.company_id = get_my_company_id()
    )
  );

create policy "Edges — manage via diagram"
  on energy_diagram_edges for all
  using (
    diagram_id in (
      select d.id from energy_diagrams d
      join sites s on s.id = d.site_id
      where s.company_id = get_my_company_id()
    )
  );

create table if not exists energy_diagram_measurement_bindings (
  id uuid primary key default uuid_generate_v4(),
  diagram_id uuid not null references energy_diagrams(id) on delete cascade,
  measurement_point_id uuid not null references measurement_points(id) on delete cascade,
  target_type text not null check (target_type in ('node', 'edge')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique(measurement_point_id, target_type, target_id)
);

alter table energy_diagram_measurement_bindings enable row level security;

create policy "Bindings — view via diagram"
  on energy_diagram_measurement_bindings for select
  using (
    diagram_id in (
      select d.id from energy_diagrams d
      join sites s on s.id = d.site_id
      where s.company_id = get_my_company_id()
    )
  );

create policy "Bindings — manage via diagram"
  on energy_diagram_measurement_bindings for all
  using (
    diagram_id in (
      select d.id from energy_diagrams d
      join sites s on s.id = d.site_id
      where s.company_id = get_my_company_id()
    )
  );

create index if not exists idx_nodes_diagram on energy_diagram_nodes(diagram_id);
create index if not exists idx_edges_diagram on energy_diagram_edges(diagram_id);
create index if not exists idx_bindings_diagram on energy_diagram_measurement_bindings(diagram_id);
