-- 00027_e2_core_site_scope.sql
-- VersaEnergy E2 — contrato compartido Core -> Energy para permisos y site scope.

alter table public.site_access drop constraint if exists site_access_pkey;
alter table public.site_access alter column site_id drop not null;

alter table public.site_access
  add column if not exists id uuid default uuid_generate_v4(),
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists scope text not null default 'specific_site',
  add column if not exists is_home_site boolean not null default false,
  add column if not exists can_view boolean not null default true,
  add column if not exists can_plan boolean not null default false,
  add column if not exists can_execute boolean not null default false,
  add column if not exists can_manage_energy boolean not null default false,
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.site_access sa
set
  id = coalesce(sa.id, uuid_generate_v4()),
  user_id = coalesce(sa.user_id, sa.profile_id),
  company_id = coalesce(
    sa.company_id,
    p.company_id,
    (select s.company_id from public.sites s where s.id = sa.site_id)
  ),
  scope = case when sa.site_id is null then 'all_sites' else coalesce(sa.scope, 'specific_site') end,
  active = coalesce(sa.active, true)
from public.profiles p
where p.id = sa.profile_id;

alter table public.site_access
  alter column id set not null,
  alter column company_id set not null,
  alter column user_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.site_access'::regclass
      and conname = 'site_access_pkey'
  ) then
    alter table public.site_access add constraint site_access_pkey primary key (id);
  end if;
end $$;

alter table public.site_access drop constraint if exists site_access_scope_check;
alter table public.site_access add constraint site_access_scope_check
  check (scope in ('all_sites', 'specific_site'));

alter table public.site_access drop constraint if exists site_access_scope_site_check;
alter table public.site_access add constraint site_access_scope_site_check
  check (
    (scope = 'all_sites' and site_id is null and is_home_site = false)
    or
    (scope = 'specific_site' and site_id is not null)
  );

create unique index if not exists uq_energy_site_access_all_sites_active
  on public.site_access(company_id, user_id)
  where active = true and scope = 'all_sites';
create unique index if not exists uq_energy_site_access_specific_site_active
  on public.site_access(company_id, user_id, site_id)
  where active = true and scope = 'specific_site';
create unique index if not exists uq_energy_site_access_home_active
  on public.site_access(company_id, user_id)
  where active = true and is_home_site = true;
create index if not exists idx_energy_site_access_company_user_active
  on public.site_access(company_id, user_id, active);
create index if not exists idx_energy_site_access_company_site_active
  on public.site_access(company_id, site_id, active);

alter table public.site_access enable row level security;

create or replace function public.fn_current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select p.id
  from public.profiles p
  where p.auth_id = auth.uid()
  limit 1;
$$;

create or replace function public.fn_user_can_access_site(
  p_user_id uuid,
  p_site_id uuid
) returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile record;
  v_site_company uuid;
  v_has_scope boolean;
begin
  if p_user_id is null or p_site_id is null then
    return false;
  end if;

  select id, company_id, role, is_active
    into v_profile
  from public.profiles
  where id = p_user_id;

  if v_profile.id is null or coalesce(v_profile.is_active, false) is false then
    return false;
  end if;

  select company_id into v_site_company
  from public.sites
  where id = p_site_id;

  if v_site_company is null or v_site_company is distinct from v_profile.company_id then
    return false;
  end if;

  select exists (
    select 1
    from public.site_access sa
    where sa.company_id = v_profile.company_id
      and sa.user_id = v_profile.id
      and sa.active = true
  ) into v_has_scope;

  -- Fallback de desarrollo: antes de configurar alcances formales, un usuario
  -- activo conserva visibilidad sobre sus sedes de empresa.
  if not v_has_scope then
    return true;
  end if;

  return exists (
    select 1
    from public.site_access sa
    where sa.company_id = v_profile.company_id
      and sa.user_id = v_profile.id
      and sa.active = true
      and sa.can_view = true
      and (
        sa.scope = 'all_sites'
        or (sa.scope = 'specific_site' and sa.site_id = p_site_id)
      )
  );
end;
$$;

create or replace function public.fn_guard_energy_site_access()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_company uuid;
  v_site_company uuid;
begin
  select company_id into v_user_company
  from public.profiles
  where id = new.user_id;

  if v_user_company is null or v_user_company is distinct from new.company_id then
    raise exception 'El usuario no pertenece a la empresa del alcance.';
  end if;

  if new.site_id is not null then
    select company_id into v_site_company
    from public.sites
    where id = new.site_id;

    if v_site_company is null or v_site_company is distinct from new.company_id then
      raise exception 'La sede no pertenece a la empresa del alcance.';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_guard_energy_site_access on public.site_access;
create trigger trg_guard_energy_site_access
before insert or update of company_id, user_id, site_id, scope, active
on public.site_access
for each row execute function public.fn_guard_energy_site_access();

drop policy if exists "Site access — view own company" on public.site_access;
create policy "Site access — view own company"
  on public.site_access for select
  using (company_id = get_my_company_id());

