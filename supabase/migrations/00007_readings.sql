-- 00007_readings.sql
-- VersaEnergy — Measurement: readings, imports, data quality

create table if not exists energy_import_batches (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  file_name text,
  file_size integer,
  row_count integer default 0,
  valid_count integer default 0,
  error_count integer default 0,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  column_mapping jsonb,
  errors jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table energy_import_batches enable row level security;

create policy "Import batches — view in own company"
  on energy_import_batches for select
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
  );

create policy "Import batches — manage in own company"
  on energy_import_batches for all
  using (
    site_id in (
      select s.id from sites s where s.company_id = get_my_company_id()
    )
  );

create table if not exists energy_readings_raw (
  id uuid primary key default uuid_generate_v4(),
  measurement_point_id uuid not null references measurement_points(id) on delete cascade,
  timestamp timestamptz not null,
  value numeric not null,
  unit text not null,
  source text not null default 'manual' check (source in ('manual', 'csv_import', 'iot', 'calculated')),
  import_batch_id uuid references energy_import_batches(id) on delete set null,
  raw_data jsonb,
  created_at timestamptz not null default now(),
  unique(measurement_point_id, timestamp)
);

alter table energy_readings_raw enable row level security;

create policy "Readings — view via measurement point"
  on energy_readings_raw for select
  using (
    measurement_point_id in (
      select mp.id from measurement_points mp
      join sites s on s.id = mp.site_id
      where s.company_id = get_my_company_id()
    )
  );

create policy "Readings — manage via measurement point"
  on energy_readings_raw for all
  using (
    measurement_point_id in (
      select mp.id from measurement_points mp
      join sites s on s.id = mp.site_id
      where s.company_id = get_my_company_id()
    )
  );

create table if not exists energy_readings_validated (
  id uuid primary key default uuid_generate_v4(),
  raw_reading_id uuid unique references energy_readings_raw(id) on delete cascade,
  measurement_point_id uuid not null references measurement_points(id) on delete cascade,
  timestamp timestamptz not null,
  value numeric not null,
  unit text not null,
  status text not null default 'valid' check (status in ('valid', 'suspicious', 'rejected')),
  quality_flags jsonb default '{}',
  delta_value numeric,
  delta_unit text,
  validated_by uuid references profiles(id),
  validated_at timestamptz not null default now()
);

alter table energy_readings_validated enable row level security;

create policy "Validated readings — view via mp"
  on energy_readings_validated for select
  using (
    measurement_point_id in (
      select mp.id from measurement_points mp
      join sites s on s.id = mp.site_id
      where s.company_id = get_my_company_id()
    )
  );

create policy "Validated readings — manage via mp"
  on energy_readings_validated for all
  using (
    measurement_point_id in (
      select mp.id from measurement_points mp
      join sites s on s.id = mp.site_id
      where s.company_id = get_my_company_id()
    )
  );

create index if not exists idx_readings_mp on energy_readings_raw(measurement_point_id);
create index if not exists idx_readings_ts on energy_readings_raw(timestamp);
create index if not exists idx_validated_mp on energy_readings_validated(measurement_point_id);
