-- 00036_energy_flow_links.sql
-- VersaEnergy — Energy flow links between areas (the "diagram" as pure boxes).
--
-- Defines WHERE each utility comes from for every area:
--   from_type='area'     → another area in the same site
--   from_type='external' → an external utility provider (CFE, CENAGAS, etc.)
--
-- Reading all links for a site reconstructs the full energy flow diagram
-- without needing an SVG canvas.

create table if not exists public.energy_flow_links (
  id              uuid        primary key default uuid_generate_v4(),
  site_id         uuid        not null references public.sites(id) on delete cascade,

  -- Source: area or external utility provider
  from_type       text        not null check (from_type in ('area', 'external')),
  from_area_id    uuid        references public.energy_areas(id) on delete cascade,
  from_name       text,         -- name for external source, e.g. "CFE", "CENAGAS"
  from_color      text,         -- optional hex hint for chip bg when external

  -- Target: always an area
  to_area_id      uuid        not null references public.energy_areas(id) on delete cascade,

  -- Which utility flows along this link
  utility_type    text        not null references public.utility_definitions(id),

  -- Display / sorting
  sort_order      integer     not null default 0,
  notes           text,
  active          boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Integrity: from_type determines which source field is populated
  check (
    (from_type = 'area'     and from_area_id is not null)
    or
    (from_type = 'external' and from_name is not null and trim(from_name) <> '')
  ),

  -- Prevent self-loops
  check (from_area_id is null or from_area_id <> to_area_id)
);

-- One link per (area-source + destination + utility)
create unique index if not exists uq_flow_link_area
  on public.energy_flow_links (from_area_id, to_area_id, utility_type)
  where from_area_id is not null and active = true;

-- One link per (external-name + destination + utility)
create unique index if not exists uq_flow_link_external
  on public.energy_flow_links (from_name, to_area_id, utility_type)
  where from_type = 'external' and active = true;

create index if not exists idx_flow_links_site
  on public.energy_flow_links (site_id, active);
create index if not exists idx_flow_links_to
  on public.energy_flow_links (to_area_id) where active = true;
create index if not exists idx_flow_links_from_area
  on public.energy_flow_links (from_area_id) where from_area_id is not null and active = true;

alter table public.energy_flow_links enable row level security;

create policy "Flow links — view in own company"
  on public.energy_flow_links for select
  using (
    site_id in (
      select s.id from public.sites s where s.company_id = get_my_company_id()
    )
  );

create policy "Flow links — manage in own company"
  on public.energy_flow_links for all
  using (
    site_id in (
      select s.id from public.sites s where s.company_id = get_my_company_id()
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  )
  with check (
    site_id in (
      select s.id from public.sites s where s.company_id = get_my_company_id()
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  );
