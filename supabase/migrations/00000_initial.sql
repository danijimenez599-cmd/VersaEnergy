-- 00000_initial.sql
-- VersaEnergy — Multi-tenant foundation

create extension if not exists "uuid-ossp";

------------------------------------------------------------
-- Tables
------------------------------------------------------------
create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid unique not null references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'viewer' check (role in ('admin', 'manager', 'engineer', 'operator', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

------------------------------------------------------------
-- Security definer function to avoid RLS recursion
------------------------------------------------------------
create or replace function public.get_my_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from public.profiles where auth_id = auth.uid();
$$;

create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where auth_id = auth.uid();
$$;

------------------------------------------------------------
-- RLS — Enable
------------------------------------------------------------
alter table companies enable row level security;
alter table profiles enable row level security;

------------------------------------------------------------
-- RLS — companies
------------------------------------------------------------
create policy "Companies — view own company"
  on companies for select
  using (id = get_my_company_id());

create policy "Companies — admin insert"
  on companies for insert
  with check (true);

create policy "Companies — admin update own company"
  on companies for update
  using (id = get_my_company_id() and get_my_role() = 'admin');

------------------------------------------------------------
-- RLS — profiles
------------------------------------------------------------
create policy "Profiles — view own and company members"
  on profiles for select
  using (auth_id = auth.uid() or company_id = get_my_company_id());

create policy "Profiles — update own"
  on profiles for update
  using (auth_id = auth.uid());

create policy "Profiles — admin manage in company"
  on profiles for all
  using (company_id = get_my_company_id() and get_my_role() = 'admin');

------------------------------------------------------------
-- Trigger: auto-create profile on signup
------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (auth_id, company_id, email, full_name, role)
  values (
    new.id,
    coalesce((select id from public.companies order by created_at limit 1), '00000000-0000-0000-0000-000000000000'::uuid),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'viewer'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = 'public, auth';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
