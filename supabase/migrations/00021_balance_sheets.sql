-- ── 00021_balance_sheets.sql ─────────────────────────────────────────────────
-- Balance Sheets: el usuario compone manualmente entradas y salidas.
-- Tres tablas core + dos para variables de producción (denominador de EnPIs).

-- ── 1. energy_balance_sheets ─────────────────────────────────────────────────
-- Cabecera del balance: nombre, boundary, período, utility elegida.

create table if not exists energy_balance_sheets (
  id              uuid primary key default gen_random_uuid(),
  site_id         uuid not null references sites(id) on delete cascade,
  name            text not null,
  description     text,

  -- Boundary: a qué área o equipo pertenece este balance (para reportes)
  boundary_type   text check (boundary_type in ('area','equipment','system','site')),
  boundary_id     uuid,  -- → energy_areas.id o energy_equipment.id (sin FK dura para flexibilidad)

  -- Período cubierto
  period_start    date not null,
  period_end      date not null,

  -- Utility principal. NULL = multi-utility (resultados en kWh-eq)
  utility         text references utility_definitions(id),

  status          text not null default 'draft'
                  check (status in ('draft','closed','approved')),

  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 2. energy_balance_entries ─────────────────────────────────────────────────
-- Cada fila = un MP que el usuario arrastró y asignó a entrada o salida.

create table if not exists energy_balance_entries (
  id                    uuid primary key default gen_random_uuid(),
  sheet_id              uuid not null references energy_balance_sheets(id) on delete cascade,

  side                  text not null check (side in ('input','output')),

  -- Equipo arrastrado (origen de la búsqueda de MPs)
  equipment_id          uuid references energy_equipment(id),

  -- MP concreto elegido de ese equipo
  measurement_point_id  uuid references measurement_points(id),

  -- Etiqueta override (el usuario puede renombrar la fila)
  label                 text,

  order_index           integer not null default 0,

  -- Valores calculados al ejecutar el balance (se actualizan en cada recalculo)
  value                 numeric,
  unit                  text,
  value_kwh_eq          numeric,   -- valor convertido a kWh equivalentes

  notes                 text,
  created_at            timestamptz not null default now()
);

-- ── 3. energy_balance_results ─────────────────────────────────────────────────
-- Snapshot del cálculo. Se inserta uno nuevo en cada recalculo (historial).

create table if not exists energy_balance_results (
  id                      uuid primary key default gen_random_uuid(),
  sheet_id                uuid not null references energy_balance_sheets(id) on delete cascade,
  calculated_at           timestamptz not null default now(),

  -- Totales en unidad nativa (depende de utility del sheet)
  total_input             numeric,
  total_output            numeric,
  unit                    text,

  -- Totales en kWh equivalentes (siempre disponible)
  total_input_kwh_eq      numeric,
  total_output_kwh_eq     numeric,

  -- Diferencia no explicada
  unaccounted_for         numeric,
  unaccounted_for_kwh_eq  numeric,
  unaccounted_for_pct     numeric,

  -- Cobertura: % del input que está medido (vs estimado/manual)
  measurement_coverage    numeric,

  -- Desglose por utility para sheets multi-utility
  -- { "electricity": { "input_kwh": X, "output_kwh": Y },
  --   "steam":       { "input_kwh": A, "output_kwh": B } }
  by_utility              jsonb not null default '{}'
);

-- ── 4. production_variables ──────────────────────────────────────────────────
-- Variables de producción usadas como denominador de EnPIs.
-- Ej: "Toneladas producidas", "Unidades empacadas", "Horas de operación"

create table if not exists production_variables (
  id            uuid primary key default gen_random_uuid(),
  site_id       uuid not null references sites(id) on delete cascade,
  name          text not null,
  description   text,
  unit          text not null,   -- "ton", "unidades", "horas", "m2"
  source_type   text not null default 'manual'
                check (source_type in ('manual','iot_db','calculated')),
  source_config jsonb not null default '{}',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ── 5. production_readings ───────────────────────────────────────────────────
-- Lecturas de producción por período (ingresadas manualmente o via IoT).

create table if not exists production_readings (
  id            uuid primary key default gen_random_uuid(),
  variable_id   uuid not null references production_variables(id) on delete cascade,
  period_start  date not null,
  period_end    date not null,
  value         numeric not null,
  notes         text,
  recorded_at   timestamptz not null default now(),
  recorded_by   uuid references auth.users(id),
  unique (variable_id, period_start, period_end)
);

-- ── Índices ──────────────────────────────────────────────────────────────────

create index if not exists idx_balance_sheets_site   on energy_balance_sheets(site_id);
create index if not exists idx_balance_sheets_period on energy_balance_sheets(period_start, period_end);
create index if not exists idx_balance_entries_sheet on energy_balance_entries(sheet_id);
create index if not exists idx_balance_results_sheet on energy_balance_results(sheet_id, calculated_at desc);
create index if not exists idx_prod_vars_site         on production_variables(site_id);
create index if not exists idx_prod_readings_var      on production_readings(variable_id, period_start);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table energy_balance_sheets   enable row level security;
alter table energy_balance_entries  enable row level security;
alter table energy_balance_results  enable row level security;
alter table production_variables    enable row level security;
alter table production_readings     enable row level security;

-- Política: usuario autenticado accede a registros de su site
-- (mismo patrón que el resto de la app — company-scoped via profiles)

create policy "balance_sheets_auth" on energy_balance_sheets
  for all to authenticated
  using (
    site_id in (
      select s.id from sites s
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

create policy "balance_entries_auth" on energy_balance_entries
  for all to authenticated
  using (
    sheet_id in (
      select bs.id from energy_balance_sheets bs
      join sites s on s.id = bs.site_id
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

create policy "balance_results_auth" on energy_balance_results
  for all to authenticated
  using (
    sheet_id in (
      select bs.id from energy_balance_sheets bs
      join sites s on s.id = bs.site_id
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

create policy "prod_variables_auth" on production_variables
  for all to authenticated
  using (
    site_id in (
      select s.id from sites s
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

create policy "prod_readings_auth" on production_readings
  for all to authenticated
  using (
    variable_id in (
      select pv.id from production_variables pv
      join sites s on s.id = pv.site_id
      join profiles p on p.company_id = s.company_id
      where p.auth_id = auth.uid()
    )
  );

-- ── Trigger updated_at en balance_sheets ─────────────────────────────────────

create or replace function update_balance_sheet_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_balance_sheets_updated_at
  before update on energy_balance_sheets
  for each row execute function update_balance_sheet_updated_at();
