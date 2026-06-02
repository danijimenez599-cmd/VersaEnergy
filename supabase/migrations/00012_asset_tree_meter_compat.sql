-- 00012_asset_tree_meter_compat.sql
-- Asset-tree compatibility with VersaMaint and maintainable measurement devices.

alter table utility_systems
  add column if not exists code text,
  add column if not exists area_id uuid references energy_areas(id) on delete set null,
  add column if not exists properties jsonb not null default '{}',
  add column if not exists cmms_asset_id uuid,
  add column if not exists integration_key text,
  add column if not exists sync_status text not null default 'local'
    check (sync_status in ('local', 'synced', 'pending_sync', 'conflict')),
  add column if not exists last_synced_at timestamptz;

alter table energy_areas
  add column if not exists cmms_asset_id uuid,
  add column if not exists integration_key text,
  add column if not exists sync_status text not null default 'local'
    check (sync_status in ('local', 'synced', 'pending_sync', 'conflict')),
  add column if not exists last_synced_at timestamptz;

alter table energy_equipment
  add column if not exists cmms_asset_id uuid,
  add column if not exists integration_key text,
  add column if not exists sync_status text not null default 'local'
    check (sync_status in ('local', 'synced', 'pending_sync', 'conflict')),
  add column if not exists last_synced_at timestamptz;

alter table measurement_points
  add column if not exists meter_equipment_id uuid references energy_equipment(id) on delete set null,
  add column if not exists last_calibration_date date,
  add column if not exists calibration_due_date date,
  add column if not exists properties jsonb not null default '{}',
  add column if not exists cmms_asset_id uuid,
  add column if not exists integration_key text,
  add column if not exists sync_status text not null default 'local'
    check (sync_status in ('local', 'synced', 'pending_sync', 'conflict')),
  add column if not exists last_synced_at timestamptz;

alter table measurement_points
  drop constraint if exists measurement_points_target_type_check;

alter table measurement_points
  add constraint measurement_points_target_type_check
  check (target_type in ('node', 'edge', 'system', 'area', 'equipment'));

create table if not exists measurement_point_attachments (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  measurement_point_id uuid not null references measurement_points(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  category text not null default 'other'
    check (category in ('calibration_certificate', 'datasheet', 'photo', 'manual', 'other')),
  notes text,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table measurement_point_attachments enable row level security;

create policy "Measurement attachments — view in own company"
  on measurement_point_attachments for select
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
  );

create policy "Measurement attachments — manage in own company"
  on measurement_point_attachments for all
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  )
  with check (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'energy-attachments',
  'energy-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

create policy "Energy attachments — view own site files"
  on storage.objects for select
  using (
    bucket_id = 'energy-attachments'
    and exists (
      select 1
      from sites s
      where s.id::text = (storage.foldername(name))[1]
        and s.company_id = get_my_company_id()
    )
  );

create policy "Energy attachments — upload own site files"
  on storage.objects for insert
  with check (
    bucket_id = 'energy-attachments'
    and exists (
      select 1
      from sites s
      where s.id::text = (storage.foldername(name))[1]
        and s.company_id = get_my_company_id()
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

create policy "Energy attachments — delete own site files"
  on storage.objects for delete
  using (
    bucket_id = 'energy-attachments'
    and exists (
      select 1
      from sites s
      where s.id::text = (storage.foldername(name))[1]
        and s.company_id = get_my_company_id()
    )
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

create index if not exists idx_utility_systems_area on utility_systems(area_id);
create index if not exists idx_equipment_system on energy_equipment(utility_system_id);
create index if not exists idx_mp_meter_equipment on measurement_points(meter_equipment_id);
create index if not exists idx_mp_attachments_site on measurement_point_attachments(site_id);
create index if not exists idx_mp_attachments_point on measurement_point_attachments(measurement_point_id);
