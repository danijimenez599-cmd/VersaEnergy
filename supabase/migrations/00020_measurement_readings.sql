-- 00020_measurement_readings.sql
-- VersaEnergy — measurement_readings: tabla unificada de lecturas
--
-- La capa de servicio (lastReadings.ts, useEquipmentMPs.ts, InspectorPanel.tsx,
-- calculated.ts) usa 'measurement_readings'. Esta migración la crea y
-- registra energy_readings_raw como fuente histórica heredada.
--
-- Columnas principales:
--   measurement_point_id  → FK a measurement_points
--   value                 → valor numérico de la lectura
--   recorded_at           → timestamp de la lectura (de campo, no de insert)
--   quality               → 'good' | 'manual' | 'calculated' | 'estimated' |
--                           'delayed' | 'suspect' | 'missing'
--   notes                 → texto libre (fuente, comentario del operador, etc.)

create table if not exists measurement_readings (
  id                    uuid        primary key default uuid_generate_v4(),
  measurement_point_id  uuid        not null references measurement_points(id) on delete cascade,
  value                 numeric     not null,
  recorded_at           timestamptz not null default now(),
  quality               text        not null default 'good'
    check (quality in ('good', 'manual', 'calculated', 'estimated', 'delayed', 'suspect', 'missing')),
  notes                 text,
  created_at            timestamptz not null default now(),
  -- prevent exact duplicate readings for the same point at the same instant
  unique (measurement_point_id, recorded_at)
);

alter table measurement_readings enable row level security;

-- Any member of the company can read measurements for their site's MPs
create policy "Readings — view in own company"
  on measurement_readings for select
  using (
    measurement_point_id in (
      select mp.id
      from measurement_points mp
      join sites s on s.id = mp.site_id
      where s.company_id = get_my_company_id()
    )
  );

-- Admins, engineers, and managers can insert/update/delete readings
create policy "Readings — manage in own company"
  on measurement_readings for all
  using (
    measurement_point_id in (
      select mp.id
      from measurement_points mp
      join sites s on s.id = mp.site_id
      where s.company_id = get_my_company_id()
    )
  )
  with check (
    measurement_point_id in (
      select mp.id
      from measurement_points mp
      join sites s on s.id = mp.site_id
      where s.company_id = get_my_company_id()
    )
  );

-- Performance indexes
create index if not exists idx_mr_mp_id    on measurement_readings(measurement_point_id);
create index if not exists idx_mr_recorded on measurement_readings(recorded_at desc);
create index if not exists idx_mr_mp_rec   on measurement_readings(measurement_point_id, recorded_at desc);
create index if not exists idx_mr_quality  on measurement_readings(quality);
