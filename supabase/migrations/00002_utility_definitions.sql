-- 00002_utility_definitions.sql
-- VersaEnergy — Catálogo de Utility Definitions + Unidades

create table if not exists utility_definitions (
  id text primary key,
  name text not null,
  category text not null check (category in ('fluid', 'gas', 'electrical', 'thermal', 'custom')),
  default_unit text not null,
  flow_units text[] not null default '{}',
  energy_units text[] not null default '{}',
  allowed_node_types text[] not null default '{}',
  allowed_meter_types text[] not null default '{}',
  line_color text not null,
  line_stroke_width integer not null default 2,
  line_stroke_dasharray text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table utility_definitions enable row level security;

create policy "Utility definitions — read all"
  on utility_definitions for select
  using (true);

create policy "Utility definitions — admin manage"
  on utility_definitions for all
  using (get_my_role() = 'admin');

insert into utility_definitions (id, name, category, default_unit, flow_units, energy_units, allowed_node_types, allowed_meter_types, line_color, line_stroke_width, line_stroke_dasharray) values
('electricity', 'Electricidad', 'electrical', 'kWh',
 '{kWh, kW, kVA, kvarh, V, A}',
 '{kWh, MWh, GJ}',
 '{transformer, panel, breaker, power_meter, current_transformer, consumer, utility_source, generator, battery_storage, motor, area, process, loss_node}',
 '{power_meter, energy_meter, current_transformer}',
 '#1e40af', 2, null),

('natural_gas', 'Gas natural', 'gas', 'm3',
 '{m3, Nm3, SCF, ft3}',
 '{BTU, GJ, kWh}',
 '{boiler, valve, regulator, gas_meter, consumer, utility_source, pipe, header, area, process, loss_node}',
 '{gas_meter, flow_meter}',
 '#ea580c', 3, '2 4'),

('lpg', 'GLP', 'gas', 'kg',
 '{kg, L, gal}',
 '{BTU, GJ, kWh}',
 '{boiler, valve, regulator, gas_meter, consumer, utility_source, tank, pipe, header, area, process, loss_node}',
 '{gas_meter, flow_meter}',
 '#ea580c', 3, '1 3'),

('diesel', 'Diésel', 'fluid', 'L',
 '{L, gal, kg}',
 '{BTU, GJ, kWh}',
 '{generator, pump, tank, valve, consumer, utility_source, pipe, area, process, loss_node}',
 '{flow_meter, level_sensor}',
 '#f97316', 3, '4 2'),

('steam', 'Vapor', 'thermal', 'kg',
 '{kg, lb, ton}',
 '{kWh_th, BTU, MJ, GJ}',
 '{boiler, steam_header, valve, control_valve, check_valve, heat_exchanger, steam_trap, condensate_return, steam_meter, consumer, utility_source, pipe, header, area, process, loss_node, pump}',
 '{steam_meter, flow_meter, pressure_sensor, temperature_sensor}',
 '#7c3aed', 4, '8 4'),

('condensate', 'Condensado', 'fluid', 'm3',
 '{m3, L, kg}',
 '{kWh_th, BTU, MJ}',
 '{condensate_return, pump, tank, valve, pipe, consumer, area, process, loss_node}',
 '{flow_meter, temperature_sensor, level_sensor}',
 '#a855f7', 3, '6 3'),

('compressed_air', 'Aire comprimido', 'gas', 'Nm3',
 '{Nm3, SCFM, m3}',
 '{kWh_e, kWh/Nm3}',
 '{compressor, dryer, tank, valve, regulator, pipe, header, consumer, utility_source, area, process, loss_node}',
 '{flow_meter, pressure_sensor}',
 '#0d9488', 3, null),

('chilled_water', 'Agua helada', 'thermal', 'TR-h',
 '{m3, GPM, TR, TR-h, L/s}',
 '{BTU/h, kWh_th}',
 '{chiller, cooling_tower, pump, tank, valve, pipe, header, ahu, consumer, utility_source, area, process, loss_node}',
 '{flow_meter, energy_meter, temperature_sensor, pressure_sensor}',
 '#06b6d4', 3, null),

('hot_water', 'Agua caliente', 'thermal', 'm3',
 '{m3, L, GPM}',
 '{BTU, kWh_th}',
 '{boiler, pump, tank, valve, heat_exchanger, pipe, header, consumer, area, process, loss_node}',
 '{flow_meter, temperature_sensor, energy_meter}',
 '#0891b2', 3, null),

('industrial_water', 'Agua industrial', 'fluid', 'm3',
 '{m3, L, GPM}',
 '{}',
 '{pump, tank, valve, pipe, header, consumer, utility_source, area, process, loss_node}',
 '{flow_meter, water_meter, pressure_sensor}',
 '#0e7490', 3, null),

('potable_water', 'Agua potable', 'fluid', 'm3',
 '{m3, L, GPM}',
 '{}',
 '{pump, tank, valve, pipe, header, consumer, utility_source, area, process, loss_node}',
 '{flow_meter, water_meter}',
 '#0369a1', 3, null),

('process_water', 'Agua de proceso', 'fluid', 'm3',
 '{m3, L, GPM}',
 '{}',
 '{pump, tank, valve, pipe, header, consumer, utility_source, area, process, loss_node}',
 '{flow_meter, water_meter, pressure_sensor, temperature_sensor}',
 '#0284c7', 3, null),

('refrigeration', 'Refrigeración', 'thermal', 'TR-h',
 '{TR, TR-h, kW_th}',
 '{kWh_th, BTU}',
 '{chiller, compressor, cooling_tower, pump, heat_exchanger, tank, pipe, consumer, area, process, loss_node}',
 '{energy_meter, temperature_sensor, pressure_sensor, flow_meter}',
 '#06b6d4', 3, '2 2'),

('industrial_gas', 'Gases industriales', 'gas', 'Nm3',
 '{Nm3, SCF, m3, kg}',
 '{}',
 '{tank, valve, regulator, pipe, header, consumer, utility_source, area, process, loss_node}',
 '{flow_meter, pressure_sensor, gas_meter}',
 '#6366f1', 3, '3 2'),

('solar_generation', 'Generación solar', 'electrical', 'kWh',
 '{kWh, kW, MWh}',
 '{kWh, MWh}',
 '{generator, panel, power_meter, transformer, consumer, utility_source, area, process}',
 '{power_meter, energy_meter}',
 '#22c55e', 2, null),

('battery_storage', 'Almacenamiento (baterías)', 'electrical', 'kWh',
 '{kWh, kW, MWh}',
 '{kWh, MWh}',
 '{battery_storage, panel, power_meter, transformer, consumer, utility_source, area, process}',
 '{power_meter, energy_meter}',
 '#16a34a', 2, '4 4');

------------------------------------------------------------
-- utility_units
------------------------------------------------------------
create table if not exists utility_units (
  id text primary key,
  name text not null,
  symbol text not null,
  utility_type text not null references utility_definitions(id),
  unit_category text not null check (unit_category in ('flow', 'volume', 'mass', 'energy', 'power', 'pressure', 'temperature', 'level', 'current', 'voltage', 'runtime', 'custom')),
  is_default boolean not null default false
);

alter table utility_units enable row level security;

create policy "Utility units — read all"
  on utility_units for select
  using (true);

insert into utility_units (id, name, symbol, utility_type, unit_category, is_default) values
('kWh', 'Kilowatt-hora', 'kWh', 'electricity', 'energy', true),
('kW', 'Kilowatt', 'kW', 'electricity', 'power', false),
('A', 'Ampere', 'A', 'electricity', 'current', false),
('V', 'Volt', 'V', 'electricity', 'voltage', false),
('Nm3', 'Metro cúbico normal', 'Nm³', 'natural_gas', 'volume', true),
('BTU', 'British Thermal Unit', 'BTU', 'natural_gas', 'energy', false),
('GJ', 'Gigajoule', 'GJ', 'natural_gas', 'energy', false),
('kg', 'Kilogramo', 'kg', 'steam', 'mass', true),
('kg_h', 'Kilogramo por hora', 'kg/h', 'steam', 'flow', false),
('bar', 'Bar', 'bar', 'steam', 'pressure', false),
('Nm3_air', 'Metro cúbico normal', 'Nm³', 'compressed_air', 'flow', true),
('SCFM', 'Standard Cubic Feet per Minute', 'SCFM', 'compressed_air', 'flow', false),
('TR', 'Tonelada de refrigeración', 'TR', 'chilled_water', 'power', false),
('TR_h', 'Tonelada-hora de refrigeración', 'TR-h', 'chilled_water', 'energy', true),
('GPM', 'Galones por minuto', 'GPM', 'chilled_water', 'flow', false),
('m3', 'Metro cúbico', 'm³', 'industrial_water', 'volume', true),
('L', 'Litro', 'L', 'industrial_water', 'volume', false),
('psi', 'PSI', 'psi', 'compressed_air', 'pressure', false),
('C', 'Celsius', '°C', 'steam', 'temperature', false);

------------------------------------------------------------
-- equipment_types catalog
------------------------------------------------------------
create table if not exists equipment_types (
  id text primary key,
  family text not null check (family in ('equipment', 'connector', 'control', 'measurement', 'iot', 'organizational', 'special')),
  name text not null,
  tag_prefix text,
  compatible_utilities text[] not null default '{}',
  default_properties jsonb not null default '{}',
  icon_name text
);

alter table equipment_types enable row level security;

create policy "Equipment types — read all"
  on equipment_types for select
  using (true);

-- Equipment
insert into equipment_types (id, family, name, tag_prefix, compatible_utilities, default_properties, icon_name) values
('boiler', 'equipment', 'Caldera', 'B', '{steam, hot_water}', '{"nominal_capacity": null, "pressure_rating": null}', 'Flame'),
('pump', 'equipment', 'Bomba', 'PU', '{steam, condensate, chilled_water, hot_water, industrial_water, process_water}', '{"nominal_capacity": null, "head": null}', 'Radiator'),
('compressor', 'equipment', 'Compresor', 'C', '{compressed_air, refrigeration}', '{"nominal_capacity": null, "pressure_rating": null}', 'Binary'),
('chiller', 'equipment', 'Chiller', 'CH', '{chilled_water, refrigeration}', '{"capacity_tr": null, "eer": null}', 'Snowflake'),
('cooling_tower', 'equipment', 'Torre de enfriamiento', 'CT', '{chilled_water, refrigeration}', '{"capacity_tr": null}', 'Wind'),
('tank', 'equipment', 'Tanque', 'TK', '{steam, condensate, compressed_air, chilled_water, hot_water, industrial_water, diesel, lpg, industrial_gas}', '{"volume": null}', 'Container'),
('transformer', 'equipment', 'Transformador', 'T', '{electricity, solar_generation, battery_storage}', '{"capacity_kva": null, "voltage_primary": null, "voltage_secondary": null}', 'Zap'),
('panel', 'equipment', 'Tablero / Panel', 'P', '{electricity, solar_generation, battery_storage}', '{"voltage_level": null, "phase": "three"}', 'LayoutPanelTop'),
('generator', 'equipment', 'Generador', 'G', '{electricity, diesel, solar_generation}', '{"capacity_kw": null}', 'Power'),
('heat_exchanger', 'equipment', 'Intercambiador de calor', 'HX', '{steam, condensate, chilled_water, hot_water, refrigeration}', '{"capacity": null}', 'BetweenHorizontalEnd'),
('motor', 'equipment', 'Motor', 'M', '{electricity}', '{"power_kw": null, "rpm": null}', 'Cog'),
('consumer', 'equipment', 'Consumidor', 'CON', '{electricity, natural_gas, steam, compressed_air, chilled_water, hot_water, industrial_water, process_water, refrigeration}', '{}', 'Plug');

-- Connectors
insert into equipment_types (id, family, name, tag_prefix, compatible_utilities, default_properties, icon_name) values
('connector_pipe', 'connector', 'Tubería', 'PP', '{steam, condensate, compressed_air, chilled_water, hot_water, industrial_water, potable_water, process_water, diesel, lpg, natural_gas, industrial_gas}', '{"diameter": null, "material": null}', 'ArrowRightLeft'),
('connector_duct', 'connector', 'Ducto', 'DC', '{compressed_air}', '{"width": null, "height": null}', 'ArrowRightLeft'),
('connector_cable', 'connector', 'Cable', 'CB', '{electricity, solar_generation, battery_storage}', '{"cross_section": null, "voltage_level": null}', 'ArrowRightLeft'),
('connector_busbar', 'connector', 'Barra', 'BB', '{electricity, solar_generation, battery_storage}', '{"rated_current": null}', 'GripHorizontal'),
('header', 'connector', 'Header', 'HD', '{steam, condensate, compressed_air, chilled_water, hot_water, industrial_water, process_water}', '{"diameter": null, "pressure_rating": null}', 'Columns'),
('manifold', 'connector', 'Manifold', 'MF', '{steam, compressed_air, chilled_water, hot_water, industrial_water}', '{"outlets": null}', 'GitFork');

-- Control
insert into equipment_types (id, family, name, tag_prefix, compatible_utilities, default_properties, icon_name) values
('valve', 'control', 'Válvula', 'V', '{steam, condensate, compressed_air, chilled_water, hot_water, industrial_water, potable_water, process_water, diesel, lpg, natural_gas, industrial_gas}', '{"type": "gate", "size": null}', 'CircleDot'),
('damper', 'control', 'Damper', 'DP', '{compressed_air}', '{}', 'CircleDot'),
('breaker', 'control', 'Breaker / Interruptor', 'BR', '{electricity, solar_generation, battery_storage}', '{"rated_current": null, "poles": 3}', 'PowerOff'),
('regulator', 'control', 'Regulador', 'RG', '{natural_gas, lpg, compressed_air, industrial_gas}', '{"setpoint": null, "range": null}', 'CircleDot'),
('control_valve', 'control', 'Válvula de control', 'CV', '{steam, compressed_air, chilled_water, hot_water, industrial_water}', '{"actuator": "pneumatic", "fail_position": "close"}', 'CircleDot'),
('check_valve', 'control', 'Válvula check', 'CK', '{steam, condensate, compressed_air, chilled_water, hot_water, industrial_water}', '{"cracking_pressure": null}', 'ArrowRight');

-- Measurement
insert into equipment_types (id, family, name, tag_prefix, compatible_utilities, default_properties, icon_name) values
('flow_meter', 'measurement', 'Medidor de flujo', 'FE/FQI', '{steam, condensate, compressed_air, chilled_water, hot_water, industrial_water, potable_water, process_water, diesel, lpg, natural_gas, industrial_gas}', '{"technology": "electromagnetic", "accuracy": null}', 'Gauge'),
('energy_meter', 'measurement', 'Medidor de energía', 'E', '{electricity, chilled_water, refrigeration, steam}', '{}', 'Gauge'),
('power_meter', 'measurement', 'Medidor de potencia', 'PM', '{electricity, solar_generation, battery_storage}', '{"type": "digital"}', 'Gauge'),
('pressure_sensor', 'measurement', 'Sensor de presión', 'PT', '{steam, condensate, compressed_air, chilled_water, hot_water, industrial_water, industrial_gas}', '{"range": null, "output": "4-20mA"}', 'Gauge'),
('temperature_sensor', 'measurement', 'Sensor de temperatura', 'TT', '{steam, condensate, chilled_water, hot_water, refrigeration, industrial_water}', '{"type": "RTD", "range": null}', 'Thermometer'),
('level_sensor', 'measurement', 'Sensor de nivel', 'LT', '{condensate, industrial_water, diesel, lpg, industrial_gas}', '{"technology": "radar"}', 'Gauge'),
('gas_meter', 'measurement', 'Medidor de gas', 'FQI', '{natural_gas, lpg, industrial_gas}', '{}', 'Gauge'),
('water_meter', 'measurement', 'Medidor de agua', 'FQI', '{industrial_water, potable_water, process_water, chilled_water, hot_water}', '{}', 'Gauge'),
('steam_meter', 'measurement', 'Medidor de vapor', 'FQI', '{steam}', '{}', 'Gauge');

-- IoT
insert into equipment_types (id, family, name, tag_prefix, compatible_utilities, default_properties, icon_name) values
('iot_device', 'iot', 'Dispositivo IoT', 'IOT', '{electricity, natural_gas, steam, compressed_air, chilled_water, hot_water, industrial_water, process_water, refrigeration}', '{"protocol": "mqtt"}', 'Wifi'),
('gateway', 'iot', 'Gateway', 'GW', '{electricity, natural_gas, steam, compressed_air, chilled_water, hot_water, industrial_water, process_water}', '{}', 'Router'),
('plc', 'iot', 'PLC', 'PLC', '{electricity, natural_gas, steam, compressed_air}', '{}', 'Cpu'),
('edge_device', 'iot', 'Edge Device', 'EDGE', '{electricity, natural_gas, steam, compressed_air, chilled_water}', '{}', 'Server');

-- Organizational
insert into equipment_types (id, family, name, tag_prefix, compatible_utilities, default_properties, icon_name) values
('area_node', 'organizational', 'Área', 'AR', '{electricity, natural_gas, steam, compressed_air, chilled_water, hot_water, industrial_water, potable_water, process_water, refrigeration, diesel, lpg, industrial_gas}', '{"floor_area": null}', 'Building2'),
('process_node', 'organizational', 'Proceso', 'PR', '{electricity, natural_gas, steam, compressed_air, chilled_water, hot_water, industrial_water, process_water}', '{}', 'Workflow'),
('production_line', 'organizational', 'Línea de producción', 'LN', '{electricity, steam, compressed_air, chilled_water, hot_water, industrial_water, process_water}', '{}', 'Conveyor');

-- Special
insert into equipment_types (id, family, name, tag_prefix, compatible_utilities, default_properties, icon_name) values
('utility_source', 'special', 'Fuente de utility', 'SRC', '{electricity, natural_gas, lpg, diesel, steam, compressed_air, chilled_water, hot_water, industrial_water, potable_water, process_water, refrigeration, industrial_gas}', '{}', 'Power'),
('loss_node', 'special', 'Nodo de pérdidas', 'LOSS', '{electricity, natural_gas, steam, compressed_air, chilled_water, hot_water, industrial_water, process_water, refrigeration}', '{"estimated_loss_percent": null}', 'TrendingDown'),
('annotation', 'special', 'Anotación', 'NOTE', '{electricity, natural_gas, steam, compressed_air, chilled_water, hot_water, industrial_water, potable_water, process_water, refrigeration, diesel, lpg, industrial_gas}', '{"text": ""}', 'StickyNote'),
('group', 'special', 'Grupo', 'GRP', '{electricity, natural_gas, steam, compressed_air, chilled_water, hot_water, industrial_water, potable_water, process_water, refrigeration, diesel, lpg, industrial_gas}', '{}', 'Group');