drop policy if exists "Site access — manage own company" on public.site_access;
create policy "Site access — manage own company"
  on public.site_access for all
  using (company_id = get_my_company_id() and get_my_role() in ('admin', 'manager'))
  with check (company_id = get_my_company_id() and get_my_role() in ('admin', 'manager'));

-- Core/mock tables: scope de sede sobre activos fisicos, perfiles Energy,
-- solicitudes, eventos y mediciones compartidas.
drop policy if exists "Assets - view in own company" on public.assets;
drop policy if exists "Assets - manage in own company" on public.assets;
create policy "Assets - view scoped sites"
  on public.assets for select
  using (public.fn_user_can_access_site(public.fn_current_profile_id(), site_id));
create policy "Assets - manage scoped sites"
  on public.assets for all
  using (
    public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
    and get_my_role() in ('admin', 'engineer', 'manager')
  )
  with check (
    public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

drop policy if exists "Energy profiles - view in own company" on public.energy_asset_profiles;
drop policy if exists "Energy profiles - manage in own company" on public.energy_asset_profiles;
create policy "Energy profiles - view scoped sites"
  on public.energy_asset_profiles for select
  using (
    exists (
      select 1
      from public.assets a
      where a.id = asset_id
        and public.fn_user_can_access_site(public.fn_current_profile_id(), a.site_id)
    )
  );
create policy "Energy profiles - manage scoped sites"
  on public.energy_asset_profiles for all
  using (
    exists (
      select 1
      from public.assets a
      where a.id = asset_id
        and public.fn_user_can_access_site(public.fn_current_profile_id(), a.site_id)
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  )
  with check (
    exists (
      select 1
      from public.assets a
      where a.id = asset_id
        and public.fn_user_can_access_site(public.fn_current_profile_id(), a.site_id)
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

drop policy if exists "Measurement points — view in own company" on public.measurement_points;
drop policy if exists "Measurement points — manage in own company" on public.measurement_points;
create policy "Measurement points — view scoped sites"
  on public.measurement_points for select
  using (public.fn_user_can_access_site(public.fn_current_profile_id(), site_id));
create policy "Measurement points — manage scoped sites"
  on public.measurement_points for all
  using (
    public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
    and get_my_role() in ('admin', 'engineer', 'manager')
  )
  with check (
    public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

drop policy if exists "Readings — view in own company" on public.measurement_readings;
drop policy if exists "Readings — manage in own company" on public.measurement_readings;
create policy "Readings — view scoped sites"
  on public.measurement_readings for select
  using (
    exists (
      select 1
      from public.measurement_points mp
      where mp.id = measurement_point_id
        and public.fn_user_can_access_site(public.fn_current_profile_id(), mp.site_id)
    )
  );
create policy "Readings — manage scoped sites"
  on public.measurement_readings for all
  using (
    exists (
      select 1
      from public.measurement_points mp
      where mp.id = measurement_point_id
        and public.fn_user_can_access_site(public.fn_current_profile_id(), mp.site_id)
    )
    and get_my_role() in ('admin', 'engineer', 'manager', 'operator')
  )
  with check (
    exists (
      select 1
      from public.measurement_points mp
      where mp.id = measurement_point_id
        and public.fn_user_can_access_site(public.fn_current_profile_id(), mp.site_id)
    )
    and get_my_role() in ('admin', 'engineer', 'manager', 'operator')
  );

alter table public.asset_registry_requests enable row level security;

drop policy if exists "Asset registry requests — view scoped sites" on public.asset_registry_requests;
create policy "Asset registry requests — view scoped sites"
  on public.asset_registry_requests for select
  using (public.fn_user_can_access_site(public.fn_current_profile_id(), site_id));

drop policy if exists "Asset registry requests — create scoped sites" on public.asset_registry_requests;
create policy "Asset registry requests — create scoped sites"
  on public.asset_registry_requests for insert
  with check (
    public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
    and get_my_role() in ('admin', 'engineer', 'manager', 'operator')
  );

drop policy if exists "Asset registry requests — decide scoped sites" on public.asset_registry_requests;
create policy "Asset registry requests — decide scoped sites"
  on public.asset_registry_requests for update
  using (
    public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
    and get_my_role() in ('admin', 'engineer', 'manager')
  )
  with check (
    public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

drop policy if exists "Asset registry events — view in own company" on public.asset_registry_events;
drop policy if exists "Asset registry events — manage in own company" on public.asset_registry_events;
create policy "Asset registry events — view scoped sites"
  on public.asset_registry_events for select
  using (public.fn_user_can_access_site(public.fn_current_profile_id(), site_id));
create policy "Asset registry events — append scoped sites"
  on public.asset_registry_events for insert
  with check (
    public.fn_user_can_access_site(public.fn_current_profile_id(), site_id)
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

grant execute on function public.fn_current_profile_id() to authenticated;
grant execute on function public.fn_user_can_access_site(uuid, uuid) to authenticated;
