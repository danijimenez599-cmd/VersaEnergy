-- 00018_enpi_significant_variables.sql
-- VersaEnergy — Variables significativas de EnPIs con datos por periodo
-- Habilita análisis de correlación y regresión OLS para ajuste de línea base.

-- ── Variable definitions per EnPI ───────────────────────────────────────────
create table if not exists enpi_significant_variables (
  id uuid primary key default uuid_generate_v4(),
  enpi_id uuid not null references energy_enpis(id) on delete cascade,

  name text not null,
  description text,
  unit text not null,

  -- 'continuous': temperatura, presión, humedad → se promedia o toma max/min
  -- 'discrete': producción, lotes, defectos → se suma
  data_type text not null default 'continuous'
    check (data_type in ('continuous', 'discrete')),

  -- Cómo agregar lecturas del periodo en un solo valor
  aggregation_method text not null default 'average'
    check (aggregation_method in ('sum', 'average', 'max', 'min', 'last')),

  -- Vínculo opcional a un punto de medición existente (para futura auto-agregación)
  measurement_point_id uuid references measurement_points(id) on delete set null,

  -- Expectativa de impacto inicial (ayuda a validar el signo del coeficiente)
  expected_impact text default 'unknown'
    check (expected_impact in ('positive', 'negative', 'neutral', 'unknown')),

  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table enpi_significant_variables enable row level security;

create policy "EnPI variables — view in own company"
  on enpi_significant_variables for select
  using (enpi_id in (
    select e.id from energy_enpis e
    join sites s on s.id = e.site_id
    where s.company_id = get_my_company_id()
  ));

create policy "EnPI variables — manage in own company"
  on enpi_significant_variables for all
  using (enpi_id in (
    select e.id from energy_enpis e
    join sites s on s.id = e.site_id
    where s.company_id = get_my_company_id()
  ));

-- ── Variable period values (the X data for regression) ──────────────────────
create table if not exists enpi_variable_period_values (
  id uuid primary key default uuid_generate_v4(),
  variable_id uuid not null references enpi_significant_variables(id) on delete cascade,

  period_label text not null,    -- Ej. "2025-01", "2025-Q1", "S1 2025"
  period_start date not null,
  period_end date not null,
  value numeric not null,

  -- 'manual': capturado directamente por el usuario
  -- 'auto_aggregated': calculado a partir de lecturas del medidor vinculado
  source text not null default 'manual'
    check (source in ('manual', 'auto_aggregated')),

  notes text,
  created_at timestamptz not null default now(),

  unique(variable_id, period_start)
);

alter table enpi_variable_period_values enable row level security;

create policy "EnPI var values — view in own company"
  on enpi_variable_period_values for select
  using (variable_id in (
    select v.id from enpi_significant_variables v
    join energy_enpis e on e.id = v.enpi_id
    join sites s on s.id = e.site_id
    where s.company_id = get_my_company_id()
  ));

create policy "EnPI var values — manage in own company"
  on enpi_variable_period_values for all
  using (variable_id in (
    select v.id from enpi_significant_variables v
    join energy_enpis e on e.id = v.enpi_id
    join sites s on s.id = e.site_id
    where s.company_id = get_my_company_id()
  ));

-- ── EnPI period values (the Y variable for regression) ──────────────────────
-- Complementa energy_performance_results (que requiere fórmula ejecutada).
-- Permite captura manual mientras no haya motor de cálculo automático.
create table if not exists enpi_period_values (
  id uuid primary key default uuid_generate_v4(),
  enpi_id uuid not null references energy_enpis(id) on delete cascade,

  period_label text not null,
  period_start date not null,
  period_end date not null,
  actual_value numeric not null,
  notes text,
  created_at timestamptz not null default now(),

  unique(enpi_id, period_start)
);

alter table enpi_period_values enable row level security;

create policy "EnPI period values — view in own company"
  on enpi_period_values for select
  using (enpi_id in (
    select e.id from energy_enpis e
    join sites s on s.id = e.site_id
    where s.company_id = get_my_company_id()
  ));

create policy "EnPI period values — manage in own company"
  on enpi_period_values for all
  using (enpi_id in (
    select e.id from energy_enpis e
    join sites s on s.id = e.site_id
    where s.company_id = get_my_company_id()
  ));

-- Índices
create index if not exists idx_enpi_sig_vars_enpi on enpi_significant_variables(enpi_id);
create index if not exists idx_enpi_var_vals_var  on enpi_variable_period_values(variable_id);
create index if not exists idx_enpi_period_vals   on enpi_period_values(enpi_id, period_start);
