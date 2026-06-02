-- 00001_sites.sql
-- VersaEnergy — Sites + Site Access

create table if not exists sites (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  code text,
  address text,
  timezone text not null default 'UTC',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sites enable row level security;

create policy "Sites — view in own company"
  on sites for select
  using (company_id = get_my_company_id());

create policy "Sites — admin manage in company"
  on sites for all
  using (company_id = get_my_company_id() and get_my_role() = 'admin');

create table if not exists site_access (
  profile_id uuid not null references profiles(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  primary key (profile_id, site_id)
);

alter table site_access enable row level security;

create policy "Site access — view own"
  on site_access for select
  using (profile_id in (
    select id from profiles where auth_id = auth.uid()
  ) or get_my_role() = 'admin');

create policy "Site access — admin manage in company"
  on site_access for all
  using (
    exists (
      select 1 from sites s
      where s.id = site_access.site_id
        and s.company_id = get_my_company_id()
    )
    and get_my_role() = 'admin'
  );
