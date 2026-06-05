-- 00022_enpi_referential.sql
-- F2: columnas referenciales en energy_enpis
-- Permiten ligar el numerador a un balance_sheet o MP, y el denominador a production_variable

alter table energy_enpis
  add column if not exists numerator_type text not null default 'formula'
    check (numerator_type in ('formula', 'balance_sheet', 'measurement_point')),
  add column if not exists numerator_ref_id uuid,
  add column if not exists numerator_side text
    check (numerator_side in ('input', 'output', 'net')),
  add column if not exists denominator_type text not null default 'formula'
    check (denominator_type in ('formula', 'production_variable')),
  add column if not exists denominator_ref_id uuid;

-- EnPI-1 (kWh/ton electricidad) → referencial: MP EM-001 como numerador,
-- "Toneladas producidas" como denominador. Esto produce 18 meses de tendencia calculable.
update energy_enpis
set
  numerator_type    = 'measurement_point',
  numerator_ref_id  = '11000000-0000-0000-0000-000000000001',
  denominator_type  = 'production_variable',
  denominator_ref_id = 'd1000000-0000-0000-0000-000000000001'
where id = '22000000-0000-0000-0000-000000000001';
