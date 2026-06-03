-- seed.sql
-- VersaEnergy — Dataset Demo Completo
-- Planta Demostracion con 4 utilities, data realista y lecturas hasta junio 2026
--
-- Credencial demo alineada con CMMS:
--   email    admin@demo.com
--   password AdminDemo123!

------------------------------------------------------------
-- Company + Site
------------------------------------------------------------
create extension if not exists pgcrypto;

insert into companies (id, name, slug) values
  ('c0000000-0000-0000-0000-000000000001', 'Versa Demo', 'versa-demo')
on conflict (id) do nothing;

insert into sites (id, company_id, name, code, address) values
  ('40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'Planta Demostracion', 'PLT001', 'Av. Energia 123, Ciudad Industrial')
on conflict (id) do nothing;

do $$
declare
  v_admin_id uuid := '10000000-0000-0000-0000-000000000001';
  v_admin_email text := 'admin@demo.com';
  v_admin_password text := 'AdminDemo123!';
begin
  if not exists (select 1 from auth.users where email = v_admin_email) then
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token,
      is_sso_user, is_anonymous
    ) values (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      v_admin_email,
      crypt(v_admin_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Admin Demo"}'::jsonb,
      false, '', '', '', '', '', '', '', '', false, false
    );
  else
    select id into v_admin_id from auth.users where email = v_admin_email;

    update auth.users
      set encrypted_password = crypt(v_admin_password, gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          updated_at = now()
      where id = v_admin_id;
  end if;

  if not exists (
    select 1 from auth.identities
    where user_id = v_admin_id and provider = 'email'
  ) then
    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data, created_at, updated_at
    ) values (
      gen_random_uuid(), v_admin_id, v_admin_email, 'email',
      jsonb_build_object('sub', v_admin_id::text, 'email', v_admin_email),
      now(), now()
    );
  end if;

  insert into profiles (auth_id, company_id, email, full_name, role)
  values (
    v_admin_id,
    'c0000000-0000-0000-0000-000000000001',
    v_admin_email,
    'Admin Demo',
    'admin'
  )
  on conflict (auth_id) do update
    set company_id = excluded.company_id,
        email = excluded.email,
        full_name = excluded.full_name,
        role = excluded.role,
        is_active = true,
        updated_at = now();
end $$;

------------------------------------------------------------
-- Areas
------------------------------------------------------------
insert into energy_areas (id, site_id, name, code, description) values
  ('a0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Sala de Calderas', 'UT-CAL', 'Calderas y sistema de vapor'),
  ('a0000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'Sala de Compresores', 'UT-COM', 'Compresores y aire comprimido'),
  ('a0000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'Sala Electrica', 'UT-ELEC', 'Transformador y tableros principales'),
  ('a0000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 'Chillers y HVAC', 'UT-HVAC', 'Agua helada y climatizacion'),
  ('a0000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', 'Produccion', 'PROD', 'Linea principal de produccion'),
  ('a0000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001', 'Empaque', 'EMP', 'Zona de empaque y paletizado'),
  ('a0000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000001', 'Administracion', 'ADM', 'Oficinas y servicios generales')
on conflict (id) do nothing;

------------------------------------------------------------
-- Utility Systems / Asset-tree system level
------------------------------------------------------------
insert into utility_systems (id, site_id, code, name, description, utility_type, area_id, properties) values
  ('90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'ELEC-MAIN', 'Sistema electrico principal', 'Transformador, tablero principal y distribucion electrica de planta.', 'electricity', 'a0000000-0000-0000-0000-000000000003', '{"cmms_asset_type":"system"}'),
  ('90000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'STM-MAIN', 'Sistema de vapor y condensado', 'Caldera, header de vapor, intercambiador y retorno de condensado.', 'steam', 'a0000000-0000-0000-0000-000000000001', '{"cmms_asset_type":"system"}'),
  ('90000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'AIR-MAIN', 'Sistema de aire comprimido', 'Compresor, tanque pulmon y distribucion hacia produccion.', 'compressed_air', 'a0000000-0000-0000-0000-000000000002', '{"cmms_asset_type":"system"}'),
  ('90000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 'CHW-MAIN', 'Sistema de agua helada', 'Chiller, bomba primaria, torre y consumidores HVAC.', 'chilled_water', 'a0000000-0000-0000-0000-000000000004', '{"cmms_asset_type":"system"}'),
  ('90000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', 'NG-MAIN', 'Sistema de gas natural', 'Alimentacion de gas natural para caldera y servicios termicos.', 'natural_gas', 'a0000000-0000-0000-0000-000000000001', '{"cmms_asset_type":"system"}'),
  ('90000000-0000-0000-0000-000000000101', '40000000-0000-0000-0000-000000000001', 'MED-ELEC', 'Medicion electrica', 'Medidores electricos fisicos mantenibles y sus rutinas de captura.', 'electricity', 'a0000000-0000-0000-0000-000000000003', '{"cmms_asset_type":"system","asset_role":"measurement_subsystem"}'),
  ('90000000-0000-0000-0000-000000000102', '40000000-0000-0000-0000-000000000001', 'MED-STM', 'Medicion vapor', 'Instrumentos de medicion de vapor y condiciones de operacion.', 'steam', 'a0000000-0000-0000-0000-000000000001', '{"cmms_asset_type":"system","asset_role":"measurement_subsystem"}'),
  ('90000000-0000-0000-0000-000000000103', '40000000-0000-0000-0000-000000000001', 'MED-AIR', 'Medicion aire comprimido', 'Medidores e indicadores del sistema de aire comprimido.', 'compressed_air', 'a0000000-0000-0000-0000-000000000002', '{"cmms_asset_type":"system","asset_role":"measurement_subsystem"}'),
  ('90000000-0000-0000-0000-000000000104', '40000000-0000-0000-0000-000000000001', 'MED-CHW', 'Medicion agua helada', 'Medidores termicos y de flujo para circuito de agua helada.', 'chilled_water', 'a0000000-0000-0000-0000-000000000004', '{"cmms_asset_type":"system","asset_role":"measurement_subsystem"}'),
  ('90000000-0000-0000-0000-000000000105', '40000000-0000-0000-0000-000000000001', 'MED-NG', 'Medicion gas natural', 'Medidores de gas natural asociados a caldera y servicios termicos.', 'natural_gas', 'a0000000-0000-0000-0000-000000000001', '{"cmms_asset_type":"system","asset_role":"measurement_subsystem"}')
on conflict (id) do nothing;

------------------------------------------------------------
-- Equipment
------------------------------------------------------------
insert into energy_equipment (id, site_id, tag, name, equipment_type, utility_type, area_id, utility_system_id, properties) values
  -- Electricos
  ('e0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'T-01', 'Transformador Principal 500 kVA', 'transformer', 'electricity', 'a0000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000001', '{"capacity_kva":500,"voltage_primary":"13.2kV","voltage_secondary":"480V"}'),
  ('e0000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'P-01', 'Tablero Principal 480V', 'panel', 'electricity', 'a0000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000001', '{"voltage_level":"480V","phase":"three"}'),
  ('e0000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'P-02', 'Tablero Produccion', 'panel', 'electricity', 'a0000000-0000-0000-0000-000000000005', '90000000-0000-0000-0000-000000000001', '{"voltage_level":"480V","phase":"three"}'),
  ('e0000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 'P-03', 'Tablero HVAC', 'panel', 'electricity', 'a0000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000001', '{"voltage_level":"480V","phase":"three"}'),
  ('e0000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', 'M-01', 'Motor Compresor Principal 75 kW', 'motor', 'electricity', 'a0000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000003', '{"power_kw":75,"rpm":1750}'),
  ('e0000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001', 'M-02', 'Motor Bomba Agua Helada 30 kW', 'motor', 'electricity', 'a0000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000004', '{"power_kw":30,"rpm":3500}'),
  -- Vapor
  ('e0000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000001', 'B-01', 'Caldera 200 BHP', 'boiler', 'steam', 'a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002', '{"nominal_capacity":200,"pressure_rating":"150 psi"}'),
  ('e0000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000001', 'TK-01', 'Tanque de Condensado 5000 L', 'tank', 'condensate', 'a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002', '{"volume":5000}'),
  ('e0000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000001', 'HX-01', 'Intercambiador Vapor-Agua', 'heat_exchanger', 'steam', 'a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002', '{"capacity":"500 kW"}'),
  -- Aire comprimido
  ('e0000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000001', 'C-01', 'Compresor de Tornillo 75 kW', 'compressor', 'compressed_air', 'a0000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000003', '{"nominal_capacity":75,"pressure_rating":"8 bar"}'),
  ('e0000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000001', 'TK-02', 'Tanque Pulmon 3000 L', 'tank', 'compressed_air', 'a0000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000003', '{"volume":3000}'),
  -- Agua helada
  ('e0000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000001', 'CH-01', 'Chiller 150 TR', 'chiller', 'chilled_water', 'a0000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000004', '{"capacity_tr":150,"eer":5.2}'),
  ('e0000000-0000-0000-0000-000000000013', '40000000-0000-0000-0000-000000000001', 'PU-01', 'Bomba Primaria Chiller', 'pump', 'chilled_water', 'a0000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000004', '{"nominal_capacity":15,"head":"30 m"}'),
  ('e0000000-0000-0000-0000-000000000014', '40000000-0000-0000-0000-000000000001', 'CT-01', 'Torre Enfriamiento 200 TR', 'cooling_tower', 'chilled_water', 'a0000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000004', '{"capacity_tr":200}'),
  -- Medidores fisicos mantenibles
  ('e0000000-0000-0000-0000-000000000101', '40000000-0000-0000-0000-000000000001', 'EM-001', 'Medidor Energia Principal', 'meter', 'electricity', 'a0000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000101', '{"asset_role":"measurement_device","meter_class":"revenue_grade","measured_equipment_id":"e0000000-0000-0000-0000-000000000001","measurement_point_tag":"EM-001","data_capture":"manual_monthly","serial_number":"EL-2026-0001","manufacturer":"Schneider","model":"ION9000","last_calibration_date":"2026-01-15","calibration_due_date":"2027-01-15"}'),
  ('e0000000-0000-0000-0000-000000000102', '40000000-0000-0000-0000-000000000001', 'PM-001', 'Power Meter Produccion', 'meter', 'electricity', 'a0000000-0000-0000-0000-000000000005', '90000000-0000-0000-0000-000000000101', '{"asset_role":"measurement_device","meter_class":"submeter","measured_equipment_id":"e0000000-0000-0000-0000-000000000003","measurement_point_tag":"PM-001","data_capture":"manual_monthly","serial_number":"EL-2026-0101","manufacturer":"Schneider","model":"PM5560","last_calibration_date":"2026-01-15","calibration_due_date":"2027-01-15"}'),
  ('e0000000-0000-0000-0000-000000000103', '40000000-0000-0000-0000-000000000001', 'PM-002', 'Power Meter HVAC', 'meter', 'electricity', 'a0000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000101', '{"asset_role":"measurement_device","meter_class":"submeter","measured_equipment_id":"e0000000-0000-0000-0000-000000000004","measurement_point_tag":"PM-002","data_capture":"manual_monthly","serial_number":"EL-2026-0102","manufacturer":"Schneider","model":"PM5560","last_calibration_date":"2026-01-15","calibration_due_date":"2027-01-15"}'),
  ('e0000000-0000-0000-0000-000000000104', '40000000-0000-0000-0000-000000000001', 'EM-002', 'Energia Compresor', 'meter', 'electricity', 'a0000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000101', '{"asset_role":"measurement_device","meter_class":"submeter","measured_equipment_id":"e0000000-0000-0000-0000-000000000005","measurement_point_tag":"EM-002","data_capture":"manual_monthly","serial_number":"EL-2026-0103","manufacturer":"Circutor","model":"CVM-C10","last_calibration_date":"2026-01-15","calibration_due_date":"2027-01-15"}'),
  ('e0000000-0000-0000-0000-000000000105', '40000000-0000-0000-0000-000000000001', 'FQI-101', 'Medidor Vapor Principal', 'meter', 'steam', 'a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000102', '{"asset_role":"measurement_device","meter_class":"flow_totalizer","measured_equipment_id":"e0000000-0000-0000-0000-000000000007","measurement_point_tag":"FQI-101","data_capture":"manual_monthly","serial_number":"STM-2026-0101","manufacturer":"Yokogawa","model":"VY-Vortex","last_calibration_date":"2026-02-10","calibration_due_date":"2027-02-10"}'),
  ('e0000000-0000-0000-0000-000000000106', '40000000-0000-0000-0000-000000000001', 'PT-101', 'Transmisor Presion Vapor', 'meter', 'steam', 'a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000102', '{"asset_role":"measurement_device","meter_class":"pressure_transmitter","measured_equipment_id":"e0000000-0000-0000-0000-000000000007","measurement_point_tag":"PT-101","data_capture":"manual_daily","serial_number":"STM-2026-0201","manufacturer":"Rosemount","model":"3051","last_calibration_date":"2026-02-10","calibration_due_date":"2027-02-10"}'),
  ('e0000000-0000-0000-0000-000000000107', '40000000-0000-0000-0000-000000000001', 'TT-101', 'Transmisor Temperatura Vapor', 'meter', 'steam', 'a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000102', '{"asset_role":"measurement_device","meter_class":"temperature_transmitter","measured_equipment_id":"e0000000-0000-0000-0000-000000000007","measurement_point_tag":"TT-101","data_capture":"manual_daily","serial_number":"STM-2026-0301","manufacturer":"Endress+Hauser","model":"iTEMP","last_calibration_date":"2026-02-10","calibration_due_date":"2027-02-10"}'),
  ('e0000000-0000-0000-0000-000000000108', '40000000-0000-0000-0000-000000000001', 'FQI-201', 'Flujometro Aire Comprimido', 'meter', 'compressed_air', 'a0000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000103', '{"asset_role":"measurement_device","meter_class":"flow_totalizer","measured_equipment_id":"e0000000-0000-0000-0000-000000000010","measurement_point_tag":"FQI-201","data_capture":"manual_monthly","serial_number":"AIR-2026-0101","manufacturer":"VPInstruments","model":"VPFlowScope","last_calibration_date":"2026-03-05","calibration_due_date":"2027-03-05"}'),
  ('e0000000-0000-0000-0000-000000000109', '40000000-0000-0000-0000-000000000001', 'PT-201', 'Transmisor Presion Aire', 'meter', 'compressed_air', 'a0000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000103', '{"asset_role":"measurement_device","meter_class":"pressure_transmitter","measured_equipment_id":"e0000000-0000-0000-0000-000000000011","measurement_point_tag":"PT-201","data_capture":"manual_daily","serial_number":"AIR-2026-0201","manufacturer":"WIKA","model":"A-10","last_calibration_date":"2026-03-05","calibration_due_date":"2027-03-05"}'),
  ('e0000000-0000-0000-0000-000000000110', '40000000-0000-0000-0000-000000000001', 'EM-301', 'Medidor Energia Termica Chiller', 'meter', 'chilled_water', 'a0000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000104', '{"asset_role":"measurement_device","meter_class":"thermal_energy_meter","measured_equipment_id":"e0000000-0000-0000-0000-000000000012","measurement_point_tag":"EM-301","data_capture":"manual_monthly","serial_number":"CHW-2026-0101","manufacturer":"Kamstrup","model":"MULTICAL","last_calibration_date":"2026-04-10","calibration_due_date":"2027-04-10"}'),
  ('e0000000-0000-0000-0000-000000000111', '40000000-0000-0000-0000-000000000001', 'FT-301', 'Flujometro Agua Helada', 'meter', 'chilled_water', 'a0000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000104', '{"asset_role":"measurement_device","meter_class":"flow_meter","measured_equipment_id":"e0000000-0000-0000-0000-000000000012","measurement_point_tag":"FT-301","data_capture":"manual_daily","serial_number":"CHW-2026-0201","manufacturer":"Siemens","model":"MAG 5100W","last_calibration_date":"2026-04-10","calibration_due_date":"2027-04-10"}'),
  ('e0000000-0000-0000-0000-000000000112', '40000000-0000-0000-0000-000000000001', 'FQI-401', 'Medidor Gas Caldera', 'meter', 'natural_gas', 'a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000105', '{"asset_role":"measurement_device","meter_class":"gas_totalizer","measured_equipment_id":"e0000000-0000-0000-0000-000000000007","measurement_point_tag":"FQI-401","data_capture":"manual_monthly","serial_number":"NG-2026-0101","manufacturer":"Elster","model":"RABO","last_calibration_date":"2026-02-10","calibration_due_date":"2027-02-10"}'),
  ('e0000000-0000-0000-0000-000000000113', '40000000-0000-0000-0000-000000000001', 'VM-001', 'Medidor Virtual kWh/Nm3 Aire', 'meter', 'compressed_air', 'a0000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000103', '{"asset_role":"virtual_measurement","meter_class":"calculated","measured_equipment_id":"e0000000-0000-0000-0000-000000000010","measurement_point_tag":"VM-001","data_capture":"calculated_monthly","formula":"EM_002 / FQI_201"}')
on conflict (id) do nothing;

------------------------------------------------------------
-- Measurement Points linked to physical or virtual meter equipment
------------------------------------------------------------
insert into measurement_points (id, site_id, tag, name, target_type, target_id, utility, measurement_type, quantity, unit, source_type, source_config, accumulator_config, last_calibration_date, calibration_due_date, meter_equipment_id, properties) values
  -- Electricidad
  ('11000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'EM-001', 'Medidor Energia Principal', 'equipment', 'e0000000-0000-0000-0000-000000000001', 'electricity', 'accumulator', 'energy', 'kWh', 'manual', '{"frequency":"monthly","captureMethod":"manual_routine"}', '{"multiplier":1,"offset":0,"allowNegativeDelta":false,"resetDetection":true}', '2026-01-15', '2027-01-15', 'e0000000-0000-0000-0000-000000000101', '{"cmms_asset_role":"measurement_device","measured_equipment_tag":"T-01","meter_equipment_tag":"EM-001"}'),
  ('11000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'PM-001', 'Power Meter Produccion', 'equipment', 'e0000000-0000-0000-0000-000000000003', 'electricity', 'accumulator', 'energy', 'kWh', 'manual', '{"frequency":"monthly","captureMethod":"manual_routine"}', '{"multiplier":1,"offset":0,"allowNegativeDelta":false,"resetDetection":true}', '2026-01-15', '2027-01-15', 'e0000000-0000-0000-0000-000000000102', '{"cmms_asset_role":"measurement_device","measured_equipment_tag":"P-02","meter_equipment_tag":"PM-001"}'),
  ('11000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'PM-002', 'Power Meter HVAC', 'equipment', 'e0000000-0000-0000-0000-000000000004', 'electricity', 'accumulator', 'energy', 'kWh', 'manual', '{"frequency":"monthly","captureMethod":"manual_routine"}', '{"multiplier":1,"offset":0,"allowNegativeDelta":false,"resetDetection":true}', '2026-01-15', '2027-01-15', 'e0000000-0000-0000-0000-000000000103', '{"cmms_asset_role":"measurement_device","measured_equipment_tag":"P-03","meter_equipment_tag":"PM-002"}'),
  ('11000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 'EM-002', 'Energia Compresor', 'equipment', 'e0000000-0000-0000-0000-000000000005', 'electricity', 'accumulator', 'energy', 'kWh', 'manual', '{"frequency":"monthly","captureMethod":"manual_routine"}', '{"multiplier":1,"offset":0,"allowNegativeDelta":false,"resetDetection":true}', '2026-01-15', '2027-01-15', 'e0000000-0000-0000-0000-000000000104', '{"cmms_asset_role":"measurement_device","measured_equipment_tag":"M-01","meter_equipment_tag":"EM-002"}'),
  -- Vapor
  ('11000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', 'FQI-101', 'Medidor Vapor Principal', 'equipment', 'e0000000-0000-0000-0000-000000000007', 'steam', 'accumulator', 'mass', 'kg', 'manual', '{"frequency":"monthly","captureMethod":"manual_routine"}', '{"multiplier":1,"offset":0,"allowNegativeDelta":false,"resetDetection":true}', '2026-02-10', '2027-02-10', 'e0000000-0000-0000-0000-000000000105', '{"cmms_asset_role":"measurement_device","measured_equipment_tag":"B-01","meter_equipment_tag":"FQI-101"}'),
  ('11000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001', 'PT-101', 'Presion Vapor Header', 'equipment', 'e0000000-0000-0000-0000-000000000007', 'steam', 'instantaneous', 'pressure', 'bar', 'manual', '{"frequency":"daily","captureMethod":"manual_routine"}', '{"multiplier":1,"offset":0,"allowNegativeDelta":false,"resetDetection":false}', '2026-02-10', '2027-02-10', 'e0000000-0000-0000-0000-000000000106', '{"cmms_asset_role":"measurement_device","measured_equipment_tag":"B-01","meter_equipment_tag":"PT-101"}'),
  ('11000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000001', 'TT-101', 'Temperatura Vapor', 'equipment', 'e0000000-0000-0000-0000-000000000007', 'steam', 'instantaneous', 'temperature', 'C', 'manual', '{"frequency":"daily","captureMethod":"manual_routine"}', '{"multiplier":1,"offset":0,"allowNegativeDelta":false,"resetDetection":false}', '2026-02-10', '2027-02-10', 'e0000000-0000-0000-0000-000000000107', '{"cmms_asset_role":"measurement_device","measured_equipment_tag":"B-01","meter_equipment_tag":"TT-101"}'),
  -- Aire comprimido
  ('11000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000001', 'FQI-201', 'Flujo Aire Comprimido', 'equipment', 'e0000000-0000-0000-0000-000000000010', 'compressed_air', 'accumulator', 'volume', 'Nm3', 'manual', '{"frequency":"monthly","captureMethod":"manual_routine"}', '{"multiplier":1,"offset":0,"allowNegativeDelta":false,"resetDetection":true}', '2026-03-05', '2027-03-05', 'e0000000-0000-0000-0000-000000000108', '{"cmms_asset_role":"measurement_device","measured_equipment_tag":"C-01","meter_equipment_tag":"FQI-201"}'),
  ('11000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000001', 'PT-201', 'Presion Aire Header', 'equipment', 'e0000000-0000-0000-0000-000000000011', 'compressed_air', 'instantaneous', 'pressure', 'bar', 'manual', '{"frequency":"daily","captureMethod":"manual_routine"}', '{"multiplier":1,"offset":0,"allowNegativeDelta":false,"resetDetection":false}', '2026-03-05', '2027-03-05', 'e0000000-0000-0000-0000-000000000109', '{"cmms_asset_role":"measurement_device","measured_equipment_tag":"TK-02","meter_equipment_tag":"PT-201"}'),
  -- Agua helada
  ('11000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000001', 'EM-301', 'Energia Termica Chiller', 'equipment', 'e0000000-0000-0000-0000-000000000012', 'chilled_water', 'accumulator', 'energy', 'TR-h', 'manual', '{"frequency":"monthly","captureMethod":"manual_routine"}', '{"multiplier":1,"offset":0,"allowNegativeDelta":false,"resetDetection":true}', '2026-04-10', '2027-04-10', 'e0000000-0000-0000-0000-000000000110', '{"cmms_asset_role":"measurement_device","measured_equipment_tag":"CH-01","meter_equipment_tag":"EM-301"}'),
  ('11000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000001', 'FT-301', 'Flujo Agua Helada', 'equipment', 'e0000000-0000-0000-0000-000000000012', 'chilled_water', 'instantaneous', 'flow', 'GPM', 'manual', '{"frequency":"daily","captureMethod":"manual_routine"}', '{"multiplier":1,"offset":0,"allowNegativeDelta":false,"resetDetection":false}', '2026-04-10', '2027-04-10', 'e0000000-0000-0000-0000-000000000111', '{"cmms_asset_role":"measurement_device","measured_equipment_tag":"CH-01","meter_equipment_tag":"FT-301"}'),
  -- Gas natural
  ('11000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000001', 'FQI-401', 'Consumo Gas Caldera', 'equipment', 'e0000000-0000-0000-0000-000000000007', 'natural_gas', 'accumulator', 'volume', 'Nm3', 'manual', '{"frequency":"monthly","captureMethod":"manual_routine"}', '{"multiplier":1,"offset":0,"allowNegativeDelta":false,"resetDetection":true}', '2026-02-10', '2027-02-10', 'e0000000-0000-0000-0000-000000000112', '{"cmms_asset_role":"measurement_device","measured_equipment_tag":"B-01","meter_equipment_tag":"FQI-401"}'),
  -- Medicion virtual
  ('11000000-0000-0000-0000-000000000013', '40000000-0000-0000-0000-000000000001', 'VM-001', 'kWh/Nm3 Aire Comprimido', 'equipment', 'e0000000-0000-0000-0000-000000000010', 'compressed_air', 'calculated', 'energy', 'kWh/Nm3', 'calculated', '{"formula":"EM_002 / FQI_201","inputs":["11000000-0000-0000-0000-000000000004","11000000-0000-0000-0000-000000000008"]}', '{"multiplier":1,"offset":0,"allowNegativeDelta":false,"resetDetection":false}', null, null, 'e0000000-0000-0000-0000-000000000113', '{"cmms_asset_role":"virtual_measurement","measured_equipment_tag":"C-01","meter_equipment_tag":"VM-001"}')
on conflict (id) do nothing;

------------------------------------------------------------
-- Diagrams
------------------------------------------------------------
insert into energy_diagrams (id, site_id, name, description, utility_type, status, canvas_state) values
  ('d0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Unifilar electrico principal', 'Diagrama base de transformador, tableros y cargas principales.', 'electricity', 'published', '{}'),
  ('d0000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'Red de vapor y condensado', 'Diagrama base de caldera, header de vapor y retorno de condensado.', 'steam', 'draft', '{}'),
  ('d0000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'Sistema de aire comprimido', 'Diagrama base de compresor, tanque pulmon y consumidores.', 'compressed_air', 'published', '{}'),
  ('d0000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 'Circuito de agua helada', 'Diagrama base de chiller, bomba y consumidores HVAC.', 'chilled_water', 'draft', '{}')
on conflict (id) do nothing;

insert into energy_diagram_nodes (id, diagram_id, node_type, tag, utility, label, position_x, position_y, properties) values
  -- Unifilar electrico principal
  ('12000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'utility_source', 'RED-13.2KV', 'electricity', 'Acometida 13.2 kV', 40, 160, '{"asset_binding":{"required":false,"status":"external_source","reason":"utility_supplier"}}'),
  ('12000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'area_node', 'UT-ELEC', 'electricity', 'Sala Electrica', 180, 30, '{"asset_binding":{"required":true,"entity_type":"area","entity_id":"a0000000-0000-0000-0000-000000000003","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'transformer', 'T-01', 'electricity', 'Transformador Principal 500 kVA', 220, 150, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000001","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'energy_meter', 'EM-001', 'electricity', 'Medidor Energia Principal', 340, 70, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000101","source":"asset_tree","status":"linked"},"measurement_binding":{"required":true,"measurement_point_id":"11000000-0000-0000-0000-000000000001","meter_equipment_id":"e0000000-0000-0000-0000-000000000101","status":"linked","role":"boundary","anchor":{"type":"edge","id":"13000000-0000-0000-0000-000000000002","position":0.65,"side":"line","offset":{"x":0,"y":-55}}}}'),
  ('12000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'panel', 'P-01', 'electricity', 'Tablero Principal 480V', 420, 150, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000002","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 'panel', 'P-02', 'electricity', 'Tablero Produccion', 620, 85, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000003","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 'power_meter', 'PM-001', 'electricity', 'Power Meter Produccion', 535, 45, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000102","source":"asset_tree","status":"linked"},"measurement_binding":{"required":true,"measurement_point_id":"11000000-0000-0000-0000-000000000002","meter_equipment_id":"e0000000-0000-0000-0000-000000000102","status":"linked","anchor":{"type":"edge","id":"13000000-0000-0000-0000-000000000003","position":0.55,"side":"load","offset":{"x":0,"y":-55}}}}'),
  ('12000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000001', 'panel', 'P-03', 'electricity', 'Tablero HVAC', 620, 215, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000004","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000001', 'power_meter', 'PM-002', 'electricity', 'Power Meter HVAC', 535, 250, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000103","source":"asset_tree","status":"linked"},"measurement_binding":{"required":true,"measurement_point_id":"11000000-0000-0000-0000-000000000003","meter_equipment_id":"e0000000-0000-0000-0000-000000000103","status":"linked","anchor":{"type":"edge","id":"13000000-0000-0000-0000-000000000004","position":0.55,"side":"load","offset":{"x":0,"y":55}}}}'),
  ('12000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000001', 'motor', 'M-01', 'electricity', 'Motor Compresor Principal 75 kW', 970, 85, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000005","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000001', 'energy_meter', 'EM-002', 'electricity', 'Energia Compresor', 810, 45, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000104","source":"asset_tree","status":"linked"},"measurement_binding":{"required":true,"measurement_point_id":"11000000-0000-0000-0000-000000000004","meter_equipment_id":"e0000000-0000-0000-0000-000000000104","status":"linked","anchor":{"type":"edge","id":"13000000-0000-0000-0000-000000000005","position":0.55,"side":"load","offset":{"x":0,"y":-48}}}}'),

  -- Red de vapor y condensado
  ('12000000-0000-0000-0000-000000000101', 'd0000000-0000-0000-0000-000000000002', 'area_node', 'UT-CAL', 'steam', 'Sala de Calderas', 60, 30, '{"asset_binding":{"required":true,"entity_type":"area","entity_id":"a0000000-0000-0000-0000-000000000001","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000102', 'd0000000-0000-0000-0000-000000000002', 'boiler', 'B-01', 'steam', 'Caldera 200 BHP', 160, 160, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000007","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000103', 'd0000000-0000-0000-0000-000000000002', 'steam_meter', 'FQI-101', 'steam', 'Medidor Vapor Principal', 345, 95, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000105","source":"asset_tree","status":"linked"},"measurement_binding":{"required":true,"measurement_point_id":"11000000-0000-0000-0000-000000000005","meter_equipment_id":"e0000000-0000-0000-0000-000000000105","status":"linked","role":"boundary","anchor":{"type":"edge","id":"13000000-0000-0000-0000-000000000101","position":0.5,"side":"line","offset":{"x":0,"y":-55}}}}'),
  ('12000000-0000-0000-0000-000000000104', 'd0000000-0000-0000-0000-000000000002', 'pressure_sensor', 'PT-101', 'steam', 'Presion Vapor Header', 430, 225, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000106","source":"asset_tree","status":"linked"},"measurement_binding":{"required":true,"measurement_point_id":"11000000-0000-0000-0000-000000000006","meter_equipment_id":"e0000000-0000-0000-0000-000000000106","status":"linked","anchor":{"type":"node","id":"12000000-0000-0000-0000-000000000106","position":0.5,"side":"line","offset":{"x":-80,"y":65}}}}'),
  ('12000000-0000-0000-0000-000000000105', 'd0000000-0000-0000-0000-000000000002', 'temperature_sensor', 'TT-101', 'steam', 'Temperatura Vapor', 520, 255, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000107","source":"asset_tree","status":"linked"},"measurement_binding":{"required":true,"measurement_point_id":"11000000-0000-0000-0000-000000000007","meter_equipment_id":"e0000000-0000-0000-0000-000000000107","status":"linked","anchor":{"type":"node","id":"12000000-0000-0000-0000-000000000106","position":0.5,"side":"line","offset":{"x":0,"y":90}}}}'),
  ('12000000-0000-0000-0000-000000000106', 'd0000000-0000-0000-0000-000000000002', 'header', 'HDR-STM-01', 'steam', 'Header Vapor 8 bar', 520, 160, '{"asset_binding":{"required":false,"status":"optional_unbound","reason":"distribution_header_without_cmms_asset"}}'),
  ('12000000-0000-0000-0000-000000000107', 'd0000000-0000-0000-0000-000000000002', 'heat_exchanger', 'HX-01', 'steam', 'Intercambiador Vapor-Agua', 720, 160, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000009","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000108', 'd0000000-0000-0000-0000-000000000002', 'gas_meter', 'FQI-401', 'natural_gas', 'Consumo Gas Caldera', 160, 20, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000112","source":"asset_tree","status":"linked"},"measurement_binding":{"required":true,"measurement_point_id":"11000000-0000-0000-0000-000000000012","meter_equipment_id":"e0000000-0000-0000-0000-000000000112","status":"linked","anchor":{"type":"node","id":"12000000-0000-0000-0000-000000000102","position":0.5,"side":"source","offset":{"x":0,"y":-110}}}}'),

  -- Sistema de aire comprimido
  ('12000000-0000-0000-0000-000000000201', 'd0000000-0000-0000-0000-000000000003', 'area_node', 'UT-COM', 'compressed_air', 'Sala de Compresores', 50, 30, '{"asset_binding":{"required":true,"entity_type":"area","entity_id":"a0000000-0000-0000-0000-000000000002","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000202', 'd0000000-0000-0000-0000-000000000003', 'utility_source', 'AIR-GEN', 'compressed_air', 'Generacion aire 8 bar', 50, 160, '{"asset_binding":{"required":false,"status":"derived_source","reason":"source_defined_by_compressor"}}'),
  ('12000000-0000-0000-0000-000000000203', 'd0000000-0000-0000-0000-000000000003', 'compressor', 'C-01', 'compressed_air', 'Compresor de Tornillo 75 kW', 210, 160, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000010","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000204', 'd0000000-0000-0000-0000-000000000003', 'flow_meter', 'FQI-201', 'compressed_air', 'Flujo Aire Comprimido', 390, 90, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000108","source":"asset_tree","status":"linked"},"measurement_binding":{"required":true,"measurement_point_id":"11000000-0000-0000-0000-000000000008","meter_equipment_id":"e0000000-0000-0000-0000-000000000108","status":"linked","role":"boundary","anchor":{"type":"edge","id":"13000000-0000-0000-0000-000000000202","position":0.55,"side":"line","offset":{"x":0,"y":-58}}}}'),
  ('12000000-0000-0000-0000-000000000205', 'd0000000-0000-0000-0000-000000000003', 'tank', 'TK-02', 'compressed_air', 'Tanque Pulmon 3000 L', 400, 210, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000011","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000206', 'd0000000-0000-0000-0000-000000000003', 'pressure_sensor', 'PT-201', 'compressed_air', 'Presion Aire Header', 620, 230, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000109","source":"asset_tree","status":"linked"},"measurement_binding":{"required":true,"measurement_point_id":"11000000-0000-0000-0000-000000000009","meter_equipment_id":"e0000000-0000-0000-0000-000000000109","status":"linked","anchor":{"type":"node","id":"12000000-0000-0000-0000-000000000207","position":0.5,"side":"line","offset":{"x":-110,"y":70}}}}'),
  ('12000000-0000-0000-0000-000000000207', 'd0000000-0000-0000-0000-000000000003', 'header', 'HDR-AIR-01', 'compressed_air', 'Header Aire Planta', 730, 160, '{"asset_binding":{"required":false,"status":"optional_unbound","reason":"distribution_header_without_cmms_asset"}}'),
  ('12000000-0000-0000-0000-000000000208', 'd0000000-0000-0000-0000-000000000003', 'energy_meter', 'VM-001', 'compressed_air', 'kWh/Nm3 Aire Comprimido', 920, 85, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000113","source":"asset_tree","status":"linked"},"measurement_binding":{"required":true,"measurement_point_id":"11000000-0000-0000-0000-000000000013","meter_equipment_id":"e0000000-0000-0000-0000-000000000113","status":"linked","role":"virtual","anchor":{"type":"node","id":"12000000-0000-0000-0000-000000000203","position":0.5,"side":"line","offset":{"x":150,"y":-80}}}}'),

  -- Circuito de agua helada
  ('12000000-0000-0000-0000-000000000301', 'd0000000-0000-0000-0000-000000000004', 'area_node', 'UT-HVAC', 'chilled_water', 'Chillers y HVAC', 50, 30, '{"asset_binding":{"required":true,"entity_type":"area","entity_id":"a0000000-0000-0000-0000-000000000004","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000302', 'd0000000-0000-0000-0000-000000000004', 'utility_source', 'CHW-PLANT', 'chilled_water', 'Planta agua helada', 50, 160, '{"asset_binding":{"required":false,"status":"derived_source","reason":"source_defined_by_chiller"}}'),
  ('12000000-0000-0000-0000-000000000303', 'd0000000-0000-0000-0000-000000000004', 'chiller', 'CH-01', 'chilled_water', 'Chiller 150 TR', 220, 160, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000012","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000304', 'd0000000-0000-0000-0000-000000000004', 'pump', 'PU-01', 'chilled_water', 'Bomba Primaria Chiller', 420, 160, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000013","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000305', 'd0000000-0000-0000-0000-000000000004', 'energy_meter', 'EM-301', 'chilled_water', 'Energia Termica Chiller', 520, 85, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000110","source":"asset_tree","status":"linked"},"measurement_binding":{"required":true,"measurement_point_id":"11000000-0000-0000-0000-000000000010","meter_equipment_id":"e0000000-0000-0000-0000-000000000110","status":"linked","role":"boundary","anchor":{"type":"edge","id":"13000000-0000-0000-0000-000000000302","position":0.5,"side":"line","offset":{"x":0,"y":-55}}}}'),
  ('12000000-0000-0000-0000-000000000306', 'd0000000-0000-0000-0000-000000000004', 'flow_meter', 'FT-301', 'chilled_water', 'Flujo Agua Helada', 610, 230, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000111","source":"asset_tree","status":"linked"},"measurement_binding":{"required":true,"measurement_point_id":"11000000-0000-0000-0000-000000000011","meter_equipment_id":"e0000000-0000-0000-0000-000000000111","status":"linked","anchor":{"type":"edge","id":"13000000-0000-0000-0000-000000000303","position":0.35,"side":"line","offset":{"x":0,"y":65}}}}'),
  ('12000000-0000-0000-0000-000000000307', 'd0000000-0000-0000-0000-000000000004', 'cooling_tower', 'CT-01', 'chilled_water', 'Torre Enfriamiento 200 TR', 810, 160, '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000014","source":"asset_tree","status":"linked"}}')
on conflict (id) do nothing;

insert into energy_diagram_edges (id, diagram_id, source_node_id, target_node_id, edge_type, utility, tag, flow_direction, label, properties) values
  -- Electrico
  ('13000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000003', 'cable', 'electricity', 'E-13.2KV-T01', 'source_to_target', '13.2 kV', '{"asset_binding":{"required":false,"status":"optional_unbound","reason":"incoming_utility_line"}}'),
  ('13000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000005', 'busbar', 'electricity', 'E-T01-P01', 'source_to_target', '480 V', '{"nominal_voltage":"480V"}'),
  ('13000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000006', 'cable', 'electricity', 'E-P01-P02', 'source_to_target', 'Alimentador Produccion', '{"nominal_voltage":"480V"}'),
  ('13000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000008', 'cable', 'electricity', 'E-P01-P03', 'source_to_target', 'Alimentador HVAC', '{"nominal_voltage":"480V"}'),
  ('13000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000006', '12000000-0000-0000-0000-000000000010', 'cable', 'electricity', 'E-P02-M01', 'source_to_target', 'Compresor 75 kW', '{"nominal_voltage":"480V"}'),
  ('13000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000005', 'signal', 'electricity', 'S-EM001-P01', 'source_to_target', 'Lectura total energia', '{"measurement_point_id":"11000000-0000-0000-0000-000000000001"}'),
  ('13000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000007', '12000000-0000-0000-0000-000000000006', 'signal', 'electricity', 'S-PM001-P02', 'source_to_target', 'Lectura produccion', '{"measurement_point_id":"11000000-0000-0000-0000-000000000002"}'),
  ('13000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000009', '12000000-0000-0000-0000-000000000008', 'signal', 'electricity', 'S-PM002-P03', 'source_to_target', 'Lectura HVAC', '{"measurement_point_id":"11000000-0000-0000-0000-000000000003"}'),
  ('13000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000011', '12000000-0000-0000-0000-000000000010', 'signal', 'electricity', 'S-EM002-M01', 'source_to_target', 'Lectura compresor', '{"measurement_point_id":"11000000-0000-0000-0000-000000000004"}'),

  -- Vapor
  ('13000000-0000-0000-0000-000000000101', 'd0000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000102', '12000000-0000-0000-0000-000000000106', 'pipe', 'steam', 'STM-B01-HDR', 'source_to_target', 'Vapor principal', '{"pressure_bar":8}'),
  ('13000000-0000-0000-0000-000000000102', 'd0000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000106', '12000000-0000-0000-0000-000000000107', 'pipe', 'steam', 'STM-HDR-HX01', 'source_to_target', 'A proceso termico', '{"pressure_bar":8}'),
  ('13000000-0000-0000-0000-000000000103', 'd0000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000103', '12000000-0000-0000-0000-000000000106', 'signal', 'steam', 'S-FQI101-HDR', 'source_to_target', 'Totalizador vapor', '{"measurement_point_id":"11000000-0000-0000-0000-000000000005"}'),
  ('13000000-0000-0000-0000-000000000104', 'd0000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000104', '12000000-0000-0000-0000-000000000106', 'signal', 'steam', 'S-PT101-HDR', 'source_to_target', 'Presion header', '{"measurement_point_id":"11000000-0000-0000-0000-000000000006"}'),
  ('13000000-0000-0000-0000-000000000105', 'd0000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000105', '12000000-0000-0000-0000-000000000106', 'signal', 'steam', 'S-TT101-HDR', 'source_to_target', 'Temperatura vapor', '{"measurement_point_id":"11000000-0000-0000-0000-000000000007"}'),

  -- Aire comprimido
  ('13000000-0000-0000-0000-000000000201', 'd0000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000202', '12000000-0000-0000-0000-000000000203', 'pipe', 'compressed_air', 'AIR-SRC-C01', 'source_to_target', 'Aire generado', '{"pressure_bar":8}'),
  ('13000000-0000-0000-0000-000000000202', 'd0000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000203', '12000000-0000-0000-0000-000000000205', 'pipe', 'compressed_air', 'AIR-C01-TK02', 'source_to_target', 'Descarga compresor', '{"pressure_bar":8}'),
  ('13000000-0000-0000-0000-000000000203', 'd0000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000205', '12000000-0000-0000-0000-000000000207', 'pipe', 'compressed_air', 'AIR-TK02-HDR', 'source_to_target', 'Header planta', '{"pressure_bar":7}'),
  ('13000000-0000-0000-0000-000000000204', 'd0000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000204', '12000000-0000-0000-0000-000000000207', 'signal', 'compressed_air', 'S-FQI201-HDR', 'source_to_target', 'Nm3 acumulados', '{"measurement_point_id":"11000000-0000-0000-0000-000000000008"}'),
  ('13000000-0000-0000-0000-000000000205', 'd0000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000206', '12000000-0000-0000-0000-000000000207', 'signal', 'compressed_air', 'S-PT201-HDR', 'source_to_target', 'Presion header', '{"measurement_point_id":"11000000-0000-0000-0000-000000000009"}'),
  ('13000000-0000-0000-0000-000000000206', 'd0000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000208', '12000000-0000-0000-0000-000000000203', 'signal', 'compressed_air', 'S-VM001-C01', 'source_to_target', 'Indicador especifico', '{"measurement_point_id":"11000000-0000-0000-0000-000000000013"}'),

  -- Agua helada
  ('13000000-0000-0000-0000-000000000301', 'd0000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000302', '12000000-0000-0000-0000-000000000303', 'pipe', 'chilled_water', 'CHW-SRC-CH01', 'source_to_target', 'Generacion frio', '{"supply_temp_c":7}'),
  ('13000000-0000-0000-0000-000000000302', 'd0000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000303', '12000000-0000-0000-0000-000000000304', 'pipe', 'chilled_water', 'CHW-CH01-PU01', 'source_to_target', 'Suministro primario', '{"supply_temp_c":7}'),
  ('13000000-0000-0000-0000-000000000303', 'd0000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000304', '12000000-0000-0000-0000-000000000307', 'pipe', 'chilled_water', 'CHW-PU01-CT01', 'source_to_target', 'Circuito HVAC', '{"return_temp_c":12}'),
  ('13000000-0000-0000-0000-000000000304', 'd0000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000305', '12000000-0000-0000-0000-000000000303', 'signal', 'chilled_water', 'S-EM301-CH01', 'source_to_target', 'Energia termica', '{"measurement_point_id":"11000000-0000-0000-0000-000000000010"}'),
  ('13000000-0000-0000-0000-000000000305', 'd0000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000306', '12000000-0000-0000-0000-000000000304', 'signal', 'chilled_water', 'S-FT301-PU01', 'source_to_target', 'Flujo agua helada', '{"measurement_point_id":"11000000-0000-0000-0000-000000000011"}')
on conflict (id) do nothing;

insert into energy_diagram_versions (id, diagram_id, version_number, status, label, is_published, snapshot, node_count, edge_count, published_at) values
  ('14000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 1, 'published', 'Seed publicado', true, '{}', 11, 9, now()),
  ('14000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 1, 'published', 'Seed publicado', true, '{}', 8, 6, now())
on conflict (diagram_id, version_number) do nothing;

------------------------------------------------------------
-- Readings (monthly data through current demo period, with seasonal patterns)
------------------------------------------------------------
-- Function to generate monthly readings
do $$
declare
  m integer;
  base_kwh numeric;
  base_steam numeric;
  base_air numeric;
  base_chw numeric;
  r_ts timestamptz;
  seasonal numeric;
  period_start date;
  period_month integer;
begin
  for m in 1..18 loop
    period_start := (date '2025-01-01' + ((m - 1) || ' months')::interval)::date;
    period_month := extract(month from period_start)::integer;
    seasonal := 1.0 + 0.15 * sin((period_month - 6) * pi() / 6); -- Summer peak
    r_ts := (period_start::text || ' 08:00:00')::timestamptz;

    -- EM-001: total electricity 85,000 - 110,000 kWh/month
    base_kwh := (85000 + random() * 25000) * seasonal;
    insert into energy_readings_raw (measurement_point_id, timestamp, value, unit, source)
    values ('11000000-0000-0000-0000-000000000001', r_ts, 5000000 + m * 100000 + base_kwh * m, 'kWh', 'manual')
    on conflict (measurement_point_id, timestamp) do nothing;

    -- PM-001: production electricity ~55% of total
    insert into energy_readings_raw (measurement_point_id, timestamp, value, unit, source)
    values ('11000000-0000-0000-0000-000000000002', r_ts, 2800000 + m * 55000 + base_kwh * 0.55 * m, 'kWh', 'manual')
    on conflict (measurement_point_id, timestamp) do nothing;

    -- PM-002: HVAC electricity ~25% of total (higher in summer)
    insert into energy_readings_raw (measurement_point_id, timestamp, value, unit, source)
    values ('11000000-0000-0000-0000-000000000003', r_ts, 1200000 + m * 25000 + base_kwh * 0.25 * m, 'kWh', 'manual')
    on conflict (measurement_point_id, timestamp) do nothing;

    -- EM-002: compressor energy ~15% of total
    insert into energy_readings_raw (measurement_point_id, timestamp, value, unit, source)
    values ('11000000-0000-0000-0000-000000000004', r_ts, 700000 + m * 13000 + base_kwh * 0.14 * m, 'kWh', 'manual')
    on conflict (measurement_point_id, timestamp) do nothing;

    -- FQI-101: steam 180,000-250,000 kg/month
    base_steam := (180000 + random() * 70000) * seasonal;
    insert into energy_readings_raw (measurement_point_id, timestamp, value, unit, source)
    values ('11000000-0000-0000-0000-000000000005', r_ts, 10000000 + m * 220000 + base_steam * m, 'kg', 'manual')
    on conflict (measurement_point_id, timestamp) do nothing;

    -- PT-101: steam pressure
    insert into energy_readings_raw (measurement_point_id, timestamp, value, unit, source)
    values ('11000000-0000-0000-0000-000000000006', r_ts, 7.5 + random() * 1.5, 'bar', 'manual')
    on conflict (measurement_point_id, timestamp) do nothing;

    -- TT-101: steam temperature
    insert into energy_readings_raw (measurement_point_id, timestamp, value, unit, source)
    values ('11000000-0000-0000-0000-000000000007', r_ts, 165 + random() * 15, 'C', 'manual')
    on conflict (measurement_point_id, timestamp) do nothing;

    -- FQI-201: compressed air 250,000-350,000 Nm3
    base_air := (250000 + random() * 100000) * seasonal;
    insert into energy_readings_raw (measurement_point_id, timestamp, value, unit, source)
    values ('11000000-0000-0000-0000-000000000008', r_ts, 15000000 + m * 300000 + base_air * m, 'Nm3', 'manual')
    on conflict (measurement_point_id, timestamp) do nothing;

    -- PT-201: air pressure
    insert into energy_readings_raw (measurement_point_id, timestamp, value, unit, source)
    values ('11000000-0000-0000-0000-000000000009', r_ts, 6.8 + random() * 1.0, 'bar', 'manual')
    on conflict (measurement_point_id, timestamp) do nothing;

    -- EM-301: chiller thermal energy
    base_chw := (15000 + random() * 8000) * seasonal * 1.3;
    insert into energy_readings_raw (measurement_point_id, timestamp, value, unit, source)
    values ('11000000-0000-0000-0000-000000000010', r_ts, 800000 + m * 20000 + base_chw * m, 'TR-h', 'manual')
    on conflict (measurement_point_id, timestamp) do nothing;

    -- FT-301: chiller water flow
    insert into energy_readings_raw (measurement_point_id, timestamp, value, unit, source)
    values ('11000000-0000-0000-0000-000000000011', r_ts, 380 + random() * 50, 'GPM', 'manual')
    on conflict (measurement_point_id, timestamp) do nothing;

    -- FQI-401: gas consumption (correlated with steam)
    insert into energy_readings_raw (measurement_point_id, timestamp, value, unit, source)
    values ('11000000-0000-0000-0000-000000000012', r_ts, 5000000 + m * 17000 + base_steam * 0.085 * m, 'Nm3', 'manual')
    on conflict (measurement_point_id, timestamp) do nothing;
  end loop;
end $$;

------------------------------------------------------------
-- Balances (2 examples)
------------------------------------------------------------
insert into energy_balances (id, site_id, utility, period_start, period_end, total_input, measured_consumption, unaccounted_for, unaccounted_for_percent, measurement_coverage, status, node_results) values
  ('b0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'electricity', '2025-01-01', '2025-01-31', 95800, 83700, 12100, 12.6, 87.4, 'draft',
   '[{"nodeId":"11000000-0000-0000-0000-000000000001","tag":"EM-001","consumption":95800,"coverage":"measured"},{"nodeId":"11000000-0000-0000-0000-000000000002","tag":"PM-001","consumption":52700,"coverage":"measured"},{"nodeId":"11000000-0000-0000-0000-000000000003","tag":"PM-002","consumption":23900,"coverage":"measured"},{"nodeId":"11000000-0000-0000-0000-000000000004","tag":"EM-002","consumption":13100,"coverage":"measured"}]'),
  ('b0000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'steam', '2025-01-01', '2025-01-31', 220000, 196000, 24000, 10.9, 89.1, 'draft',
   '[{"nodeId":"11000000-0000-0000-0000-000000000005","tag":"FQI-101","consumption":220000,"coverage":"measured"}]'),
  ('b0000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'electricity', '2026-06-01', '2026-06-30', 108500, 97300, 11200, 10.3, 89.7, 'draft',
   '[{"nodeId":"11000000-0000-0000-0000-000000000001","tag":"EM-001","consumption":108500,"coverage":"measured"},{"nodeId":"11000000-0000-0000-0000-000000000002","tag":"PM-001","consumption":59600,"coverage":"measured"},{"nodeId":"11000000-0000-0000-0000-000000000003","tag":"PM-002","consumption":27300,"coverage":"measured"},{"nodeId":"11000000-0000-0000-0000-000000000004","tag":"EM-002","consumption":15100,"coverage":"measured"}]'),
  ('b0000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 'steam', '2026-06-01', '2026-06-30', 238000, 211000, 27000, 11.3, 88.7, 'draft',
   '[{"nodeId":"11000000-0000-0000-0000-000000000005","tag":"FQI-101","consumption":238000,"coverage":"measured"}]'),
  ('b0000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', 'compressed_air', '2026-06-01', '2026-06-30', 338000, 291000, 47000, 13.9, 86.1, 'draft',
   '[{"nodeId":"11000000-0000-0000-0000-000000000008","tag":"FQI-201","consumption":338000,"coverage":"measured"}]'),
  ('b0000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001', 'chilled_water', '2026-06-01', '2026-06-30', 24500, 22600, 1900, 7.8, 92.2, 'draft',
   '[{"nodeId":"11000000-0000-0000-0000-000000000010","tag":"EM-301","consumption":24500,"coverage":"measured"}]')
on conflict (id) do nothing;

------------------------------------------------------------
-- EnPIs + Baselines + Targets + Results
------------------------------------------------------------
insert into energy_enpis (id, site_id, name, utility, formula, unit, scope, frequency) values
  ('22000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'kWh por tonelada producida', 'electricity', '{"numerator":"EM-001","denominator":"ton_prod"}', 'kWh/ton', 'site', 'monthly'),
  ('22000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'Nm3 aire / unidad producida', 'compressed_air', '{"numerator":"FQI-201","denominator":"units"}', 'Nm3/unidad', 'site', 'monthly'),
  ('22000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'kg vapor / tonelada', 'steam', '{"numerator":"FQI-101","denominator":"ton_prod"}', 'kg/ton', 'site', 'monthly'),
  ('22000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 'TR-h / m2 climatizado', 'chilled_water', '{"numerator":"EM-301","denominator":"m2"}', 'TR-h/m2', 'area', 'monthly')
on conflict (id) do nothing;

insert into energy_baselines (enpi_id, version, method, value, unit, reference_period_start, reference_period_end) values
  ('22000000-0000-0000-0000-000000000001', 1, 'average', 125.5, 'kWh/ton', '2024-01-01', '2024-06-30'),
  ('22000000-0000-0000-0000-000000000002', 1, 'average', 42.3, 'Nm3/unidad', '2024-01-01', '2024-06-30'),
  ('22000000-0000-0000-0000-000000000003', 1, 'average', 2850, 'kg/ton', '2024-01-01', '2024-06-30'),
  ('22000000-0000-0000-0000-000000000004', 1, 'average', 8.2, 'TR-h/m2', '2024-01-01', '2024-06-30');

insert into energy_targets (enpi_id, name, target_type, target_value, unit, deadline) values
  ('22000000-0000-0000-0000-000000000001', 'Reduccion 8% kWh/ton', 'absolute_value', 115, 'kWh/ton', '2025-12-31'),
  ('22000000-0000-0000-0000-000000000002', 'Reduccion fuga aire', 'absolute_value', 38, 'Nm3/unidad', '2025-12-31'),
  ('22000000-0000-0000-0000-000000000003', 'Optimizacion vapor', 'absolute_value', 2650, 'kg/ton', '2025-12-31');

-- Performance results (last 6 months)
insert into energy_performance_results (enpi_id, period_start, period_end, actual_value, baseline_value, target_value, deviation_percent) values
  ('22000000-0000-0000-0000-000000000001', '2025-07-01', '2025-07-31', 130.2, 125.5, 115, 3.7),
  ('22000000-0000-0000-0000-000000000001', '2025-08-01', '2025-08-31', 128.1, 125.5, 115, 2.1),
  ('22000000-0000-0000-0000-000000000001', '2025-09-01', '2025-09-30', 126.8, 125.5, 115, 1.0),
  ('22000000-0000-0000-0000-000000000001', '2025-10-01', '2025-10-31', 122.3, 125.5, 115, -2.5),
  ('22000000-0000-0000-0000-000000000001', '2025-11-01', '2025-11-30', 119.5, 125.5, 115, -4.8),
  ('22000000-0000-0000-0000-000000000001', '2025-12-01', '2025-12-31', 117.9, 125.5, 115, -6.1),

  ('22000000-0000-0000-0000-000000000002', '2025-07-01', '2025-07-31', 44.0, 42.3, 38, 4.0),
  ('22000000-0000-0000-0000-000000000002', '2025-12-01', '2025-12-31', 40.1, 42.3, 38, -5.2),

  ('22000000-0000-0000-0000-000000000003', '2025-07-01', '2025-07-31', 2910, 2850, 2650, 2.1),
  ('22000000-0000-0000-0000-000000000003', '2025-12-01', '2025-12-31', 2720, 2850, 2650, -4.6),

  ('22000000-0000-0000-0000-000000000001', '2026-01-01', '2026-01-31', 119.2, 125.5, 115, -5.0),
  ('22000000-0000-0000-0000-000000000001', '2026-02-01', '2026-02-28', 121.7, 125.5, 115, -3.0),
  ('22000000-0000-0000-0000-000000000001', '2026-03-01', '2026-03-31', 124.0, 125.5, 115, -1.2),
  ('22000000-0000-0000-0000-000000000001', '2026-04-01', '2026-04-30', 126.9, 125.5, 115, 1.1),
  ('22000000-0000-0000-0000-000000000001', '2026-05-01', '2026-05-31', 128.4, 125.5, 115, 2.3),
  ('22000000-0000-0000-0000-000000000001', '2026-06-01', '2026-06-30', 129.6, 125.5, 115, 3.3),

  ('22000000-0000-0000-0000-000000000002', '2026-06-01', '2026-06-30', 43.8, 42.3, 38, 3.5),
  ('22000000-0000-0000-0000-000000000003', '2026-06-01', '2026-06-30', 2895, 2850, 2650, 1.6),
  ('22000000-0000-0000-0000-000000000004', '2026-06-01', '2026-06-30', 8.8, 8.2, 7.7, 7.3);

------------------------------------------------------------
-- Improvement Actions (3 demo)
------------------------------------------------------------
insert into energy_improvements (id, site_id, work_type, title, description, status, priority, category, utility, estimated_energy_savings, savings_unit, estimated_cost_savings, estimated_investment, currency, payback_months, owner_id, planned_start, planned_finish) values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'project', 'Reemplazo de Compresor C-01 por VSD',
   'Proyecto para reemplazar el compresor de tornillo actual por uno de velocidad variable (VSD) para optimizar el consumo de aire comprimido.',
   'approved', 'high', 'investment', 'compressed_air', 85000, 'kWh', 12750, 45000, 'USD', 18, null, '2025-03-01', '2025-09-30'),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'quick_action', 'Reparar fuga de aire en linea de empaque',
   'Detectada fuga significativa en la linea de distribucion de aire comprimido en la zona de empaque. Reparar union y acoples.',
   'in_progress', 'high', 'leakage', 'compressed_air', 12000, 'kWh', 1800, 500, 'USD', 2, null, '2025-01-15', '2025-02-15'),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'quick_action', 'Ajustar setpoint de temperatura de chiller',
   'El chiller esta operando a 6C cuando el proceso solo requiere 9C. Ajustar setpoint para reducir consumo de agua helada.',
   'closed', 'medium', 'controls', 'chilled_water', 15000, 'kWh', 2250, 0, 'USD', 0, null, '2024-11-01', '2024-11-15'),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 'quick_action', 'Recuperacion de condensado en intercambiador HX-01',
   'Instalar trampa de vapor y linea de retorno para recuperar condensado del intercambiador principal.',
   'identified', 'medium', 'efficiency', 'steam', 45000, 'kg', 3600, 8000, 'USD', 15, null, '2025-06-01', '2025-08-31')
on conflict (id) do nothing;

-- Project phases for compressor replacement
insert into energy_project_phases (improvement_id, "order", name, status, budget, progress, planned_start, planned_finish) values
  ('50000000-0000-0000-0000-000000000001', 1, 'Evaluacion tecnica y cotizacion', 'completed', 2000, 100, '2025-03-01', '2025-03-31'),
  ('50000000-0000-0000-0000-000000000001', 2, 'Adquisicion del equipo', 'completed', 38000, 100, '2025-04-01', '2025-05-15'),
  ('50000000-0000-0000-0000-000000000001', 3, 'Instalacion y comisionamiento', 'in_progress', 4500, 60, '2025-05-16', '2025-08-15'),
  ('50000000-0000-0000-0000-000000000001', 4, 'M&V y cierre', 'pending', 500, 0, '2025-08-16', '2025-09-30');

insert into energy_project_tasks (improvement_id, phase_id, title, status, priority, planned_date) values
  ('50000000-0000-0000-0000-000000000001', (select id from energy_project_phases where improvement_id = '50000000-0000-0000-0000-000000000001' and "order" = 3 limit 1), 'Desmontar compresor actual', 'completed', 'high', '2025-05-16'),
  ('50000000-0000-0000-0000-000000000001', (select id from energy_project_phases where improvement_id = '50000000-0000-0000-0000-000000000001' and "order" = 3 limit 1), 'Instalar nuevo compresor VSD', 'completed', 'high', '2025-06-01'),
  ('50000000-0000-0000-0000-000000000001', (select id from energy_project_phases where improvement_id = '50000000-0000-0000-0000-000000000001' and "order" = 3 limit 1), 'Calibrar variador de frecuencia', 'in_progress', 'high', '2025-07-01'),
  ('50000000-0000-0000-0000-000000000001', (select id from energy_project_phases where improvement_id = '50000000-0000-0000-0000-000000000001' and "order" = 3 limit 1), 'Pruebas de rendimiento', 'pending', 'normal', '2025-07-15');

------------------------------------------------------------
-- SGEn Data
------------------------------------------------------------
insert into sgen_scopes (id, site_id, name, description, boundaries, included_utilities, status, version) values
  ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   'Alcance SGEn Planta Demostracion v1',
   'Sistema de Gestion de la Energia para Planta Demostracion, incluyendo todas las areas productivas y utilities centrales.',
   'Planta Demostracion completa: salas de calderas, compressores, electrica, chillers, produccion, empaque. Excluye edificio administrativo.',
   '{electricity,steam,compressed_air,chilled_water,natural_gas}', 'approved', 1)
on conflict (id) do nothing;

insert into sgen_significant_uses (id, site_id, name, utility, equipment_id, consumption_value, cost_value, significance_score, significance_rationale, status) values
  ('33000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Compresor de Aire C-01', 'compressed_air', 'e0000000-0000-0000-0000-000000000010', 3200000, 38400, 85, 'Mayor consumidor electrico individual. Opera 24/7. Alta capacidad de mejora con VSD.', 'active'),
  ('33000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'Caldera B-01', 'steam', 'e0000000-0000-0000-0000-000000000007', 2640000, 52000, 92, 'Principal fuente de vapor. Representa el 70% del consumo de gas natural. Critica para produccion.', 'active'),
  ('33000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'Chiller CH-01', 'chilled_water', 'e0000000-0000-0000-0000-000000000012', 240000, 19200, 72, 'Alta variabilidad estacional. Oportunidad de optimizacion por setpoint.', 'active')
on conflict (id) do nothing;

insert into sgen_evidence (id, site_id, title, description, domain, linked_entity_type, linked_entity_id, source_type, status) values
  ('70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Balance electrico Enero 2025', 'Balance de electricidad con cobertura del 87.4% y perdidas no explicadas del 12.6%', 'energy_review', 'balance', 'b0000000-0000-0000-0000-000000000001', 'system_snapshot', 'accepted'),
  ('70000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'EnPI kWh/ton — Tendencia 6 meses', 'Tendencia de mejora: de 130.2 a 117.9 kWh/ton en 6 meses (-9.4%)', 'objectives', 'enpi', '22000000-0000-0000-0000-000000000001', 'system_snapshot', 'accepted'),
  ('70000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'Cierre de accion: Ajuste setpoint chiller', 'Accion cerrada con ahorro verificado de 15,000 kWh', 'actions', 'improvement', '50000000-0000-0000-0000-000000000003', 'system_snapshot', 'accepted')
on conflict (id) do nothing;

insert into sgen_improvements (id, site_id, description, origin, expected_impact, verified_result, lesson_learned, replicable, linked_improvement_id, status) values
  ('80000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Ajuste de setpoint en chiller redujo 15,000 kWh/mes sin afectar produccion', 'revision energetica', 'Reduccion de 8% en consumo de agua helada', 'Ahorro real de 15,000 kWh/mes verificado en 3 meses consecutivos', 'Revisar setpoints de todos los equipos HVAC periodicamente. Ahorros significativos con costo cero.', true, '50000000-0000-0000-0000-000000000003', 'verified')
on conflict (id) do nothing;

insert into sgen_legal_notices (site_id, notice_type, title, body, version, acknowledged) values
  ('40000000-0000-0000-0000-000000000001', 'legal', 'Aviso legal — SGEn',
   'VersaEnergy proporciona herramientas operativas de gestion energetica. No reproduce, reemplaza ni sustituye el texto oficial de ISO 50001 ni de ninguna otra norma publicada. Cada organizacion es responsable de adquirir, consultar y cumplir la version oficial del estandar que corresponda.',
   '1.0.0', false);
