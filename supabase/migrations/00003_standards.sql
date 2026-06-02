-- 00003_standards.sql
-- VersaEnergy — Catálogo de Estándares (ISA-5.1, IEC 60617)

create table if not exists standards_catalog (
  id text primary key,
  name text not null,
  description text,
  category text not null check (category in ('instrumentation', 'electrical', 'industrial_symbols', 'naming', 'semantic')),
  is_active boolean not null default true
);

alter table standards_catalog enable row level security;

create policy "Standards catalog — read all"
  on standards_catalog for select
  using (true);

insert into standards_catalog (id, name, description, category) values
('isa-5.1', 'ISA-5.1', 'Instrumentation Symbols and Identification', 'instrumentation'),
('iec-60617', 'IEC 60617', 'Graphical symbols for electrotechnical diagrams', 'electrical'),
('iso-14617', 'ISO 14617', 'Graphical symbols for industrial diagrams', 'industrial_symbols'),
('iso-81346', 'ISO/IEC 81346-1:2022', 'Structuring principles and reference designations', 'naming'),
('haystack', 'Project Haystack', 'Semantic tagging for IoT, buildings, HVAC, energy systems', 'semantic'),
('brick', 'Brick Schema', 'Semantic descriptions of physical, logical and virtual assets in buildings', 'semantic');

create table if not exists standard_tag_patterns (
  id uuid primary key default uuid_generate_v4(),
  standard_id text not null references standards_catalog(id),
  identifier text not null,
  name text not null,
  description text,
  typical_application text,
  family text not null check (family in ('flow', 'pressure', 'temperature', 'level', 'analytical', 'electrical', 'motion', 'custom')),
  prefix_pattern text not null,
  suffix_example text,
  created_at timestamptz not null default now()
);

alter table standard_tag_patterns enable row level security;

create policy "Tag patterns — read all"
  on standard_tag_patterns for select
  using (true);

insert into standard_tag_patterns (standard_id, identifier, name, description, typical_application, family, prefix_pattern, suffix_example) values
('isa-5.1', 'FE', 'Flow Element', 'Elemento primario de flujo', 'Placa de orificio, Venturi', 'flow', 'FE-{sequence}', 'FE-101'),
('isa-5.1', 'FT', 'Flow Transmitter', 'Transmisor de flujo', 'Transmisor electrónico', 'flow', 'FT-{sequence}', 'FT-101'),
('isa-5.1', 'FQI', 'Flow Quantity Indicator', 'Totalizador de flujo', 'Acumulador, totalizador', 'flow', 'FQI-{sequence}', 'FQI-401'),
('isa-5.1', 'FI', 'Flow Indicator', 'Indicador de flujo local', 'Rotámetro', 'flow', 'FI-{sequence}', 'FI-101'),
('isa-5.1', 'FC', 'Flow Controller', 'Controlador de flujo', 'Lazo PID de caudal', 'flow', 'FC-{sequence}', 'FC-101'),
('isa-5.1', 'PT', 'Pressure Transmitter', 'Transmisor de presión', 'Transmisor electrónico', 'pressure', 'PT-{sequence}', 'PT-201'),
('isa-5.1', 'PI', 'Pressure Indicator', 'Indicador de presión local', 'Manómetro', 'pressure', 'PI-{sequence}', 'PI-201'),
('isa-5.1', 'PDT', 'Pressure Diff. Transmitter', 'Transmisor de presión diferencial', 'DP en filtros', 'pressure', 'PDT-{sequence}', 'PDT-201'),
('isa-5.1', 'TT', 'Temperature Transmitter', 'Transmisor de temperatura', 'RTD con transmisor', 'temperature', 'TT-{sequence}', 'TT-301'),
('isa-5.1', 'TE', 'Temperature Element', 'Elemento sensor de temperatura', 'RTD, termocupla', 'temperature', 'TE-{sequence}', 'TE-301'),
('isa-5.1', 'TC', 'Temperature Controller', 'Controlador de temperatura', 'Lazo de temperatura', 'temperature', 'TC-{sequence}', 'TC-301'),
('isa-5.1', 'LT', 'Level Transmitter', 'Transmisor de nivel', 'Nivel de tanque', 'level', 'LT-{sequence}', 'LT-501'),
('isa-5.1', 'LS', 'Level Switch', 'Switch de nivel', 'Alarma alto/bajo', 'level', 'LS-{sequence}', 'LS-501'),
('isa-5.1', 'EM', 'Energy Meter', 'Medidor de energía', 'Medidor kWh', 'electrical', 'EM-{sequence}', 'EM-601');

create table if not exists standard_symbols (
  id uuid primary key default uuid_generate_v4(),
  standard_id text not null references standards_catalog(id),
  ref_number text not null,
  name text not null,
  description text,
  category text not null,
  created_at timestamptz not null default now()
);

alter table standard_symbols enable row level security;

create policy "Symbols — read all"
  on standard_symbols for select
  using (true);

insert into standard_symbols (standard_id, ref_number, name, description, category) values
('iec-60617', 'S00731', 'Transformer', 'Transformador de dos devanados', 'electrical_diagram'),
('iec-60617', 'S00732', 'Three-phase transformer', 'Transformador trifásico', 'electrical_diagram'),
('iec-60617', 'S00287', 'Circuit breaker', 'Interruptor automático', 'electrical_diagram'),
('iec-60617', 'S00288', 'Disconnect switch', 'Seccionador', 'electrical_diagram'),
('iec-60617', 'S00808', 'Generator', 'Generador eléctrico', 'electrical_diagram'),
('iec-60617', 'S00363', 'Motor', 'Motor eléctrico', 'electrical_diagram'),
('iec-60617', 'S00815', 'Panel / Switchgear', 'Tablero / switchgear', 'electrical_diagram'),
('iec-60617', 'S00001', 'Conductor / Cable', 'Conductor o cable', 'electrical_diagram'),
('iec-60617', 'S00555', 'Fuse', 'Fusible', 'electrical_diagram'),
('iec-60617', 'S00819', 'Battery', 'Batería / acumulador', 'electrical_diagram'),
('iec-60617', 'S00820', 'Solar panel', 'Panel solar / FV', 'electrical_diagram');
