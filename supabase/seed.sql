-- seed.sql — VersaEnergy Dataset Limpio
-- Un árbol de activos jerárquico, 4 diagramas vinculados, 18 meses de lecturas,
-- módulos funcionales (Balance, EnPI, Estudios, Acciones, SGEn).
--
-- Credencial demo:
--   email    admin@demo.com
--   password AdminDemo123!

------------------------------------------------------------
-- Company + Site
------------------------------------------------------------
create extension if not exists pgcrypto;

insert into companies (id, name, slug) values
  ('c0000000-0000-0000-0000-000000000001', 'Demo Industrial', 'demo')
on conflict (id) do nothing;

insert into sites (id, company_id, name, code, address) values
  ('40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'Planta Principal Demo', 'MAIN', 'Av. Energia 123, Ciudad Industrial'),
  ('40000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
   'Sede Norte Demo', 'NORTH', 'Parque Industrial Norte'),
  ('40000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001',
   'Sede Sur Demo', 'SOUTH', 'Parque Industrial Sur')
on conflict (id) do nothing;

insert into company_products (company_id, product_key, status, enabled_at)
values
  ('c0000000-0000-0000-0000-000000000001', 'versa_energy', 'active', now()),
  ('c0000000-0000-0000-0000-000000000001', 'versa_maint', 'active', now())
on conflict (company_id, product_key) do update
  set status = excluded.status,
      enabled_at = excluded.enabled_at,
      updated_at = now();

insert into site_products (company_id, site_id, product_key, status, enabled_at)
values
  ('c0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'versa_energy', 'active', now()),
  ('c0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'versa_maint', 'active', now()),
  ('c0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'versa_energy', 'active', now()),
  ('c0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'versa_maint', 'active', now()),
  ('c0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'versa_energy', 'active', now()),
  ('c0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'versa_maint', 'active', now())
on conflict (company_id, site_id, product_key) do update
  set status = excluded.status,
      enabled_at = excluded.enabled_at,
      updated_at = now();

do $$
declare
  v_admin_id    uuid := '10000000-0000-0000-0000-000000000001';
  v_admin_email text := 'admin@demo.com';
  v_admin_pass  text := 'AdminDemo123!';
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
      v_admin_id, '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      v_admin_email, crypt(v_admin_pass, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Admin Demo"}'::jsonb,
      false, '', '', '', '', '', '', '', '', false, false
    );
  else
    select id into v_admin_id from auth.users where email = v_admin_email;
    update auth.users
      set encrypted_password = crypt(v_admin_pass, gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          updated_at = now()
      where id = v_admin_id;
  end if;

  if not exists (
    select 1 from auth.identities where user_id = v_admin_id and provider = 'email'
  ) then
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
    values (
      gen_random_uuid(), v_admin_id, v_admin_email, 'email',
      jsonb_build_object('sub', v_admin_id::text, 'email', v_admin_email),
      now(), now()
    );
  end if;

  insert into profiles (auth_id, company_id, email, full_name, role)
  values (v_admin_id, 'c0000000-0000-0000-0000-000000000001', v_admin_email, 'Admin Demo', 'admin')
  on conflict (auth_id) do update
    set company_id = excluded.company_id, email = excluded.email,
        full_name = excluded.full_name, role = excluded.role,
        is_active = true, updated_at = now();
end $$;

insert into site_access
  (company_id, user_id, profile_id, scope, site_id, can_view, can_plan,
   can_execute, can_manage_energy, active)
select
  'c0000000-0000-0000-0000-000000000001',
  p.id,
  p.id,
  'all_sites',
  null,
  true,
  true,
  true,
  true,
  true
from profiles p
where p.auth_id = '10000000-0000-0000-0000-000000000001'
  and not exists (
    select 1
    from site_access sa
    where sa.company_id = 'c0000000-0000-0000-0000-000000000001'
      and sa.user_id = p.id
      and sa.scope = 'all_sites'
      and sa.active = true
  );

------------------------------------------------------------
-- Core Asset Registry — seed compartido inspirado en CMMSFSC
------------------------------------------------------------
insert into assets
  (id, site_id, parent_id, name, code, node_type, node_role, maintainable_kind,
   allow_work_orders, allow_pm, allow_downtime, rollup_kpis,
   requires_equipment_family, category, status, description,
   manufacturer, model, serial_number, specs, company_id)
values
  ('a0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', null,
   'Planta Principal Demo', 'MAIN', 'plant', 'grouping', null,
   false, false, false, true, false, 'other', 'active',
   'Sede principal demo con el arbol tecnico completo compartido con VersaMaint.',
   null, null, null, '{"seed_source":"CMMSFSC","core_registry":true}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),

  ('a0000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Produccion Linea B', 'PROD-B', 'area', 'grouping', null,
   false, false, false, true, false, 'other', 'active',
   'Area productiva usada por CMMS para arbol operativo y por Energy para scopes.',
   null, null, null, '{"cmms_node":"area_prod"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Utilities Planta Principal', 'UTIL', 'area', 'grouping', null,
   false, false, false, true, false, 'other', 'active',
   'Area de servicios industriales y energia de la planta demo.',
   null, null, null, '{"cmms_node":"area_util"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),

  ('a0000000-0000-0000-0000-000000000020', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010',
   'Sistema de Molienda', 'SYS-MILL', 'system', 'grouping', null,
   false, false, false, true, false, 'other', 'active',
   'Sistema de molienda del seed CMMS.',
   null, null, null, '{"cmms_node":"sys_milling"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000021', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010',
   'Sistema de Transferencia', 'SYS-TRANS', 'system', 'grouping', null,
   false, false, false, true, false, 'other', 'active',
   'Sistema de transferencia y alimentacion.',
   null, null, null, '{"cmms_node":"sys_transfer"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000022', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010',
   'Sistema de Secado', 'SYS-DRY', 'system', 'grouping', null,
   false, false, false, true, false, 'other', 'active',
   'Sistema termico de secado.',
   null, null, null, '{"cmms_node":"sys_drying"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000023', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000011',
   'Sistema de Aire Comprimido', 'SYS-AIR', 'system', 'grouping', null,
   false, false, false, true, false, 'other', 'active',
   'Sistema de aire comprimido de planta.',
   null, null, null, '{"cmms_node":"sys_air"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000024', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000011',
   'Sistema Electrico Principal', 'SYS-PWR', 'system', 'grouping', null,
   false, false, false, true, false, 'electrical', 'active',
   'Distribucion electrica y MCC principal.',
   null, null, null, '{"cmms_node":"sys_power"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),

  ('a0000000-0000-0000-0000-000000000101', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000020',
   'Molino Principal A', 'DEMO-MOL-001', 'equipment', 'maintainable', 'equipment',
   true, true, true, false, true, 'rotating', 'active',
   'Molino principal de linea B. Critico para produccion continua.',
   'FLSmidth', 'VXP-500', 'MOL-2022-1180', '{"rpm_nominal":1180,"potencia":"250 kW"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000102', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000021',
   'Banda Alimentadora', 'DEMO-BND-001', 'equipment', 'maintainable', 'equipment',
   true, true, true, false, true, 'rotating', 'active',
   'Banda de alimentacion al molino principal.',
   'Dorner', '3200 Series', 'BND-2021-4208', '{"velocidad_nominal":"1.2 m/s","ancho":"900 mm"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000103', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000020',
   'Mezcladora B', 'DEMO-MEZ-002', 'equipment', 'maintainable', 'equipment',
   true, true, true, false, true, 'rotating', 'active',
   'Mezcladora posterior a molienda.',
   'Buhler', 'MX-200', 'MEZ-2020-0912', '{"capacidad":"2.5 t/h"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000104', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000022',
   'Horno de Secado', 'DEMO-HOR-001', 'equipment', 'maintainable', 'equipment',
   true, true, true, false, true, 'static', 'active',
   'Horno continuo de secado con lazo de temperatura.',
   'ThermoLine', 'DRY-800', 'HOR-2019-3110', '{"temperatura_operacion":"160 C"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000105', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000020',
   'Motor Molino A', 'DEMO-MTR-001', 'equipment', 'maintainable', 'equipment',
   true, true, true, false, true, 'electrical', 'active',
   'Motor principal del molino A.',
   'WEG', 'W22', 'MTR-2022-7710', '{"potencia":"250 kW","voltaje":"480 V"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000106', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000020',
   'Reductor Molino A', 'DEMO-RED-001', 'equipment', 'maintainable', 'equipment',
   true, true, true, false, true, 'rotating', 'active',
   'Reductor del tren de molienda.',
   'SEW Eurodrive', 'X3FS', 'RED-2022-4190', '{"ratio":"18.5:1"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000107', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000024',
   'MCC Linea B', 'DEMO-MCC-001', 'equipment', 'maintainable', 'utility_system',
   true, true, true, false, true, 'electrical', 'active',
   'Centro de control de motores de linea B.',
   'Schneider Electric', 'Model 6', 'MCC-2021-0880', '{"alimentacion":"480 V"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000108', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000023',
   'Valvula Control Aire Secador', 'DEMO-VLV-001', 'equipment', 'maintainable', 'instrument',
   true, true, true, false, true, 'instrument', 'standby',
   'Valvula modulante de aire hacia secador.',
   'Fisher', 'DVC6200', 'VLV-2020-5120', '{"senal":"4-20 mA"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000109', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000022',
   'Extractor Horno', 'DEMO-FAN-001', 'equipment', 'maintainable', 'equipment',
   true, true, true, false, true, 'rotating', 'active',
   'Extractor de gases del horno de secado.',
   'Greenheck', 'BISW', 'FAN-2023-0210', '{"caudal":"18000 m3/h"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000110', '40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000022',
   'Bomba Agua Enfriamiento', 'DEMO-BOM-002', 'equipment', 'maintainable', 'equipment',
   true, true, true, false, true, 'rotating', 'active',
   'Bomba auxiliar de circuito de enfriamiento del horno.',
   'Grundfos', 'NB 50', 'GF-2023-6612', '{"caudal_nominal":"95 gpm"}'::jsonb,
   'c0000000-0000-0000-0000-000000000001')
on conflict (id) do update
  set name = excluded.name,
      code = excluded.code,
      parent_id = excluded.parent_id,
      node_type = excluded.node_type,
      node_role = excluded.node_role,
      maintainable_kind = excluded.maintainable_kind,
      category = excluded.category,
      status = excluded.status,
      description = excluded.description,
      manufacturer = excluded.manufacturer,
      model = excluded.model,
      serial_number = excluded.serial_number,
      specs = excluded.specs,
      updated_at = now();

insert into energy_asset_profiles
  (asset_id, utility_type, energy_role, energy_class, rated_power_kw,
   baseline_relevance, tags, notes)
values
  ('a0000000-0000-0000-0000-000000000020', 'electricity', 'load', 'primary_consumer', null, 'primary', array['cmms_seed','production'], 'Agrupador Core de molienda usado para rollup energetico.'),
  ('a0000000-0000-0000-0000-000000000022', 'steam', 'load', 'primary_consumer', null, 'primary', array['cmms_seed','thermal'], 'Agrupador Core de secado con cargas termicas.'),
  ('a0000000-0000-0000-0000-000000000023', 'compressed_air', 'distribution', 'utility_infrastructure', null, 'secondary', array['cmms_seed','utility'], 'Sistema de aire comprimido mantenido por CMMS y visible para Energy.'),
  ('a0000000-0000-0000-0000-000000000024', 'electricity', 'distribution', 'utility_infrastructure', null, 'primary', array['cmms_seed','electrical'], 'Sistema electrico principal compartido.'),
  ('a0000000-0000-0000-0000-000000000101', 'electricity', 'load', 'primary_consumer', 250, 'primary', array['cmms_seed','maintainable'], 'Molino critico del seed CMMS.'),
  ('a0000000-0000-0000-0000-000000000102', 'electricity', 'load', 'support_consumer', null, 'secondary', array['cmms_seed','maintainable'], 'Banda alimentadora.'),
  ('a0000000-0000-0000-0000-000000000103', 'electricity', 'load', 'support_consumer', null, 'secondary', array['cmms_seed','maintainable'], 'Mezcladora.'),
  ('a0000000-0000-0000-0000-000000000104', 'steam', 'conversion', 'primary_consumer', null, 'primary', array['cmms_seed','thermal'], 'Horno de secado con consumo termico relevante.'),
  ('a0000000-0000-0000-0000-000000000105', 'electricity', 'load', 'primary_consumer', 250, 'primary', array['cmms_seed','motor'], 'Motor principal de molienda.'),
  ('a0000000-0000-0000-0000-000000000107', 'electricity', 'distribution', 'utility_infrastructure', null, 'primary', array['cmms_seed','electrical'], 'MCC Linea B.'),
  ('a0000000-0000-0000-0000-000000000108', 'compressed_air', 'instrument', 'instrumentation', null, 'optional', array['cmms_seed','instrument'], 'Instrumentacion de aire hacia secador.'),
  ('a0000000-0000-0000-0000-000000000109', 'electricity', 'load', 'support_consumer', null, 'secondary', array['cmms_seed','fan'], 'Extractor del horno.'),
  ('a0000000-0000-0000-0000-000000000110', 'industrial_water', 'load', 'support_consumer', null, 'secondary', array['cmms_seed','pump'], 'Bomba de enfriamiento del horno.')
on conflict (asset_id) do update
  set utility_type = excluded.utility_type,
      energy_role = excluded.energy_role,
      energy_class = excluded.energy_class,
      rated_power_kw = excluded.rated_power_kw,
      baseline_relevance = excluded.baseline_relevance,
      tags = excluded.tags,
      notes = excluded.notes,
      updated_at = now();

------------------------------------------------------------
-- Árbol de activos — Nivel 0 (hijos directos del sitio)
------------------------------------------------------------
insert into energy_areas (id, site_id, name, code, description, parent_area_id) values
  ('7a000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',
   'Sala de Calderas', 'CAL', '3 calderas GLP → vapor, manifold centralizado', null),
  ('7a000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001',
   'Sala de Pozos',    'PZO', '3 pozos de agua con bombas sumergibles', null),
  ('7a000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000001',
   'Nave A',           'NAV-A', 'Producción A – Llenado y pasteurización', null),
  ('7a000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000001',
   'Nave B',           'NAV-B', 'Producción B – Mezclado y cocimiento', null),
  ('7a000000-0000-0000-0000-000000000005','40000000-0000-0000-0000-000000000001',
   'Nave C',           'NAV-C', 'Producción C – Laboratorio y almacén', null),
  ('7a000000-0000-0000-0000-000000000006','40000000-0000-0000-0000-000000000001',
   'Infraestructura',  'INFRA', 'Acometida CFE y distribución eléctrica principal', null)
on conflict (id) do nothing;

------------------------------------------------------------
-- Árbol de activos — Nivel 1 (sub-áreas)
------------------------------------------------------------
insert into energy_areas (id, site_id, name, code, description, parent_area_id) values
  -- Nave A
  ('7b000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',
   'A1 – Llenado',        'A1', 'Línea de llenado automático',
   '7a000000-0000-0000-0000-000000000003'),
  ('7b000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001',
   'A2 – Pasteurización', 'A2', 'Túnel de pasteurización continua',
   '7a000000-0000-0000-0000-000000000003'),
  ('7b000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000001',
   'A3 – Empaque',        'A3', 'Empaque y paletizado automatizado',
   '7a000000-0000-0000-0000-000000000003'),
  -- Nave B
  ('7b000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000001',
   'B1 – Mezclado',       'B1', 'Tanques de mezcla con agitadores',
   '7a000000-0000-0000-0000-000000000004'),
  ('7b000000-0000-0000-0000-000000000005','40000000-0000-0000-0000-000000000001',
   'B2 – Cocimiento',     'B2', 'Marmitas de cocimiento a vapor',
   '7a000000-0000-0000-0000-000000000004'),
  ('7b000000-0000-0000-0000-000000000006','40000000-0000-0000-0000-000000000001',
   'B3 – Enfriamiento',   'B3', 'Chillers y túnel de enfriamiento',
   '7a000000-0000-0000-0000-000000000004'),
  -- Nave C
  ('7b000000-0000-0000-0000-000000000007','40000000-0000-0000-0000-000000000001',
   'C1 – Laboratorio',    'C1', 'Control de calidad y análisis',
   '7a000000-0000-0000-0000-000000000005'),
  ('7b000000-0000-0000-0000-000000000008','40000000-0000-0000-0000-000000000001',
   'C2 – Mantenimiento',  'C2', 'Taller de mantenimiento',
   '7a000000-0000-0000-0000-000000000005'),
  ('7b000000-0000-0000-0000-000000000009','40000000-0000-0000-0000-000000000001',
   'C3 – Almacén',        'C3', 'Almacén de materias primas y producto terminado',
   '7a000000-0000-0000-0000-000000000005')
on conflict (id) do nothing;

------------------------------------------------------------
-- Equipos
------------------------------------------------------------
insert into energy_equipment (id, site_id, tag, name, equipment_type, utility_type, area_id, status) values
  -- Infraestructura
  ('7e000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',
   'ACOMETIDA-CFE','Acometida eléctrica CFE 13.2 kV','transformer','electricity',
   '7a000000-0000-0000-0000-000000000006','active'),
  -- Sala de Calderas
  ('7e000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001',
   'CAL-001','Caldera pirotubular 1 (200 BHP)','boiler','steam',
   '7a000000-0000-0000-0000-000000000001','active'),
  ('7e000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000001',
   'CAL-002','Caldera pirotubular 2 (200 BHP)','boiler','steam',
   '7a000000-0000-0000-0000-000000000001','active'),
  ('7e000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000001',
   'CAL-003','Caldera pirotubular 3 (200 BHP)','boiler','steam',
   '7a000000-0000-0000-0000-000000000001','active'),
  ('7e000000-0000-0000-0000-000000000005','40000000-0000-0000-0000-000000000001',
   'TQ-GLP-001','Tanque GLP principal 20,000 L','tank','natural_gas',
   '7a000000-0000-0000-0000-000000000001','active'),
  ('7e000000-0000-0000-0000-000000000006','40000000-0000-0000-0000-000000000001',
   'MANIFOLD-VAP','Manifold distribución vapor','manifold','steam',
   '7a000000-0000-0000-0000-000000000001','active'),
  -- Sala de Pozos
  ('7e000000-0000-0000-0000-000000000007','40000000-0000-0000-0000-000000000001',
   'POZO-001','Pozo profundo 1 con bomba sumergible','pump','industrial_water',
   '7a000000-0000-0000-0000-000000000002','active'),
  ('7e000000-0000-0000-0000-000000000008','40000000-0000-0000-0000-000000000001',
   'POZO-002','Pozo profundo 2 con bomba sumergible','pump','industrial_water',
   '7a000000-0000-0000-0000-000000000002','active'),
  ('7e000000-0000-0000-0000-000000000009','40000000-0000-0000-0000-000000000001',
   'POZO-003','Pozo profundo 3 con bomba sumergible','pump','industrial_water',
   '7a000000-0000-0000-0000-000000000002','active'),
  -- Nave A – distribución general
  ('7e000000-0000-0000-0000-000000000010','40000000-0000-0000-0000-000000000001',
   'PANEL-ELEC-A','Tablero eléctrico general Nave A','panel','electricity',
   '7a000000-0000-0000-0000-000000000003','active'),
  ('7e000000-0000-0000-0000-000000000011','40000000-0000-0000-0000-000000000001',
   'HEADER-VAP-A','Header vapor Nave A','header','steam',
   '7a000000-0000-0000-0000-000000000003','active'),
  ('7e000000-0000-0000-0000-000000000012','40000000-0000-0000-0000-000000000001',
   'HEADER-AGU-A','Header agua industrial Nave A','header','industrial_water',
   '7a000000-0000-0000-0000-000000000003','active'),
  -- Área A1 – Llenado
  ('7e000000-0000-0000-0000-000000000013','40000000-0000-0000-0000-000000000001',
   'M-A1-001','Llenadora automática 1','consumer','electricity',
   '7b000000-0000-0000-0000-000000000001','active'),
  ('7e000000-0000-0000-0000-000000000014','40000000-0000-0000-0000-000000000001',
   'M-A1-002','Llenadora automática 2','consumer','electricity',
   '7b000000-0000-0000-0000-000000000001','active'),
  ('7e000000-0000-0000-0000-000000000015','40000000-0000-0000-0000-000000000001',
   'M-A1-003','Esterilizador a vapor','heat_exchanger','steam',
   '7b000000-0000-0000-0000-000000000001','active'),
  -- Área A2 – Pasteurización
  ('7e000000-0000-0000-0000-000000000016','40000000-0000-0000-0000-000000000001',
   'M-A2-001','Pasteurizador HTST','heat_exchanger','steam',
   '7b000000-0000-0000-0000-000000000002','active'),
  ('7e000000-0000-0000-0000-000000000017','40000000-0000-0000-0000-000000000001',
   'M-A2-002','Bomba de circulación','pump','electricity',
   '7b000000-0000-0000-0000-000000000002','active'),
  -- Área A3 – Empaque
  ('7e000000-0000-0000-0000-000000000018','40000000-0000-0000-0000-000000000001',
   'M-A3-001','Termoformadora','consumer','electricity',
   '7b000000-0000-0000-0000-000000000003','active'),
  ('7e000000-0000-0000-0000-000000000019','40000000-0000-0000-0000-000000000001',
   'M-A3-002','Paletizador automático','consumer','electricity',
   '7b000000-0000-0000-0000-000000000003','active')
on conflict (id) do nothing;

------------------------------------------------------------
-- Puntos de medición
------------------------------------------------------------
insert into measurement_points
  (id, site_id, tag, name, target_type, target_id, utility,
   measurement_type, quantity, unit, source_type) values

  -- Infraestructura — acometida CFE
  ('7c000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',
   'EM-CFE-001','Medidor CFE acometida principal',
   'equipment','7e000000-0000-0000-0000-000000000001',
   'electricity','accumulator','energy','kWh','iot_db'),

  -- Sala Calderas — GLP entrada y vapor salida por caldera
  ('7c000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001',
   'FM-GLP-CAL1','Caudalímetro GLP Caldera 1',
   'equipment','7e000000-0000-0000-0000-000000000002',
   'natural_gas','accumulator','volume','Nm3','iot_db'),
  ('7c000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000001',
   'FM-VAP-CAL1','Medidor vapor salida Caldera 1',
   'equipment','7e000000-0000-0000-0000-000000000002',
   'steam','accumulator','mass','kg','iot_db'),
  ('7c000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000001',
   'FM-GLP-CAL2','Caudalímetro GLP Caldera 2',
   'equipment','7e000000-0000-0000-0000-000000000003',
   'natural_gas','accumulator','volume','Nm3','iot_db'),
  ('7c000000-0000-0000-0000-000000000005','40000000-0000-0000-0000-000000000001',
   'FM-VAP-CAL2','Medidor vapor salida Caldera 2',
   'equipment','7e000000-0000-0000-0000-000000000003',
   'steam','accumulator','mass','kg','iot_db'),
  ('7c000000-0000-0000-0000-000000000006','40000000-0000-0000-0000-000000000001',
   'FM-GLP-CAL3','Caudalímetro GLP Caldera 3',
   'equipment','7e000000-0000-0000-0000-000000000004',
   'natural_gas','accumulator','volume','Nm3','iot_db'),
  ('7c000000-0000-0000-0000-000000000007','40000000-0000-0000-0000-000000000001',
   'FM-VAP-CAL3','Medidor vapor salida Caldera 3',
   'equipment','7e000000-0000-0000-0000-000000000004',
   'steam','accumulator','mass','kg','iot_db'),

  -- Sala Pozos
  ('7c000000-0000-0000-0000-000000000008','40000000-0000-0000-0000-000000000001',
   'FM-AGU-POZO1','Medidor agua Pozo 1',
   'equipment','7e000000-0000-0000-0000-000000000007',
   'industrial_water','accumulator','volume','m3','iot_db'),
  ('7c000000-0000-0000-0000-000000000009','40000000-0000-0000-0000-000000000001',
   'FM-AGU-POZO2','Medidor agua Pozo 2',
   'equipment','7e000000-0000-0000-0000-000000000008',
   'industrial_water','accumulator','volume','m3','iot_db'),
  ('7c000000-0000-0000-0000-000000000010','40000000-0000-0000-0000-000000000001',
   'FM-AGU-POZO3','Medidor agua Pozo 3',
   'equipment','7e000000-0000-0000-0000-000000000009',
   'industrial_water','accumulator','volume','m3','iot_db'),

  -- Nave A — medidores generales (target_type = area)
  ('7c000000-0000-0000-0000-000000000011','40000000-0000-0000-0000-000000000001',
   'EM-NAVE-A','Medidor eléctrico general Nave A',
   'area','7a000000-0000-0000-0000-000000000003',
   'electricity','accumulator','energy','kWh','iot_db'),
  ('7c000000-0000-0000-0000-000000000012','40000000-0000-0000-0000-000000000001',
   'FM-VAP-NAVE-A','Medidor vapor general Nave A',
   'area','7a000000-0000-0000-0000-000000000003',
   'steam','accumulator','mass','kg','iot_db'),
  ('7c000000-0000-0000-0000-000000000013','40000000-0000-0000-0000-000000000001',
   'FM-AGU-NAVE-A','Medidor agua general Nave A',
   'area','7a000000-0000-0000-0000-000000000003',
   'industrial_water','accumulator','volume','m3','iot_db'),

  -- Nave B — medidores generales
  ('7c000000-0000-0000-0000-000000000014','40000000-0000-0000-0000-000000000001',
   'EM-NAVE-B','Medidor eléctrico general Nave B',
   'area','7a000000-0000-0000-0000-000000000004',
   'electricity','accumulator','energy','kWh','iot_db'),
  ('7c000000-0000-0000-0000-000000000015','40000000-0000-0000-0000-000000000001',
   'FM-VAP-NAVE-B','Medidor vapor general Nave B',
   'area','7a000000-0000-0000-0000-000000000004',
   'steam','accumulator','mass','kg','iot_db'),
  ('7c000000-0000-0000-0000-000000000016','40000000-0000-0000-0000-000000000001',
   'FM-AGU-NAVE-B','Medidor agua general Nave B',
   'area','7a000000-0000-0000-0000-000000000004',
   'industrial_water','accumulator','volume','m3','iot_db'),

  -- Nave C — medidores generales
  ('7c000000-0000-0000-0000-000000000017','40000000-0000-0000-0000-000000000001',
   'EM-NAVE-C','Medidor eléctrico general Nave C',
   'area','7a000000-0000-0000-0000-000000000005',
   'electricity','accumulator','energy','kWh','iot_db'),
  ('7c000000-0000-0000-0000-000000000018','40000000-0000-0000-0000-000000000001',
   'FM-VAP-NAVE-C','Medidor vapor general Nave C',
   'area','7a000000-0000-0000-0000-000000000005',
   'steam','accumulator','mass','kg','iot_db'),
  ('7c000000-0000-0000-0000-000000000019','40000000-0000-0000-0000-000000000001',
   'FM-AGU-NAVE-C','Medidor agua general Nave C',
   'area','7a000000-0000-0000-0000-000000000005',
   'industrial_water','accumulator','volume','m3','iot_db'),

  -- Área A1
  ('7c000000-0000-0000-0000-000000000020','40000000-0000-0000-0000-000000000001',
   'EM-AREA-A1','Medidor eléctrico Área A1',
   'area','7b000000-0000-0000-0000-000000000001',
   'electricity','accumulator','energy','kWh','iot_db'),
  ('7c000000-0000-0000-0000-000000000021','40000000-0000-0000-0000-000000000001',
   'FM-VAP-AREA-A1','Medidor vapor Área A1',
   'area','7b000000-0000-0000-0000-000000000001',
   'steam','accumulator','mass','kg','iot_db'),
  ('7c000000-0000-0000-0000-000000000022','40000000-0000-0000-0000-000000000001',
   'FM-AGU-AREA-A1','Medidor agua Área A1',
   'area','7b000000-0000-0000-0000-000000000001',
   'industrial_water','accumulator','volume','m3','iot_db'),

  -- Área A2
  ('7c000000-0000-0000-0000-000000000023','40000000-0000-0000-0000-000000000001',
   'EM-AREA-A2','Medidor eléctrico Área A2',
   'area','7b000000-0000-0000-0000-000000000002',
   'electricity','accumulator','energy','kWh','iot_db'),
  ('7c000000-0000-0000-0000-000000000024','40000000-0000-0000-0000-000000000001',
   'FM-VAP-AREA-A2','Medidor vapor Área A2',
   'area','7b000000-0000-0000-0000-000000000002',
   'steam','accumulator','mass','kg','iot_db'),

  -- Área A3
  ('7c000000-0000-0000-0000-000000000025','40000000-0000-0000-0000-000000000001',
   'EM-AREA-A3','Medidor eléctrico Área A3',
   'area','7b000000-0000-0000-0000-000000000003',
   'electricity','accumulator','energy','kWh','iot_db'),

  -- Máquinas Área A1 — nivel más granular
  ('7c000000-0000-0000-0000-000000000026','40000000-0000-0000-0000-000000000001',
   'EM-M-A1-001','Medidor Llenadora 1',
   'equipment','7e000000-0000-0000-0000-000000000013',
   'electricity','accumulator','energy','kWh','iot_db'),
  ('7c000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001',
   'EM-M-A1-002','Medidor Llenadora 2',
   'equipment','7e000000-0000-0000-0000-000000000014',
   'electricity','accumulator','energy','kWh','iot_db'),
  ('7c000000-0000-0000-0000-000000000028','40000000-0000-0000-0000-000000000001',
   'FM-VAP-M-A1-003','Medidor vapor Esterilizador',
   'equipment','7e000000-0000-0000-0000-000000000015',
   'steam','accumulator','mass','kg','iot_db')

on conflict (id) do nothing;

------------------------------------------------------------
-- E3: grupos Energy, perfiles de MeasurementPoints y bindings
------------------------------------------------------------
insert into energy_groups
  (id, site_id, code, name, description, group_type, utility_type, source, properties) values
  ('8a000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',
   'EG-ELEC-PLANTA','Frontera eléctrica de planta',
   'Grupo Energy para medicion y balance electrico de toda la sede.',
   'utility_boundary','electricity','generated_from_core',
   '{"scope":"site","demo":true}'::jsonb),
  ('8a000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001',
   'EG-VAP-CALDERAS','Sistema de vapor calderas',
   'Grupo Energy para entrada de GLP y salida de vapor de sala de calderas.',
   'metering_zone','steam','manual',
   '{"scope":"utility_system","demo":true}'::jsonb),
  ('8a000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000001',
   'EG-AGUA-POZOS','Agua industrial pozos',
   'Grupo Energy para medicion de captacion de agua industrial.',
   'metering_zone','industrial_water','manual',
   '{"scope":"utility_system","demo":true}'::jsonb),
  ('8a000000-0000-0000-0000-000000000011','40000000-0000-0000-0000-000000000001',
   'EG-ELEC-NAVE-A','Frontera electrica Nave A',
   'Grupo Energy real para el child_block Nave A: boundary general y submedidores de areas.',
   'utility_boundary','electricity','generated_from_core',
   '{"scope_type":"area","scope_id":"7a000000-0000-0000-0000-000000000003","demo":true}'::jsonb),
  ('8a000000-0000-0000-0000-000000000012','40000000-0000-0000-0000-000000000001',
   'EG-ELEC-NAVE-B','Frontera electrica Nave B',
   'Grupo Energy real para el child_block Nave B.',
   'utility_boundary','electricity','generated_from_core',
   '{"scope_type":"area","scope_id":"7a000000-0000-0000-0000-000000000004","demo":true}'::jsonb),
  ('8a000000-0000-0000-0000-000000000013','40000000-0000-0000-0000-000000000001',
   'EG-ELEC-NAVE-C','Frontera electrica Nave C',
   'Grupo Energy real para el child_block Nave C.',
   'utility_boundary','electricity','generated_from_core',
   '{"scope_type":"area","scope_id":"7a000000-0000-0000-0000-000000000005","demo":true}'::jsonb),
  ('8a000000-0000-0000-0000-000000000014','40000000-0000-0000-0000-000000000001',
   'EG-ELEC-AREA-A1','Frontera electrica Area A1',
   'Grupo Energy real para el child_block Area A1: boundary de area y submedidores de maquinas.',
   'utility_boundary','electricity','generated_from_core',
   '{"scope_type":"area","scope_id":"7b000000-0000-0000-0000-000000000001","demo":true}'::jsonb),
  ('8a000000-0000-0000-0000-000000000015','40000000-0000-0000-0000-000000000001',
   'EG-ELEC-AREA-A2','Frontera electrica Area A2',
   'Grupo Energy real para el child_block Area A2.',
   'utility_boundary','electricity','generated_from_core',
   '{"scope_type":"area","scope_id":"7b000000-0000-0000-0000-000000000002","demo":true}'::jsonb),
  ('8a000000-0000-0000-0000-000000000016','40000000-0000-0000-0000-000000000001',
   'EG-ELEC-AREA-A3','Frontera electrica Area A3',
   'Grupo Energy real para el child_block Area A3.',
   'utility_boundary','electricity','generated_from_core',
   '{"scope_type":"area","scope_id":"7b000000-0000-0000-0000-000000000003","demo":true}'::jsonb)
on conflict (id) do nothing;

insert into energy_measurement_point_profiles
  (measurement_point_id, utility_type, energy_quantity, reading_semantics,
   aggregation_method, expected_frequency, validation_profile, source_owner)
select
  mp.id,
  mp.utility,
  mp.quantity,
  case
    when mp.measurement_type in ('accumulator', 'counter') then 'accumulator_delta'
    when mp.measurement_type = 'status' then 'status'
    when mp.measurement_type = 'calculated' then 'calculated'
    else 'instantaneous_value'
  end,
  case
    when mp.measurement_type in ('accumulator', 'counter') then 'delta'
    when mp.measurement_type = 'status' then 'last'
    else 'avg'
  end,
  case when mp.source_type = 'manual' then 'manual' else 'monthly' end,
  jsonb_build_object('seeded', true, 'source_type', mp.source_type),
  'energy'
from measurement_points mp
on conflict (measurement_point_id) do update
  set utility_type = excluded.utility_type,
      energy_quantity = excluded.energy_quantity,
      reading_semantics = excluded.reading_semantics,
      aggregation_method = excluded.aggregation_method,
      expected_frequency = excluded.expected_frequency,
      validation_profile = excluded.validation_profile,
      source_owner = excluded.source_owner,
      updated_at = now();

insert into energy_group_members
  (id, energy_group_id, member_type, measurement_point_id, role, properties) values
  ('8b000000-0000-0000-0000-000000000001','8a000000-0000-0000-0000-000000000001',
   'measurement_point','7c000000-0000-0000-0000-000000000001','boundary',
   '{"demo":"main_electric_boundary"}'::jsonb),
  ('8b000000-0000-0000-0000-000000000002','8a000000-0000-0000-0000-000000000002',
   'measurement_point','7c000000-0000-0000-0000-000000000002','included',
   '{"demo":"boiler_1_fuel_input"}'::jsonb),
  ('8b000000-0000-0000-0000-000000000003','8a000000-0000-0000-0000-000000000002',
   'measurement_point','7c000000-0000-0000-0000-000000000003','included',
   '{"demo":"boiler_1_steam_output"}'::jsonb),
  ('8b000000-0000-0000-0000-000000000004','8a000000-0000-0000-0000-000000000003',
   'measurement_point','7c000000-0000-0000-0000-000000000008','included',
   '{"demo":"well_1_water"}'::jsonb),
  ('8b000000-0000-0000-0000-000000000011','8a000000-0000-0000-0000-000000000011',
   'measurement_point','7c000000-0000-0000-0000-000000000011','boundary',
   '{"demo":"nave_a_electric_boundary"}'::jsonb),
  ('8b000000-0000-0000-0000-000000000012','8a000000-0000-0000-0000-000000000011',
   'measurement_point','7c000000-0000-0000-0000-000000000020','submeter',
   '{"demo":"area_a1_submeter"}'::jsonb),
  ('8b000000-0000-0000-0000-000000000013','8a000000-0000-0000-0000-000000000011',
   'measurement_point','7c000000-0000-0000-0000-000000000023','submeter',
   '{"demo":"area_a2_submeter"}'::jsonb),
  ('8b000000-0000-0000-0000-000000000014','8a000000-0000-0000-0000-000000000011',
   'measurement_point','7c000000-0000-0000-0000-000000000025','submeter',
   '{"demo":"area_a3_submeter"}'::jsonb),
  ('8b000000-0000-0000-0000-000000000015','8a000000-0000-0000-0000-000000000012',
   'measurement_point','7c000000-0000-0000-0000-000000000014','boundary',
   '{"demo":"nave_b_electric_boundary"}'::jsonb),
  ('8b000000-0000-0000-0000-000000000016','8a000000-0000-0000-0000-000000000013',
   'measurement_point','7c000000-0000-0000-0000-000000000017','boundary',
   '{"demo":"nave_c_electric_boundary"}'::jsonb),
  ('8b000000-0000-0000-0000-000000000017','8a000000-0000-0000-0000-000000000014',
   'measurement_point','7c000000-0000-0000-0000-000000000020','boundary',
   '{"demo":"area_a1_electric_boundary"}'::jsonb),
  ('8b000000-0000-0000-0000-000000000018','8a000000-0000-0000-0000-000000000014',
   'measurement_point','7c000000-0000-0000-0000-000000000026','submeter',
   '{"demo":"machine_a1_001_submeter"}'::jsonb),
  ('8b000000-0000-0000-0000-000000000019','8a000000-0000-0000-0000-000000000014',
   'measurement_point','7c000000-0000-0000-0000-000000000027','submeter',
   '{"demo":"machine_a1_002_submeter"}'::jsonb),
  ('8b000000-0000-0000-0000-000000000020','8a000000-0000-0000-0000-000000000015',
   'measurement_point','7c000000-0000-0000-0000-000000000023','boundary',
   '{"demo":"area_a2_electric_boundary"}'::jsonb),
  ('8b000000-0000-0000-0000-000000000021','8a000000-0000-0000-0000-000000000016',
   'measurement_point','7c000000-0000-0000-0000-000000000025','boundary',
   '{"demo":"area_a3_electric_boundary"}'::jsonb)
on conflict (id) do nothing;

insert into energy_measurement_bindings
  (id, site_id, measurement_point_id, binding_type, energy_group_id, role,
   is_primary, properties) values
  ('8c000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',
   '7c000000-0000-0000-0000-000000000001','energy_group',
   '8a000000-0000-0000-0000-000000000001','boundary',true,
   '{"seeded":true}'::jsonb),
  ('8c000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001',
   '7c000000-0000-0000-0000-000000000003','energy_group',
   '8a000000-0000-0000-0000-000000000002','indicator',true,
   '{"seeded":true}'::jsonb),
  ('8c000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000001',
   '7c000000-0000-0000-0000-000000000008','energy_group',
   '8a000000-0000-0000-0000-000000000003','indicator',true,
   '{"seeded":true}'::jsonb),
  ('8c000000-0000-0000-0000-000000000011','40000000-0000-0000-0000-000000000001',
   '7c000000-0000-0000-0000-000000000011','energy_group',
   '8a000000-0000-0000-0000-000000000011','boundary',true,
   '{"seeded":true,"summary":"nave_a_boundary"}'::jsonb),
  ('8c000000-0000-0000-0000-000000000012','40000000-0000-0000-0000-000000000001',
   '7c000000-0000-0000-0000-000000000020','energy_group',
   '8a000000-0000-0000-0000-000000000011','submeter',false,
   '{"seeded":true,"summary":"area_a1_submeter"}'::jsonb),
  ('8c000000-0000-0000-0000-000000000013','40000000-0000-0000-0000-000000000001',
   '7c000000-0000-0000-0000-000000000023','energy_group',
   '8a000000-0000-0000-0000-000000000011','submeter',false,
   '{"seeded":true,"summary":"area_a2_submeter"}'::jsonb),
  ('8c000000-0000-0000-0000-000000000014','40000000-0000-0000-0000-000000000001',
   '7c000000-0000-0000-0000-000000000025','energy_group',
   '8a000000-0000-0000-0000-000000000011','submeter',false,
   '{"seeded":true,"summary":"area_a3_submeter"}'::jsonb),
  ('8c000000-0000-0000-0000-000000000015','40000000-0000-0000-0000-000000000001',
   '7c000000-0000-0000-0000-000000000014','energy_group',
   '8a000000-0000-0000-0000-000000000012','boundary',true,
   '{"seeded":true,"summary":"nave_b_boundary"}'::jsonb),
  ('8c000000-0000-0000-0000-000000000016','40000000-0000-0000-0000-000000000001',
   '7c000000-0000-0000-0000-000000000017','energy_group',
   '8a000000-0000-0000-0000-000000000013','boundary',true,
   '{"seeded":true,"summary":"nave_c_boundary"}'::jsonb),
  ('8c000000-0000-0000-0000-000000000017','40000000-0000-0000-0000-000000000001',
   '7c000000-0000-0000-0000-000000000020','energy_group',
   '8a000000-0000-0000-0000-000000000014','boundary',true,
   '{"seeded":true,"summary":"area_a1_boundary"}'::jsonb),
  ('8c000000-0000-0000-0000-000000000018','40000000-0000-0000-0000-000000000001',
   '7c000000-0000-0000-0000-000000000026','energy_group',
   '8a000000-0000-0000-0000-000000000014','submeter',false,
   '{"seeded":true,"summary":"machine_a1_001_submeter"}'::jsonb),
  ('8c000000-0000-0000-0000-000000000019','40000000-0000-0000-0000-000000000001',
   '7c000000-0000-0000-0000-000000000027','energy_group',
   '8a000000-0000-0000-0000-000000000014','submeter',false,
   '{"seeded":true,"summary":"machine_a1_002_submeter"}'::jsonb),
  ('8c000000-0000-0000-0000-000000000020','40000000-0000-0000-0000-000000000001',
   '7c000000-0000-0000-0000-000000000023','energy_group',
   '8a000000-0000-0000-0000-000000000015','boundary',true,
   '{"seeded":true,"summary":"area_a2_boundary"}'::jsonb),
  ('8c000000-0000-0000-0000-000000000021','40000000-0000-0000-0000-000000000001',
   '7c000000-0000-0000-0000-000000000025','energy_group',
   '8a000000-0000-0000-0000-000000000016','boundary',true,
   '{"seeded":true,"summary":"area_a3_boundary"}'::jsonb)
on conflict (id) do nothing;

-- Lecturas — 18 meses (Ene 2025 → Jun 2026)
------------------------------------------------------------
do $$
declare
  v_m   int;
  v_ts  timestamptz;
  v_cfe    numeric := 10000000;
  v_glp1   numeric :=  2000000;  v_vap1 numeric :=  8000000;
  v_glp2   numeric :=  2100000;  v_vap2 numeric :=  8200000;
  v_glp3   numeric :=  1900000;  v_vap3 numeric :=  7800000;
  v_agu1   numeric :=  1500000;  v_agu2 numeric :=  1400000;  v_agu3 numeric := 1300000;
  v_ea     numeric :=  3000000;  v_va   numeric :=  4000000;  v_wa  numeric :=  900000;
  v_eb     numeric :=  2800000;  v_vb   numeric :=  4200000;  v_wb  numeric :=  850000;
  v_ec     numeric :=  1500000;  v_vc   numeric :=  2100000;  v_wc  numeric :=  400000;
  v_ea1    numeric :=  1100000;  v_va1  numeric :=  1800000;  v_wa1 numeric :=  320000;
  v_ea2    numeric :=  1000000;  v_va2  numeric :=  1600000;
  v_ea3    numeric :=   700000;
  v_m1     numeric :=   480000;  v_m2   numeric :=   420000;  v_m3  numeric :=  900000;
begin
  for v_m in 1..18 loop
    v_ts := ('2025-01-01'::date + ((v_m - 1) || ' months')::interval)::timestamptz + '23:45:00';

    v_cfe  := v_cfe  + 57000  + (random() * 6000)::int;
    v_glp1 := v_glp1 + 11800  + (random() * 1200)::int;
    v_vap1 := v_vap1 + 155000 + (random() * 15000)::int;
    v_glp2 := v_glp2 + 12000  + (random() * 1200)::int;
    v_vap2 := v_vap2 + 158000 + (random() * 14000)::int;
    v_glp3 := v_glp3 + 11500  + (random() * 1100)::int;
    v_vap3 := v_vap3 + 150000 + (random() * 13000)::int;
    v_agu1 := v_agu1 + 9800   + (random() * 1000)::int;
    v_agu2 := v_agu2 + 9200   + (random() * 900)::int;
    v_agu3 := v_agu3 + 8600   + (random() * 900)::int;
    v_ea   := v_ea   + 18500  + (random() * 2000)::int;
    v_va   := v_va   + 155000 + (random() * 12000)::int;
    v_wa   := v_wa   + 9000   + (random() * 900)::int;
    v_eb   := v_eb   + 17000  + (random() * 1800)::int;
    v_vb   := v_vb   + 160000 + (random() * 13000)::int;
    v_wb   := v_wb   + 8400   + (random() * 800)::int;
    v_ec   := v_ec   + 9200   + (random() * 900)::int;
    v_vc   := v_vc   + 82000  + (random() * 7000)::int;
    v_wc   := v_wc   + 3800   + (random() * 400)::int;
    v_ea1  := v_ea1  + 6800   + (random() * 700)::int;
    v_va1  := v_va1  + 58000  + (random() * 5000)::int;
    v_wa1  := v_wa1  + 3200   + (random() * 300)::int;
    v_ea2  := v_ea2  + 6200   + (random() * 600)::int;
    v_va2  := v_va2  + 54000  + (random() * 5000)::int;
    v_ea3  := v_ea3  + 4200   + (random() * 400)::int;
    v_m1   := v_m1   + 3100   + (random() * 300)::int;
    v_m2   := v_m2   + 2800   + (random() * 280)::int;
    v_m3   := v_m3   + 28000  + (random() * 2500)::int;

    insert into measurement_readings (measurement_point_id, value, recorded_at, quality, notes)
    values
      ('7c000000-0000-0000-0000-000000000001', v_cfe,  v_ts, 'good', 'Mensual CFE'),
      ('7c000000-0000-0000-0000-000000000002', v_glp1, v_ts, 'good', 'Mensual GLP CAL1'),
      ('7c000000-0000-0000-0000-000000000003', v_vap1, v_ts, 'good', 'Mensual VAP CAL1'),
      ('7c000000-0000-0000-0000-000000000004', v_glp2, v_ts, 'good', 'Mensual GLP CAL2'),
      ('7c000000-0000-0000-0000-000000000005', v_vap2, v_ts, 'good', 'Mensual VAP CAL2'),
      ('7c000000-0000-0000-0000-000000000006', v_glp3, v_ts, 'good', 'Mensual GLP CAL3'),
      ('7c000000-0000-0000-0000-000000000007', v_vap3, v_ts, 'good', 'Mensual VAP CAL3'),
      ('7c000000-0000-0000-0000-000000000008', v_agu1, v_ts, 'good', 'Mensual AGU POZO1'),
      ('7c000000-0000-0000-0000-000000000009', v_agu2, v_ts, 'good', 'Mensual AGU POZO2'),
      ('7c000000-0000-0000-0000-000000000010', v_agu3, v_ts, 'good', 'Mensual AGU POZO3'),
      ('7c000000-0000-0000-0000-000000000011', v_ea,   v_ts, 'good', 'Mensual ELEC NAVE-A'),
      ('7c000000-0000-0000-0000-000000000012', v_va,   v_ts, 'good', 'Mensual VAP NAVE-A'),
      ('7c000000-0000-0000-0000-000000000013', v_wa,   v_ts, 'good', 'Mensual AGU NAVE-A'),
      ('7c000000-0000-0000-0000-000000000014', v_eb,   v_ts, 'good', 'Mensual ELEC NAVE-B'),
      ('7c000000-0000-0000-0000-000000000015', v_vb,   v_ts, 'good', 'Mensual VAP NAVE-B'),
      ('7c000000-0000-0000-0000-000000000016', v_wb,   v_ts, 'good', 'Mensual AGU NAVE-B'),
      ('7c000000-0000-0000-0000-000000000017', v_ec,   v_ts, 'good', 'Mensual ELEC NAVE-C'),
      ('7c000000-0000-0000-0000-000000000018', v_vc,   v_ts, 'good', 'Mensual VAP NAVE-C'),
      ('7c000000-0000-0000-0000-000000000019', v_wc,   v_ts, 'good', 'Mensual AGU NAVE-C'),
      ('7c000000-0000-0000-0000-000000000020', v_ea1,  v_ts, 'good', 'Mensual ELEC AREA-A1'),
      ('7c000000-0000-0000-0000-000000000021', v_va1,  v_ts, 'good', 'Mensual VAP AREA-A1'),
      ('7c000000-0000-0000-0000-000000000022', v_wa1,  v_ts, 'good', 'Mensual AGU AREA-A1'),
      ('7c000000-0000-0000-0000-000000000023', v_ea2,  v_ts, 'good', 'Mensual ELEC AREA-A2'),
      ('7c000000-0000-0000-0000-000000000024', v_va2,  v_ts, 'good', 'Mensual VAP AREA-A2'),
      ('7c000000-0000-0000-0000-000000000025', v_ea3,  v_ts, 'good', 'Mensual ELEC AREA-A3'),
      ('7c000000-0000-0000-0000-000000000026', v_m1,   v_ts, 'good', 'Mensual ELEC M-A1-001'),
      ('7c000000-0000-0000-0000-000000000027', v_m2,   v_ts, 'good', 'Mensual ELEC M-A1-002'),
      ('7c000000-0000-0000-0000-000000000028', v_m3,   v_ts, 'good', 'Mensual VAP M-A1-003');
  end loop;
end $$;

-- Lecturas "en vivo" (~1h atrás) para semáforo verde en el canvas
do $$
declare live_ts timestamptz := now() - interval '75 minutes';
begin
  insert into measurement_readings (measurement_point_id, value, recorded_at, quality, notes)
  select
    v.measurement_point_id,
    coalesce((
      select max(mr.value) + v.increment
      from measurement_readings mr
      where mr.measurement_point_id = v.measurement_point_id
    ), v.increment),
    live_ts,
    'good',
    v.notes
  from (values
    ('7c000000-0000-0000-0000-000000000001'::uuid, 2600::numeric, 'En vivo CFE'),
    ('7c000000-0000-0000-0000-000000000002'::uuid,  900::numeric, 'En vivo GLP CAL1'),
    ('7c000000-0000-0000-0000-000000000003'::uuid, 1800::numeric, 'En vivo VAP CAL1'),
    ('7c000000-0000-0000-0000-000000000004'::uuid,  920::numeric, 'En vivo GLP CAL2'),
    ('7c000000-0000-0000-0000-000000000005'::uuid, 1840::numeric, 'En vivo VAP CAL2'),
    ('7c000000-0000-0000-0000-000000000006'::uuid,  870::numeric, 'En vivo GLP CAL3'),
    ('7c000000-0000-0000-0000-000000000007'::uuid, 1760::numeric, 'En vivo VAP CAL3'),
    ('7c000000-0000-0000-0000-000000000008'::uuid,  420::numeric, 'En vivo AGU POZO1'),
    ('7c000000-0000-0000-0000-000000000009'::uuid,  390::numeric, 'En vivo AGU POZO2'),
    ('7c000000-0000-0000-0000-000000000010'::uuid,  360::numeric, 'En vivo AGU POZO3'),
    ('7c000000-0000-0000-0000-000000000011'::uuid, 1500::numeric, 'En vivo ELEC NAVE-A'),
    ('7c000000-0000-0000-0000-000000000012'::uuid, 1660::numeric, 'En vivo VAP NAVE-A'),
    ('7c000000-0000-0000-0000-000000000013'::uuid,  250::numeric, 'En vivo AGU NAVE-A'),
    ('7c000000-0000-0000-0000-000000000014'::uuid, 1420::numeric, 'En vivo ELEC NAVE-B'),
    ('7c000000-0000-0000-0000-000000000015'::uuid, 1700::numeric, 'En vivo VAP NAVE-B'),
    ('7c000000-0000-0000-0000-000000000016'::uuid,  235::numeric, 'En vivo AGU NAVE-B'),
    ('7c000000-0000-0000-0000-000000000017'::uuid,  690::numeric, 'En vivo ELEC NAVE-C'),
    ('7c000000-0000-0000-0000-000000000018'::uuid,  860::numeric, 'En vivo VAP NAVE-C'),
    ('7c000000-0000-0000-0000-000000000019'::uuid,  105::numeric, 'En vivo AGU NAVE-C'),
    ('7c000000-0000-0000-0000-000000000020'::uuid,  610::numeric, 'En vivo ELEC AREA-A1'),
    ('7c000000-0000-0000-0000-000000000021'::uuid,  720::numeric, 'En vivo VAP AREA-A1'),
    ('7c000000-0000-0000-0000-000000000022'::uuid,   95::numeric, 'En vivo AGU AREA-A1'),
    ('7c000000-0000-0000-0000-000000000023'::uuid,  570::numeric, 'En vivo ELEC AREA-A2'),
    ('7c000000-0000-0000-0000-000000000024'::uuid,  670::numeric, 'En vivo VAP AREA-A2'),
    ('7c000000-0000-0000-0000-000000000025'::uuid,  360::numeric, 'En vivo ELEC AREA-A3'),
    ('7c000000-0000-0000-0000-000000000026'::uuid,  150::numeric, 'En vivo ELEC M-A1-001'),
    ('7c000000-0000-0000-0000-000000000027'::uuid,  135::numeric, 'En vivo ELEC M-A1-002'),
    ('7c000000-0000-0000-0000-000000000028'::uuid,  330::numeric, 'En vivo VAP M-A1-003')
  ) as v(measurement_point_id, increment, notes)
  on conflict (measurement_point_id, recorded_at) do nothing;
end $$;

------------------------------------------------------------
-- Variables relevantes (denominadores de EnPIs)
------------------------------------------------------------
insert into relevant_variables
  (id, site_id, code, name, description, unit, variable_type, unit_family,
   default_frequency, aggregation_method, source_type, scope_type, scope_id,
   is_driver_candidate, properties) values
  ('d1000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001',
   'RV-PROD-TON-NAVE-A',
   'Toneladas producidas',
   'Producción total mensual de la planta en toneladas métricas.',
   'ton', 'production', 'mass', 'monthly', 'sum', 'manual',
   'energy_group', '7b000000-0000-0000-0000-000000000003', true,
   '{"template":"production_amount","business_use":"denominator"}'::jsonb),
  ('d1000000-0000-0000-0000-000000000002',
   '40000000-0000-0000-0000-000000000001',
   'RV-PROD-LB-LINEA-B',
   'Libras producidas — Línea B',
   'Producción de la línea B en libras para EnPIs eléctricos de empaque.',
   'lb', 'production', 'mass', 'weekly', 'sum', 'manual',
   'energy_group', '7b000000-0000-0000-0000-000000000004', true,
   '{"template":"production_amount","business_use":"alternate_denominator"}'::jsonb),
  ('d1000000-0000-0000-0000-000000000003',
   '40000000-0000-0000-0000-000000000001',
   'RV-TAMB-PLANTA',
   'Temperatura ambiente promedio',
   'Temperatura ambiente promedio del periodo para explicar cargas sensibles a clima.',
   '°C', 'environment', 'temperature', 'daily', 'avg', 'manual',
   'site', '40000000-0000-0000-0000-000000000001', true,
   '{"template":"ambient_temperature","business_use":"context"}'::jsonb),
  ('d1000000-0000-0000-0000-000000000004',
   '40000000-0000-0000-0000-000000000001',
   'RV-OCUP-TURNO',
   'Ocupación promedio por turno',
   'Personas promedio presentes por turno productivo.',
   'personas', 'occupancy', 'count', 'daily', 'avg', 'manual',
   'site', '40000000-0000-0000-0000-000000000001', true,
   '{"template":"occupancy","business_use":"context"}'::jsonb),
  ('d1000000-0000-0000-0000-000000000005',
   '40000000-0000-0000-0000-000000000001',
   'RV-RUNTIME-CALD',
   'Horas operación calderas',
   'Horas mensuales con al menos una caldera en servicio.',
   'h', 'runtime', 'time', 'monthly', 'sum', 'manual',
   'energy_group', '7b000000-0000-0000-0000-000000000001', true,
   '{"template":"runtime","business_use":"driver"}'::jsonb),
  ('d1000000-0000-0000-0000-000000000006',
   '40000000-0000-0000-0000-000000000001',
   'RV-AREA-CLIMA',
   'Área climatizada',
   'Metros cuadrados bajo climatización o ventilación relevante.',
   'm2', 'area', 'area', 'annual', 'last', 'manual',
   'site', '40000000-0000-0000-0000-000000000001', true,
   '{"template":"area","business_use":"normalization"}'::jsonb)
on conflict (id) do nothing;

insert into relevant_variable_groups
  (id, site_id, name, code, description, group_type, sort_order) values
  ('d2000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001',
   'Producción', 'RVG-PROD',
   'Volumen, masa y unidades producidas que sirven como base de intensidad.',
   'production', 10),
  ('d2000000-0000-0000-0000-000000000002',
   '40000000-0000-0000-0000-000000000001',
   'Clima y ambiente', 'RVG-CLIMA',
   'Variables ambientales usadas como contexto o ajuste.',
   'environment', 20),
  ('d2000000-0000-0000-0000-000000000003',
   '40000000-0000-0000-0000-000000000001',
   'Operación', 'RVG-OPER',
   'Horas de uso, ocupación y condiciones operativas.',
   'operation', 30),
  ('d2000000-0000-0000-0000-000000000004',
   '40000000-0000-0000-0000-000000000001',
   'Área y capacidad', 'RVG-AREA',
   'Variables estáticas o semiestáticas para normalización.',
   'area', 40)
on conflict (id) do nothing;

insert into relevant_variable_group_members (group_id, variable_id, sort_order) values
  ('d2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 10),
  ('d2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 20),
  ('d2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000003', 10),
  ('d2000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000004', 10),
  ('d2000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000005', 20),
  ('d2000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000006', 10)
on conflict do nothing;

-- 18 meses de datos de variables relevantes
do $$
declare
  v_m int; v_ps date; v_pe date; v_s numeric; v_ton numeric;
begin
  for v_m in 1..18 loop
    v_ps  := (date '2025-01-01' + ((v_m-1) || ' months')::interval)::date;
    v_pe  := (v_ps + '1 month'::interval - '1 day'::interval)::date;
    v_s   := 1.0 + 0.1 * sin((extract(month from v_ps)::int - 3) * pi() / 6);
    v_ton := round((850 + random() * 80) * v_s);
    insert into relevant_variable_readings
      (variable_id, period_start, period_end, frequency, value, unit_snapshot, quality, source_type, notes) values
      ('d1000000-0000-0000-0000-000000000001', v_ps, v_pe, 'monthly', v_ton, 'ton', 'manual', 'manual', 'Producción mensual'),
      ('d1000000-0000-0000-0000-000000000002', v_ps, v_pe, 'monthly', round(v_ton * 2204.6226), 'lb', 'manual', 'manual', 'Producción mensual equivalente Línea B'),
      ('d1000000-0000-0000-0000-000000000003', v_ps, v_pe, 'monthly', round((24 + 5 * sin((extract(month from v_ps)::int - 2) * pi() / 6))::numeric, 1), '°C', 'manual', 'manual', 'Promedio mensual ambiente'),
      ('d1000000-0000-0000-0000-000000000004', v_ps, v_pe, 'monthly', 74 + (extract(month from v_ps)::int % 7), 'personas', 'manual', 'manual', 'Ocupación promedio por turno'),
      ('d1000000-0000-0000-0000-000000000005', v_ps, v_pe, 'monthly', extract(day from v_pe)::numeric * 16, 'h', 'manual', 'manual', 'Calderas 2 turnos/día'),
      ('d1000000-0000-0000-0000-000000000006', v_ps, v_pe, 'monthly', 3420, 'm2', 'manual', 'manual', 'Área vigente del periodo')
    on conflict (variable_id, period_start, period_end, frequency) do nothing;
  end loop;
end $$;

------------------------------------------------------------
-- Balance Sheets
------------------------------------------------------------
insert into energy_balance_sheets
  (id, site_id, name, description, boundary_type, boundary_id,
   period_start, period_end, utility, status,
   calculation_mode, scope_type, scope_id, diagram_id, diagram_version_id) values

  ('ba000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001',
   'Sala de Calderas — GLP → Vapor (Jun 2026)',
   'Entrada: GLP a las 3 calderas. Salida: vapor generado. Diferencia = pérdidas térmicas.',
   'area', '7a000000-0000-0000-0000-000000000001',
   '2026-06-01', '2026-06-30', null, 'closed',
   'topology_official', 'area', '7a000000-0000-0000-0000-000000000001',
   null, null),

  ('ba000000-0000-0000-0000-000000000002',
   '40000000-0000-0000-0000-000000000001',
   'Nave A — Electricidad (Jun 2026)',
   'Entrada: medidor general Nave A. Salidas: Áreas A1, A2, A3. Diferencia = no medido.',
   'area', '7a000000-0000-0000-0000-000000000003',
   '2026-06-01', '2026-06-30', 'electricity', 'closed',
   'topology_official', 'area', '7a000000-0000-0000-0000-000000000003',
   null, null)

on conflict (id) do nothing;

insert into energy_balance_entries
  (id, sheet_id, side, equipment_id, measurement_point_id, label, order_index) values

  -- BS-001: Calderas GLP → vapor
  ('be000000-0000-0000-0000-000000000101', 'ba000000-0000-0000-0000-000000000001',
   'input', '7e000000-0000-0000-0000-000000000002', '7c000000-0000-0000-0000-000000000002',
   'CAL-001 — FM-GLP-CAL1 Gas entrada', 0),
  ('be000000-0000-0000-0000-000000000102', 'ba000000-0000-0000-0000-000000000001',
   'input', '7e000000-0000-0000-0000-000000000003', '7c000000-0000-0000-0000-000000000004',
   'CAL-002 — FM-GLP-CAL2 Gas entrada', 1),
  ('be000000-0000-0000-0000-000000000103', 'ba000000-0000-0000-0000-000000000001',
   'input', '7e000000-0000-0000-0000-000000000004', '7c000000-0000-0000-0000-000000000006',
   'CAL-003 — FM-GLP-CAL3 Gas entrada', 2),
  ('be000000-0000-0000-0000-000000000104', 'ba000000-0000-0000-0000-000000000001',
   'output', '7e000000-0000-0000-0000-000000000002', '7c000000-0000-0000-0000-000000000003',
   'CAL-001 — FM-VAP-CAL1 Vapor salida', 0),
  ('be000000-0000-0000-0000-000000000105', 'ba000000-0000-0000-0000-000000000001',
   'output', '7e000000-0000-0000-0000-000000000003', '7c000000-0000-0000-0000-000000000005',
   'CAL-002 — FM-VAP-CAL2 Vapor salida', 1),
  ('be000000-0000-0000-0000-000000000106', 'ba000000-0000-0000-0000-000000000001',
   'output', '7e000000-0000-0000-0000-000000000004', '7c000000-0000-0000-0000-000000000007',
   'CAL-003 — FM-VAP-CAL3 Vapor salida', 2),

  -- BS-002: Nave A electricidad
  ('be000000-0000-0000-0000-000000000201', 'ba000000-0000-0000-0000-000000000002',
   'input', null, '7c000000-0000-0000-0000-000000000011',
   'EM-NAVE-A — Entrada general Nave A', 0),
  ('be000000-0000-0000-0000-000000000202', 'ba000000-0000-0000-0000-000000000002',
   'output', null, '7c000000-0000-0000-0000-000000000020',
   'EM-AREA-A1 — Área A1 Llenado', 0),
  ('be000000-0000-0000-0000-000000000203', 'ba000000-0000-0000-0000-000000000002',
   'output', null, '7c000000-0000-0000-0000-000000000023',
   'EM-AREA-A2 — Área A2 Pasteurización', 1),
  ('be000000-0000-0000-0000-000000000204', 'ba000000-0000-0000-0000-000000000002',
   'output', null, '7c000000-0000-0000-0000-000000000025',
   'EM-AREA-A3 — Área A3 Empaque', 2)

on conflict (id) do nothing;

-- Valores precalculados BS-001 (Calderas)
update energy_balance_entries set value = 38200,  unit = 'Nm3', value_kwh_eq = 395472 where id = 'be000000-0000-0000-0000-000000000101';
update energy_balance_entries set value = 38800,  unit = 'Nm3', value_kwh_eq = 401685 where id = 'be000000-0000-0000-0000-000000000102';
update energy_balance_entries set value = 37100,  unit = 'Nm3', value_kwh_eq = 384070 where id = 'be000000-0000-0000-0000-000000000103';
update energy_balance_entries set value = 472000, unit = 'kg',  value_kwh_eq = 295000 where id = 'be000000-0000-0000-0000-000000000104';
update energy_balance_entries set value = 480000, unit = 'kg',  value_kwh_eq = 300000 where id = 'be000000-0000-0000-0000-000000000105';
update energy_balance_entries set value = 458000, unit = 'kg',  value_kwh_eq = 286250 where id = 'be000000-0000-0000-0000-000000000106';

-- Valores precalculados BS-002 (Nave A)
update energy_balance_entries set value = 57400, unit = 'kWh', value_kwh_eq = 57400 where id = 'be000000-0000-0000-0000-000000000201';
update energy_balance_entries set value = 22800, unit = 'kWh', value_kwh_eq = 22800 where id = 'be000000-0000-0000-0000-000000000202';
update energy_balance_entries set value = 20100, unit = 'kWh', value_kwh_eq = 20100 where id = 'be000000-0000-0000-0000-000000000203';
update energy_balance_entries set value = 13600, unit = 'kWh', value_kwh_eq = 13600 where id = 'be000000-0000-0000-0000-000000000204';

insert into energy_balance_results
  (id, sheet_id, total_input, total_output, unit,
   total_input_kwh_eq, total_output_kwh_eq,
   unaccounted_for, unaccounted_for_kwh_eq, unaccounted_for_pct,
   measurement_coverage, by_utility,
   calculation_mode, is_official, result_status, scope_type, scope_id, utility,
   diagram_id, diagram_version_id, child_diagram_version_ids,
   coverage_breakdown, topology_snapshot, findings, confidence_score) values

  ('bf000000-0000-0000-0000-000000000001',
   'ba000000-0000-0000-0000-000000000001',
   null, null, null,
   1181227, 881250, null, 299977, 25.4, 100.0,
   '{"natural_gas":{"input_kwh":1181227,"output_kwh":0,"label":"GLP"},"steam":{"input_kwh":0,"output_kwh":881250,"label":"Vapor"}}'::jsonb,
   'topology_official', true, 'current', 'area', '7a000000-0000-0000-0000-000000000001', null,
   null, null, '{}'::uuid[],
   '{
      "entry_count":6,
      "measured_count":6,
      "estimated_count":0,
      "manual_count":0,
      "no_data_count":0,
      "measured_input_kwh":1181227,
      "estimated_input_kwh":0,
      "no_data_input_count":0,
      "coverage_percent":100,
      "entries":[]
    }'::jsonb,
   '{
      "diagram_id":"7d000000-0000-0000-0000-000000000002",
      "diagram_name":"Sala de Calderas",
      "diagram_status":"published",
      "diagram_version_id":"7d100000-0000-0000-0000-000000000002",
      "diagram_version_number":1,
      "scope_type":"area",
      "scope_id":"7a000000-0000-0000-0000-000000000001",
      "utility":null,
      "child_diagram_version_ids":[]
    }'::jsonb,
   '[
      {"id":"e7-unexplained-critical","kind":"unexplained_loss","severity":"critical","title":"No explicado alto","detail":"El balance deja 25.4% sin explicar. Conviene revisar perdidas termicas, purgas y medicion de vapor.","target_type":"balance_sheet"},
      {"id":"e7-study-handoff","kind":"study_handoff","severity":"info","title":"Balance listo para estudio","detail":"Resultado oficial disponible para estudio energetico de eficiencia de calderas.","target_type":"balance_sheet"}
    ]'::jsonb,
   78),

  ('bf000000-0000-0000-0000-000000000002',
   'ba000000-0000-0000-0000-000000000002',
   57400, 56500, 'kWh',
   57400, 56500, 900, 900, 1.6, 97.0,
   '{"electricity":{"input_kwh":57400,"output_kwh":56500,"label":"Electricidad"}}'::jsonb,
   'topology_official', true, 'current', 'area', '7a000000-0000-0000-0000-000000000003', 'electricity',
   null, null,
   array['7d100000-0000-0000-0000-000000000004'::uuid],
   '{
      "entry_count":4,
      "measured_count":4,
      "estimated_count":0,
      "manual_count":0,
      "no_data_count":0,
      "measured_input_kwh":57400,
      "estimated_input_kwh":0,
      "no_data_input_count":0,
      "coverage_percent":97,
      "entries":[]
    }'::jsonb,
   '{
      "diagram_id":"7d000000-0000-0000-0000-000000000003",
      "diagram_name":"Nave A",
      "diagram_status":"published",
      "diagram_version_id":"7d100000-0000-0000-0000-000000000003",
      "diagram_version_number":1,
      "scope_type":"area",
      "scope_id":"7a000000-0000-0000-0000-000000000003",
      "utility":"electricity",
      "child_diagram_version_ids":["7d100000-0000-0000-0000-000000000004"]
    }'::jsonb,
   '[
      {"id":"e7-study-handoff","kind":"study_handoff","severity":"info","title":"Balance listo para estudio","detail":"Resultado oficial disponible para estudiar el residual electrico de Nave A.","target_type":"balance_sheet"}
    ]'::jsonb,
   94)

on conflict (id) do nothing;

------------------------------------------------------------
-- Estudios Energeticos E8 — laboratorio antes de EnPI/accion
------------------------------------------------------------
insert into energy_studies
  (id, site_id, title, study_type, scope_type, scope_id, scope_label, utility,
   period_start, period_end, hypothesis, status, confidence_score,
   methodology, workflow_stage, source_balance_result_id, decision_summary) values
  ('ed000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001',
   'Nave A — variable relevante para consumo electrico',
   'area_process_intensity',
   'area', '7a000000-0000-0000-0000-000000000003', 'Area - Nave A',
   'electricity',
   '2025-01-01', '2026-06-30',
   'El consumo electrico de Nave A deberia explicarse principalmente por toneladas producidas; si el residual crece, debe escalar a proyecto de submedicion o control.',
   'decided',
   86,
   'engineering_workbench',
   'handoff',
   'bf000000-0000-0000-0000-000000000002',
   '{"decision":"create_project","reason":"Balance E7 oficial con residual bajo pero oportunidad de mejorar trazabilidad y EnPI por produccion."}'::jsonb)
on conflict (id) do nothing;

insert into energy_study_sources
  (id, study_id, source_type, source_id, label, utility, quantity, unit,
   aggregation_method, data_role, expected_impact, quality_notes, sort_order) values
  ('ed100000-0000-0000-0000-000000000001',
   'ed000000-0000-0000-0000-000000000001',
   'balance_sheet', 'ba000000-0000-0000-0000-000000000002',
   'Balance oficial Nave A — electricidad', 'electricity', 'energy', 'kWh-eq',
   'sum', 'numerator', 'unknown',
   'Fuente preferida E8: balance E7 oficial con version topologica publicada y confianza 94%.',
   0),
  ('ed100000-0000-0000-0000-000000000002',
   'ed000000-0000-0000-0000-000000000001',
   'relevant_variable', 'd1000000-0000-0000-0000-000000000001',
   'Toneladas producidas — Nave A', null, 'production', 'ton',
   'sum', 'denominator', 'neutral',
   'Variable fisicamente plausible para intensidad electrica; requiere vigilancia de mezcla de producto.',
   1)
on conflict (id) do nothing;

insert into energy_study_variable_candidates
  (id, study_id, variable_type, variable_id, label, unit, physical_rationale,
   coverage_percent, correlation_score, stability_score, relevance_score,
   selected, recommendation, statistics, notes) values
  ('ed200000-0000-0000-0000-000000000001',
   'ed000000-0000-0000-0000-000000000001',
   'relevant_variable', 'd1000000-0000-0000-0000-000000000001',
   'Toneladas producidas — Nave A', 'ton',
   'Driver primario: la carga electrica de Nave A escala con volumen producido.',
   100, 0.82, 88, 90, true, 'primary_driver',
   '{"validPointCount":18,"numeratorPointCount":18,"denominatorPointCount":18,"ratioCvPercent":12.1}'::jsonb,
   'Seleccionada para EnPI kWh/ton y baseline inicial.'),
  ('ed200000-0000-0000-0000-000000000002',
   'ed000000-0000-0000-0000-000000000001',
   'relevant_variable', 'd1000000-0000-0000-0000-000000000005',
   'Horas operación calderas', 'horas',
   'Variable secundaria; no explica directamente Nave A, pero puede capturar demanda de vapor auxiliar.',
   100, 0.28, 70, 57, false, 'monitor_only',
   '{"validPointCount":18,"numeratorPointCount":18,"denominatorPointCount":18,"ratioCvPercent":25.4}'::jsonb,
   'Mantener como contexto, no como denominador principal.')
on conflict (id) do nothing;

insert into energy_study_models
  (id, study_id, model_type, formula, coefficients, statistics, assumptions,
   output_unit, quality_score, is_selected) values
  ('ed300000-0000-0000-0000-000000000001',
   'ed000000-0000-0000-0000-000000000001',
   'ratio',
   '{"modelId":"ratio","formula":"kWh Nave A / ton producida"}'::jsonb,
   null,
   '{"coverage":100,"validPointCount":18,"latestValue":67.2,"deltaPercent":-1.8}'::jsonb,
   '{"assumptions":["Energia y produccion se agregan mensualmente.","No ajusta mezcla de producto."]}'::jsonb,
   'kWh/ton', 86, true),
  ('ed300000-0000-0000-0000-000000000002',
   'ed000000-0000-0000-0000-000000000001',
   'regression_simple',
   '{"modelId":"regression_simple","formula":"E = base + b * ton"}'::jsonb,
   '{"intercept_kwh":8200,"slope_kwh_per_ton":58.4,"r2":0.78}'::jsonb,
   '{"coverage":100,"validPointCount":18,"r2":0.78}'::jsonb,
   '{"assumptions":["Toneladas explican la carga variable.","El intercepto representa carga base de servicios auxiliares."]}'::jsonb,
   'kWh', 82, false),
  ('ed300000-0000-0000-0000-000000000003',
   'ed000000-0000-0000-0000-000000000001',
   'cusum',
   '{"modelId":"cusum_watch","formula":"CUSUM contra promedio historico kWh/ton"}'::jsonb,
   null,
   '{"coverage":100,"validPointCount":18,"referenceValue":69.1}'::jsonb,
   '{"assumptions":["Vigilancia inicial, no M&V cerrada sin baseline aprobado."]}'::jsonb,
   'kWh/ton', 76, false)
on conflict (id) do nothing;

insert into energy_study_findings
  (id, study_id, finding_type, severity, confidence, title, description, evidence) values
  ('ed400000-0000-0000-0000-000000000001',
   'ed000000-0000-0000-0000-000000000001',
   'insight', 'low', 'high',
   'Toneladas producidas es el driver primario defendible',
   'La variable tiene cobertura completa, correlacion alta y estabilidad suficiente para promover EnPI inicial.',
   '{"variable_candidate_id":"ed200000-0000-0000-0000-000000000001"}'::jsonb),
  ('ed400000-0000-0000-0000-000000000002',
   'ed000000-0000-0000-0000-000000000001',
   'opportunity', 'medium', 'medium',
   'Proyecto de submedicion y control fino',
   'Aunque el balance E7 cierra bien, el estudio recomienda proyecto para separar cargas auxiliares, mezcla y oportunidades de control.',
   '{"balance_result_id":"bf000000-0000-0000-0000-000000000002"}'::jsonb)
on conflict (id) do nothing;

insert into energy_study_decisions
  (id, study_id, decision_type, target_id, notes, work_type, decision_payload) values
  ('ed500000-0000-0000-0000-000000000001',
   'ed000000-0000-0000-0000-000000000001',
   'create_project',
   '50000000-0000-0000-0000-000000000004',
   'Crear proyecto estructurado para submedicion y control energetico de Nave A.',
   'project',
   '{"selected_model":"ratio","selected_variable":"d1000000-0000-0000-0000-000000000001","confidenceScore":86}'::jsonb)
on conflict (id) do nothing;

update energy_studies set
  case_type = 'balance_investigation',
  priority = 'high',
  due_date = '2026-07-31',
  status = 'decision_pending',
  workflow_stage = 'decision',
  data_sufficiency_status = 'defensible',
  data_quality_summary = '{
    "coverage":"100% energia y variable relevante",
    "boundary":"Balance E7 oficial publicado",
    "risk":"No ajusta mezcla de producto",
    "recommendation":"Crear proyecto y conservar EnPI inicial"
  }'::jsonb,
  final_decision_type = 'create_project',
  final_decision_target_id = '50000000-0000-0000-0000-000000000004',
  closure_summary = 'El expediente recomienda proyecto de submedicion y control para Nave A, manteniendo kWh/ton como EnPI gobernado.'
where id = 'ed000000-0000-0000-0000-000000000001';

insert into energy_study_activities
  (id, study_id, title, description, activity_type, status, due_date, completed_at, notes, sort_order) values
  ('e1300000-0000-0000-0000-000000000001',
   'ed000000-0000-0000-0000-000000000001',
   'Confirmar frontera Nave A con produccion',
   'Validar que el balance oficial cubre las lineas y cargas auxiliares incluidas en Nave A.',
   'operations_review', 'completed', '2026-06-10', now(),
   'Frontera confirmada con balance E7 publicado y diagrama Nave A.',
   1),
  ('e1300000-0000-0000-0000-000000000002',
   'ed000000-0000-0000-0000-000000000001',
   'Validar medicion electrica y variable relevante',
   'Comparar balance electrico mensual contra toneladas producidas y revisar cobertura de lecturas.',
   'data_validation', 'completed', '2026-06-12', now(),
   'Cobertura completa para energia y produccion en el periodo analizado.',
   2),
  ('e1300000-0000-0000-0000-000000000003',
   'ed000000-0000-0000-0000-000000000001',
   'Evaluar modelo kWh/ton y regresion simple',
   'Comparar ratio operativo, mejor periodo, regresion simple y CUSUM inicial.',
   'analysis', 'completed', '2026-06-14', now(),
   'El ratio kWh/ton es suficiente para EnPI inicial; la regresion mejora explicacion pero requiere seguimiento.',
   3),
  ('e1300000-0000-0000-0000-000000000004',
   'ed000000-0000-0000-0000-000000000001',
   'Definir salida operativa',
   'Decidir si el estudio termina en EnPI, medicion, accion rapida o proyecto.',
   'decision', 'in_progress', '2026-06-18', null,
   'Proyecto recomendado por necesidad de submedicion y control fino.',
   4)
on conflict (id) do nothing;

insert into energy_study_evidence
  (id, study_id, activity_id, evidence_type, title, description, url, metadata) values
  ('e1310000-0000-0000-0000-000000000001',
   'ed000000-0000-0000-0000-000000000001',
   'e1300000-0000-0000-0000-000000000001',
   'balance_snapshot',
   'Balance oficial Nave A — electricidad',
   'Resultado E7 usado como fuente principal del expediente.',
   null,
   '{"balance_result_id":"bf000000-0000-0000-0000-000000000002","confidence":94}'::jsonb),
  ('e1310000-0000-0000-0000-000000000002',
   'ed000000-0000-0000-0000-000000000001',
   'e1300000-0000-0000-0000-000000000003',
   'trend_capture',
   'Tendencia kWh/ton Nave A',
   'Comparacion mensual entre consumo electrico y toneladas producidas.',
   null,
   '{"enpi_id":"22000000-0000-0000-0000-000000000002","variable_id":"d1000000-0000-0000-0000-000000000001"}'::jsonb),
  ('e1310000-0000-0000-0000-000000000003',
   'ed000000-0000-0000-0000-000000000001',
   null,
   'cmms_reference',
   'Referencia de proyecto derivado',
   'Proyecto de submedicion y control creado desde el expediente.',
   null,
   '{"improvement_id":"50000000-0000-0000-0000-000000000004"}'::jsonb)
on conflict (id) do nothing;

insert into energy_study_events
  (id, study_id, event_type, title, description, new_state, created_at) values
  ('e1320000-0000-0000-0000-000000000001',
   'ed000000-0000-0000-0000-000000000001',
   'created',
   'Expediente creado desde balance oficial',
   'El residual de Nave A se convierte en estudio tecnico de explicacion y decision.',
   '{"source":"balance_result","source_id":"bf000000-0000-0000-0000-000000000002"}'::jsonb,
   now() - interval '5 days'),
  ('e1320000-0000-0000-0000-000000000002',
   'ed000000-0000-0000-0000-000000000001',
   'sufficiency_updated',
   'Suficiencia defensible',
   'Energia, variable relevante, balance y frontera tienen cobertura suficiente.',
   '{"data_sufficiency_status":"defensible"}'::jsonb,
   now() - interval '4 days'),
  ('e1320000-0000-0000-0000-000000000003',
   'ed000000-0000-0000-0000-000000000001',
   'finding_added',
   'Driver primario confirmado',
   'Toneladas producidas explica el comportamiento general, con brecha de submedicion para cargas auxiliares.',
   '{"finding_id":"ed400000-0000-0000-0000-000000000001"}'::jsonb,
   now() - interval '3 days'),
  ('e1320000-0000-0000-0000-000000000004',
   'ed000000-0000-0000-0000-000000000001',
   'decision_recorded',
   'Decision final: crear proyecto',
   'El expediente deriva en proyecto de submedicion y control energetico Nave A.',
   '{"target_id":"50000000-0000-0000-0000-000000000004","decision_type":"create_project"}'::jsonb,
   now() - interval '2 days')
on conflict (id) do nothing;

------------------------------------------------------------
-- EnPIs — basados en MPs del árbol
------------------------------------------------------------
insert into energy_enpis (id, site_id, name, utility, formula, unit, scope, frequency) values
  ('22000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001',
   'Nm³ GLP por tonelada de vapor generada',
   'natural_gas',
   '{"numerator":"GLP total calderas","denominator":"kg vapor total"}',
   'Nm3/ton-vapor', 'site', 'monthly'),
  ('22000000-0000-0000-0000-000000000002',
   '40000000-0000-0000-0000-000000000001',
   'kWh por tonelada producida — Nave A',
   'electricity',
   '{"numerator":"EM-NAVE-A","denominator":"ton_prod"}',
   'kWh/ton', 'area', 'monthly')
on conflict (id) do nothing;

update energy_enpis set
  numerator_type     = 'measurement_point',
  numerator_ref_id   = '7c000000-0000-0000-0000-000000000002',
  denominator_type   = 'formula',
  denominator_ref_id = null
where id = '22000000-0000-0000-0000-000000000001';

update energy_enpis set
  numerator_type     = 'measurement_point',
  numerator_ref_id   = '7c000000-0000-0000-0000-000000000011',
  denominator_type   = 'relevant_variable',
  denominator_ref_id = 'd1000000-0000-0000-0000-000000000001'
where id = '22000000-0000-0000-0000-000000000002';

insert into energy_enpi_groups
  (id, site_id, name, code, description, group_type, utility_type, scope_type, scope_id, sort_order) values
  ('e1100000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001',
   'Eléctricos', 'ENPIG-ELEC',
   'Indicadores de consumo e intensidad eléctrica.',
   'utility', 'electricity', 'site', '40000000-0000-0000-0000-000000000001', 10),
  ('e1100000-0000-0000-0000-000000000002',
   '40000000-0000-0000-0000-000000000001',
   'Vapor y combustión', 'ENPIG-VAPOR',
   'Indicadores térmicos, calderas y generación de vapor.',
   'utility', 'steam', 'energy_group', '7b000000-0000-0000-0000-000000000001', 20),
  ('e1100000-0000-0000-0000-000000000003',
   '40000000-0000-0000-0000-000000000001',
   'Línea A producción', 'ENPIG-LINEA-A',
   'Indicadores operativos de la Nave A y sus subprocesos.',
   'line', null, 'energy_group', '7b000000-0000-0000-0000-000000000003', 30),
  ('e1100000-0000-0000-0000-000000000004',
   '40000000-0000-0000-0000-000000000001',
   'Prioritarios SGEn', 'ENPIG-SGEN-PRI',
   'Indicadores gobernados como prioritarios para seguimiento directivo.',
   'sgen', null, 'site', '40000000-0000-0000-0000-000000000001', 40)
on conflict (id) do nothing;

update energy_enpis
set primary_group_id = 'e1100000-0000-0000-0000-000000000002',
    calculation_frequency = 'monthly',
    aggregation_window = 'calendar_month',
    normalization_basis = '{"numeratorAggregation":"sum","denominatorAggregation":"sum"}'::jsonb
where id = '22000000-0000-0000-0000-000000000001';

update energy_enpis
set primary_group_id = 'e1100000-0000-0000-0000-000000000001',
    calculation_frequency = 'monthly',
    aggregation_window = 'calendar_month',
    normalization_basis = '{"numeratorAggregation":"sum","denominatorAggregation":"sum"}'::jsonb
where id = '22000000-0000-0000-0000-000000000002';

insert into energy_enpi_group_members (group_id, enpi_id, membership_role, sort_order) values
  ('e1100000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', 'primary', 10),
  ('e1100000-0000-0000-0000-000000000004', '22000000-0000-0000-0000-000000000001', 'reporting', 10),
  ('e1100000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000002', 'primary', 10),
  ('e1100000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000002', 'portfolio', 20),
  ('e1100000-0000-0000-0000-000000000004', '22000000-0000-0000-0000-000000000002', 'reporting', 20)
on conflict do nothing;

insert into energy_enpi_variable_links
  (enpi_id, variable_id, link_role, is_required, aggregation_method, notes) values
  ('22000000-0000-0000-0000-000000000001',
   'd1000000-0000-0000-0000-000000000005',
   'driver', true, 'sum',
   'Horas de operación para interpretar consumo térmico y régimen de calderas.'),
  ('22000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000001',
   'denominator', true, 'sum',
   'Variable base del EnPI kWh/ton.'),
  ('22000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000003',
   'context', false, 'avg',
   'Contexto climático para interpretar desviaciones.'),
  ('22000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000004',
   'context', false, 'avg',
   'Ocupación operativa como variable contextual.'),
  ('22000000-0000-0000-0000-000000000002',
   'd1000000-0000-0000-0000-000000000006',
   'adjustment', false, 'last',
   'Base alternativa para indicadores kWh/m2 si se analiza climatización.')
on conflict do nothing;

insert into energy_baselines (enpi_id, version, method, value, unit, reference_period_start, reference_period_end) values
  ('22000000-0000-0000-0000-000000000001', 1, 'average', 0.128, 'Nm3/kg-vapor', '2025-01-01', '2025-06-30'),
  ('22000000-0000-0000-0000-000000000002', 1, 'average', 72.5,  'kWh/ton',      '2025-01-01', '2025-06-30')
on conflict do nothing;

insert into energy_targets (enpi_id, name, target_type, target_value, unit, deadline) values
  ('22000000-0000-0000-0000-000000000001', 'Reducir consumo GLP 5%', 'absolute_value', 0.122, 'Nm3/kg-vapor', '2026-12-31'),
  ('22000000-0000-0000-0000-000000000002', 'Reducir consumo eléctrico 8%', 'absolute_value', 66.7, 'kWh/ton', '2026-12-31')
on conflict do nothing;

------------------------------------------------------------
-- Acciones de mejora
------------------------------------------------------------
insert into energy_improvements
  (id, site_id, work_type, title, description, status, priority, category, utility,
   estimated_energy_savings, savings_unit, estimated_cost_savings,
   estimated_investment, currency, payback_months, planned_start, planned_finish) values

  ('50000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001',
   'quick_action', 'Optimizar combustión calderas (O₂ trim)',
   'Ajustar exceso de aire en CAL-001, CAL-002 y CAL-003 para llevar O₂ de salida a 3-4%. '
   'Se espera reducir consumo de GLP 4-6% sin afectar producción de vapor.',
   'in_progress', 'high', 'efficiency', 'steam',
   85000, 'Nm3', 51000, 3500, 'USD', 1, '2026-05-01', '2026-07-31'),

  ('50000000-0000-0000-0000-000000000002',
   '40000000-0000-0000-0000-000000000001',
   'project', 'Recuperación condensado calderas',
   'Instalar trampas de vapor y línea de retorno para recuperar condensado al tanque '
   'de agua de alimentación. Ahorro energético + reducción de consumo de agua.',
   'identified', 'high', 'efficiency', 'steam',
   120000, 'kg-vapor', 72000, 28000, 'USD', 5, '2026-07-01', '2026-12-31'),

  ('50000000-0000-0000-0000-000000000003',
   '40000000-0000-0000-0000-000000000001',
   'quick_action', 'Reparar fugas de agua en Nave A',
  'Detectadas 3 fugas en la red de agua industrial de Nave A. '
  'Reparar uniones y válvulas defectuosas.',
  'approved', 'medium', 'leakage', 'industrial_water',
   18000, 'm3', 9000, 800, 'USD', 1, '2026-06-15', '2026-07-15'),

  ('50000000-0000-0000-0000-000000000004',
   '40000000-0000-0000-0000-000000000001',
   'project', 'Submedición y control energético Nave A',
   'Proyecto creado desde el estudio E8 de consumo eléctrico de Nave A. '
   'Busca separar cargas auxiliares, validar kWh/ton y preparar M&V.',
   'planned', 'high', 'measurement', 'electricity',
   42000, 'kWh', 6300, 18000, 'USD', 34, '2026-07-01', '2026-11-30')

on conflict (id) do nothing;

update energy_improvements
set source_study_id = 'ed000000-0000-0000-0000-000000000001',
    source_study_model_id = 'ed300000-0000-0000-0000-000000000001'
where id = '50000000-0000-0000-0000-000000000004';

insert into energy_improvement_projects
  (id, improvement_id, project_code, scope, business_case, assumptions, risk_notes) values
  ('51000000-0000-0000-0000-000000000004',
   '50000000-0000-0000-0000-000000000004',
   'PRJ-NAVE-A-E8',
   'Area - Nave A',
   'Proyecto originado por estudio E8 con balance E7 oficial, driver primario toneladas producidas y oportunidad de mejorar trazabilidad energetica.',
   'El ratio kWh/ton es defendible como EnPI inicial; la regresion simple sugiere carga base relevante.',
   'Riesgo: mezcla de producto y cargas auxiliares pueden sesgar el EnPI si no se submiden.')
on conflict (id) do nothing;

insert into energy_project_phases
  (id, improvement_id, "order", name, description, status, budget, progress,
   planned_start, planned_finish) values
  ('52000000-0000-0000-0000-000000000041',
   '50000000-0000-0000-0000-000000000004',
   1, 'Ingenieria y alcance',
   'Confirmar frontera, medidores requeridos y baseline kWh/ton.',
   'pending', 2500, 0, '2026-07-01', '2026-07-31'),
  ('52000000-0000-0000-0000-000000000042',
   '50000000-0000-0000-0000-000000000004',
   2, 'Implementacion',
   'Instalar submedicion y ajustes de control en cargas auxiliares.',
   'pending', 13000, 0, '2026-08-01', '2026-10-15'),
  ('52000000-0000-0000-0000-000000000043',
   '50000000-0000-0000-0000-000000000004',
   3, 'M&V y cierre',
   'Validar ahorro, actualizar EnPI y generar evidencia SGEn.',
   'pending', 2500, 0, '2026-10-16', '2026-11-30')
on conflict (id) do nothing;

insert into energy_project_tasks
  (id, improvement_id, phase_id, title, status, priority, planned_date) values
  ('53000000-0000-0000-0000-000000000041',
   '50000000-0000-0000-0000-000000000004',
   '52000000-0000-0000-0000-000000000041',
   'Validar puntos de submedicion y tablero electrico Nave A', 'pending', 'high', '2026-07-10'),
  ('53000000-0000-0000-0000-000000000042',
   '50000000-0000-0000-0000-000000000004',
   '52000000-0000-0000-0000-000000000042',
   'Instalar medidores auxiliares y probar lecturas manuales/API futura', 'pending', 'high', '2026-08-20'),
  ('53000000-0000-0000-0000-000000000043',
   '50000000-0000-0000-0000-000000000004',
   '52000000-0000-0000-0000-000000000043',
   'Comparar nuevo balance E7 contra baseline kWh/ton', 'pending', 'normal', '2026-11-10')
on conflict (id) do nothing;

------------------------------------------------------------
-- E9 — Ejecucion, M&V formal y handoff Maint/CMMS
------------------------------------------------------------
update energy_improvements
set mv_plan_status = 'approved',
    cmms_handoff_status = 'work_order_created',
    audit_status = 'open',
    measurement_verification_method = 'baseline_model'
where id = '50000000-0000-0000-0000-000000000004';

insert into energy_mv_plans
  (id, improvement_id, version, status, method, baseline_source_type,
   baseline_source_id, baseline_period_start, baseline_period_end,
   verification_period_start, verification_period_end, expected_savings,
   expected_savings_unit, acceptance_criteria, calculation_notes,
   confidence_score, evidence_ref) values
  ('54000000-0000-0000-0000-000000000041',
   '50000000-0000-0000-0000-000000000004',
   1, 'approved', 'baseline_model', 'balance_result',
   'bf000000-0000-0000-0000-000000000002',
   '2025-01-01', '2026-06-30',
   '2026-10-16', '2026-11-30',
   42000, 'kWh',
   'Aceptar si el balance oficial posterior y el EnPI kWh/ton sostienen al menos 80% del ahorro esperado durante la ventana M&V.',
   'Baseline E9 derivado de balance oficial E7 y estudio E8; ajustar por toneladas producidas antes de cierre.',
   86,
   '{"balance_result_id":"bf000000-0000-0000-0000-000000000002","study_id":"ed000000-0000-0000-0000-000000000001","study_model_id":"ed300000-0000-0000-0000-000000000001"}'::jsonb)
on conflict (id) do nothing;

insert into energy_cmms_handoff_requests
  (id, site_id, improvement_id, request_direction, request_type, status,
   title, description, energy_rationale, estimated_savings, savings_unit,
   maintenance_priority, cmms_external_request_id, cmms_work_order_id,
   cmms_response, requested_at, decided_at) values
  ('55000000-0000-0000-0000-000000000041',
   '40000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000004',
   'energy_to_cmms', 'efficiency_work_request', 'work_order_created',
   'Instalar submedicion y validar tablero Nave A',
   'Energy solicita a Maint/CMMS ejecutar instalacion fisica, bloqueo seguro y pruebas de señales para el proyecto Nave A.',
   'El estudio E8 y el balance E7 justifican submedicion para sostener kWh/ton y encontrar cargas auxiliares.',
   42000, 'kWh', 'high',
   'VM-REQ-2026-0007', 'VM-WO-2026-0007',
   '{"cmms_owner":"maintenance","energy_owner":"m_and_v","asset_stewardship":"cmms_master"}'::jsonb,
   '2026-06-20 09:00:00+00', '2026-06-21 15:00:00+00'),

  ('55000000-0000-0000-0000-000000000042',
   '40000000-0000-0000-0000-000000000001',
   null,
   'cmms_to_energy', 'energy_improvement_feedback', 'completed',
   'Feedback CMMS: aislamiento termico deteriorado en linea vapor Nave A',
   'Durante una inspeccion de mantenimiento se encontro aislamiento deteriorado en la linea de vapor hacia Nave A.',
   'Mantenimiento reporta oportunidad energetica: perdida termica visible y temperatura superficial alta.',
   18000, 'kWh-eq', 'medium',
   'VM-REQ-2026-0012', 'VM-WO-2026-0012',
   '{"cmms_finding":"insulation_degraded","recommended_energy_action":"estimate_heat_loss_and_prioritize_repair"}'::jsonb,
   '2026-06-18 13:00:00+00', '2026-06-19 10:00:00+00')
on conflict (id) do nothing;

insert into energy_improvements
  (id, site_id, work_type, title, description, status, priority, category,
   utility, estimated_energy_savings, savings_unit, estimated_cost_savings,
   estimated_investment, currency, payback_months, planned_start,
   planned_finish, mv_plan_status, cmms_handoff_status, audit_status,
   measurement_verification_method) values
  ('50000000-0000-0000-0000-000000000005',
   '40000000-0000-0000-0000-000000000001',
   'quick_action',
   'Corregir aislamiento termico reportado por Maint',
   'Mejora energetica nacida desde feedback de CMMS/maintenance. Energy cuantifica perdida, prioriza y verifica ahorro; Maint gobierna la OT fisica.',
   'approved', 'medium', 'maintenance', 'steam',
   18000, 'kWh-eq', 2700, 1200, 'USD', 5,
   '2026-06-20', '2026-07-15',
   'draft', 'completed', 'open', 'engineering_estimate')
on conflict (id) do nothing;

update energy_cmms_handoff_requests
set improvement_id = '50000000-0000-0000-0000-000000000005'
where id = '55000000-0000-0000-0000-000000000042';

insert into energy_improvement_events
  (id, improvement_id, site_id, event_type, source_type, source_id,
   previous_state, new_state, notes, created_at) values
  ('56000000-0000-0000-0000-000000000041',
   '50000000-0000-0000-0000-000000000004',
   '40000000-0000-0000-0000-000000000001',
   'created_from_study', 'study', 'ed000000-0000-0000-0000-000000000001',
   '{}'::jsonb, '{"target":"project","source_balance_result_id":"bf000000-0000-0000-0000-000000000002"}'::jsonb,
   'Proyecto creado desde estudio E8 con balance oficial E7.', '2026-06-20 08:00:00+00'),
  ('56000000-0000-0000-0000-000000000042',
   '50000000-0000-0000-0000-000000000004',
   '40000000-0000-0000-0000-000000000001',
   'mv_plan_defined', 'mv_plan', '54000000-0000-0000-0000-000000000041',
   '{}'::jsonb, '{"status":"approved","method":"baseline_model"}'::jsonb,
   'Plan M&V definido con baseline de balance E7 y driver toneladas producidas.', '2026-06-20 08:15:00+00'),
  ('56000000-0000-0000-0000-000000000043',
   '50000000-0000-0000-0000-000000000004',
   '40000000-0000-0000-0000-000000000001',
   'sent_to_cmms', 'handoff', '55000000-0000-0000-0000-000000000041',
   '{}'::jsonb, '{"status":"requested","request_type":"efficiency_work_request"}'::jsonb,
   'Energy solicita ejecucion fisica; CMMS conserva gobierno de OT.', '2026-06-20 09:00:00+00'),
  ('56000000-0000-0000-0000-000000000044',
   '50000000-0000-0000-0000-000000000004',
   '40000000-0000-0000-0000-000000000001',
   'cmms_work_order_created', 'cmms', '55000000-0000-0000-0000-000000000041',
   '{"status":"requested"}'::jsonb, '{"status":"work_order_created","cmms_work_order_id":"VM-WO-2026-0007"}'::jsonb,
   'Maint/CMMS crea OT para instalacion y pruebas de submedicion.', '2026-06-21 15:00:00+00'),
  ('56000000-0000-0000-0000-000000000045',
   '50000000-0000-0000-0000-000000000005',
   '40000000-0000-0000-0000-000000000001',
   'cmms_feedback_received', 'cmms', '55000000-0000-0000-0000-000000000042',
   '{}'::jsonb, '{"cmms_work_order_id":"VM-WO-2026-0012","finding":"insulation_degraded"}'::jsonb,
   'Mantenimiento reporta hallazgo con impacto energetico potencial.', '2026-06-19 10:00:00+00'),
  ('56000000-0000-0000-0000-000000000046',
   '50000000-0000-0000-0000-000000000005',
   '40000000-0000-0000-0000-000000000001',
   'energy_followup_required', 'cmms', '55000000-0000-0000-0000-000000000042',
   '{}'::jsonb, '{"action":"estimate_heat_loss_and_verify_savings"}'::jsonb,
   'Energy abre accion para cuantificar perdida termica y verificar mejora.', '2026-06-19 11:00:00+00')
on conflict (id) do nothing;

------------------------------------------------------------
-- SGEn
------------------------------------------------------------
insert into sgen_scopes (id, site_id, name, description, boundaries, included_utilities, status, version) values
  ('60000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001',
   'SGEn Planta Industrial Demo v1',
   'Sistema de Gestión de la Energía para la planta completa, incluyendo calderas, pozos y naves de producción.',
   'Planta Industrial Demo completa: Sala de Calderas, Sala de Pozos, Naves A/B/C e Infraestructura.',
   '{electricity,steam,natural_gas,industrial_water}', 'approved', 1)
on conflict (id) do nothing;

insert into sgen_significant_uses
  (id, site_id, name, utility, equipment_id, consumption_value, cost_value,
   significance_score, significance_rationale, status) values
  ('33000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001',
   'Calderas CAL-001/002/003 — GLP',
   'natural_gas', '7e000000-0000-0000-0000-000000000002',
   3200000, 512000, 94,
   'Principal consumo de GLP de la planta. Las 3 calderas representan el 100% '
   'del consumo de gas. Alta prioridad de optimización.',
   'active'),
  ('33000000-0000-0000-0000-000000000002',
   '40000000-0000-0000-0000-000000000001',
   'Nave A — consumo eléctrico',
   'electricity', '7e000000-0000-0000-0000-000000000010',
   1800000, 144000, 82,
   'Nave A representa el mayor consumo eléctrico individual. '
   'Llenado y pasteurización son equipos de alta demanda.',
   'active')
on conflict (id) do nothing;

insert into sgen_evidence
  (id, site_id, title, description, domain, linked_entity_type, linked_entity_id,
   source_type, status) values
  ('70000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001',
   'Balance calderas GLP→vapor — Junio 2026',
   'Eficiencia térmica estimada 74.6%: 1,181,227 kWh-eq GLP → 881,250 kWh-eq vapor. '
   'No explicado 25.4% incluye purgas, pérdidas en distribución y paredes.',
   'energy_review', 'balance', 'ba000000-0000-0000-0000-000000000001',
   'system_snapshot', 'accepted'),
  ('70000000-0000-0000-0000-000000000002',
   '40000000-0000-0000-0000-000000000001',
   'Acción: Optimizar combustión calderas',
   'Acción aprobada para reducir consumo GLP 4-6% ajustando exceso de aire.',
   'actions', 'improvement', '50000000-0000-0000-0000-000000000001',
   'system_snapshot', 'accepted')
on conflict (id) do nothing;

insert into sgen_legal_notices (site_id, notice_type, title, body, version, acknowledged) values
  ('40000000-0000-0000-0000-000000000001', 'legal', 'Aviso de alcance — SGEn',
   'VersaEnergy proporciona herramientas operativas de gestion energetica. Organiza evidencia, '
   'responsabilidades, acciones, revisiones y seguimiento ejecutivo. Cada organizacion conserva '
   'la responsabilidad de sus compromisos externos, auditorias, criterios internos y decisiones formales.',
   '1.0.0', false)
on conflict do nothing;

------------------------------------------------------------
-- Nivel 3 — Equipos Nave B, Nave C + MPs faltantes A2/A3
-- UUIDs: 7e…0020-0034 (equipo), 7c…0029-0047 (MP)
------------------------------------------------------------

-- ── Nuevo equipo ──────────────────────────────────────────────────────────────
insert into energy_equipment
  (id, site_id, tag, name, equipment_type, utility_type, area_id, status) values
  -- Nave B · B1 Mezclado
  ('7e000000-0000-0000-0000-000000000020','40000000-0000-0000-0000-000000000001',
   'AGI-B1-001','Agitador 1 Mezclado','consumer','electricity','7b000000-0000-0000-0000-000000000004','active'),
  ('7e000000-0000-0000-0000-000000000021','40000000-0000-0000-0000-000000000001',
   'AGI-B1-002','Agitador 2 Mezclado','consumer','electricity','7b000000-0000-0000-0000-000000000004','active'),
  ('7e000000-0000-0000-0000-000000000022','40000000-0000-0000-0000-000000000001',
   'BOM-B1-001','Bomba de mezcla','pump','electricity','7b000000-0000-0000-0000-000000000004','active'),
  -- Nave B · B2 Cocimiento
  ('7e000000-0000-0000-0000-000000000023','40000000-0000-0000-0000-000000000001',
   'MAR-B2-001','Marmita de cocimiento 1','heat_exchanger','steam','7b000000-0000-0000-0000-000000000005','active'),
  ('7e000000-0000-0000-0000-000000000024','40000000-0000-0000-0000-000000000001',
   'MAR-B2-002','Marmita de cocimiento 2','heat_exchanger','steam','7b000000-0000-0000-0000-000000000005','active'),
  ('7e000000-0000-0000-0000-000000000025','40000000-0000-0000-0000-000000000001',
   'BOM-B2-001','Bomba de proceso Cocimiento','pump','electricity','7b000000-0000-0000-0000-000000000005','active'),
  -- Nave B · B3 Enfriamiento
  ('7e000000-0000-0000-0000-000000000026','40000000-0000-0000-0000-000000000001',
   'CHI-B3-001','Chiller Nave B','chiller','electricity','7b000000-0000-0000-0000-000000000006','active'),
  ('7e000000-0000-0000-0000-000000000027','40000000-0000-0000-0000-000000000001',
   'AHU-B3-001','AHU Nave B','consumer','electricity','7b000000-0000-0000-0000-000000000006','active'),
  ('7e000000-0000-0000-0000-000000000028','40000000-0000-0000-0000-000000000001',
   'BOM-B3-001','Bomba de frío Nave B','pump','electricity','7b000000-0000-0000-0000-000000000006','active'),
  -- Nave C · C1 Laboratorio
  ('7e000000-0000-0000-0000-000000000029','40000000-0000-0000-0000-000000000001',
   'ANA-C1-001','Analizador de calidad','consumer','electricity','7b000000-0000-0000-0000-000000000007','active'),
  ('7e000000-0000-0000-0000-000000000030','40000000-0000-0000-0000-000000000001',
   'INC-C1-001','Incubadora','consumer','electricity','7b000000-0000-0000-0000-000000000007','active'),
  -- Nave C · C2 Mantenimiento
  ('7e000000-0000-0000-0000-000000000031','40000000-0000-0000-0000-000000000001',
   'COM-C2-001','Compresor taller','compressor','electricity','7b000000-0000-0000-0000-000000000008','active'),
  ('7e000000-0000-0000-0000-000000000032','40000000-0000-0000-0000-000000000001',
   'TOR-C2-001','Torno CNC','consumer','electricity','7b000000-0000-0000-0000-000000000008','active'),
  -- Nave C · C3 Almacén
  ('7e000000-0000-0000-0000-000000000033','40000000-0000-0000-0000-000000000001',
   'CAM-C3-001','Cámara fría','consumer','electricity','7b000000-0000-0000-0000-000000000009','active'),
  ('7e000000-0000-0000-0000-000000000034','40000000-0000-0000-0000-000000000001',
   'MON-C3-001','Montacargas eléctrico','consumer','electricity','7b000000-0000-0000-0000-000000000009','active')
on conflict (id) do nothing;

-- ── Puntos de medición ────────────────────────────────────────────────────────
insert into measurement_points
  (id, site_id, tag, name, target_type, target_id, utility,
   measurement_type, quantity, unit, source_type) values
  -- A2 equipo sin MP previo
  ('7c000000-0000-0000-0000-000000000029','40000000-0000-0000-0000-000000000001',
   'FM-VAP-PAST','Medidor vapor Pasteurizador',
   'equipment','7e000000-0000-0000-0000-000000000016','steam','accumulator','mass','kg','iot_db'),
  ('7c000000-0000-0000-0000-000000000030','40000000-0000-0000-0000-000000000001',
   'EM-BOM-CIR','Medidor eléctrico Bomba circulación',
   'equipment','7e000000-0000-0000-0000-000000000017','electricity','accumulator','energy','kWh','iot_db'),
  -- A3 equipo sin MP previo
  ('7c000000-0000-0000-0000-000000000031','40000000-0000-0000-0000-000000000001',
   'EM-TERMO','Medidor eléctrico Termoformadora',
   'equipment','7e000000-0000-0000-0000-000000000018','electricity','accumulator','energy','kWh','iot_db'),
  ('7c000000-0000-0000-0000-000000000032','40000000-0000-0000-0000-000000000001',
   'EM-PALET','Medidor eléctrico Paletizador',
   'equipment','7e000000-0000-0000-0000-000000000019','electricity','accumulator','energy','kWh','iot_db'),
  -- B1 Mezclado
  ('7c000000-0000-0000-0000-000000000033','40000000-0000-0000-0000-000000000001',
   'EM-AGI-B1-001','Medidor Agitador 1',
   'equipment','7e000000-0000-0000-0000-000000000020','electricity','accumulator','energy','kWh','iot_db'),
  ('7c000000-0000-0000-0000-000000000034','40000000-0000-0000-0000-000000000001',
   'EM-AGI-B1-002','Medidor Agitador 2',
   'equipment','7e000000-0000-0000-0000-000000000021','electricity','accumulator','energy','kWh','iot_db'),
  ('7c000000-0000-0000-0000-000000000035','40000000-0000-0000-0000-000000000001',
   'EM-BOM-B1-001','Medidor Bomba mezcla',
   'equipment','7e000000-0000-0000-0000-000000000022','electricity','accumulator','energy','kWh','iot_db'),
  -- B2 Cocimiento
  ('7c000000-0000-0000-0000-000000000036','40000000-0000-0000-0000-000000000001',
   'FM-MAR-B2-001','Medidor vapor Marmita 1',
   'equipment','7e000000-0000-0000-0000-000000000023','steam','accumulator','mass','kg','iot_db'),
  ('7c000000-0000-0000-0000-000000000037','40000000-0000-0000-0000-000000000001',
   'FM-MAR-B2-002','Medidor vapor Marmita 2',
   'equipment','7e000000-0000-0000-0000-000000000024','steam','accumulator','mass','kg','iot_db'),
  ('7c000000-0000-0000-0000-000000000038','40000000-0000-0000-0000-000000000001',
   'EM-BOM-B2-001','Medidor Bomba proceso',
   'equipment','7e000000-0000-0000-0000-000000000025','electricity','accumulator','energy','kWh','iot_db'),
  -- B3 Enfriamiento
  ('7c000000-0000-0000-0000-000000000039','40000000-0000-0000-0000-000000000001',
   'EM-CHI-B3-001','Medidor eléctrico Chiller',
   'equipment','7e000000-0000-0000-0000-000000000026','electricity','accumulator','energy','kWh','iot_db'),
  ('7c000000-0000-0000-0000-000000000040','40000000-0000-0000-0000-000000000001',
   'EM-AHU-B3-001','Medidor eléctrico AHU',
   'equipment','7e000000-0000-0000-0000-000000000027','electricity','accumulator','energy','kWh','iot_db'),
  ('7c000000-0000-0000-0000-000000000041','40000000-0000-0000-0000-000000000001',
   'EM-BOM-B3-001','Medidor Bomba frío',
   'equipment','7e000000-0000-0000-0000-000000000028','electricity','accumulator','energy','kWh','iot_db'),
  -- C1 Laboratorio
  ('7c000000-0000-0000-0000-000000000042','40000000-0000-0000-0000-000000000001',
   'EM-ANA-C1-001','Medidor Analizador',
   'equipment','7e000000-0000-0000-0000-000000000029','electricity','accumulator','energy','kWh','iot_db'),
  ('7c000000-0000-0000-0000-000000000043','40000000-0000-0000-0000-000000000001',
   'EM-INC-C1-001','Medidor Incubadora',
   'equipment','7e000000-0000-0000-0000-000000000030','electricity','accumulator','energy','kWh','iot_db'),
  -- C2 Mantenimiento
  ('7c000000-0000-0000-0000-000000000044','40000000-0000-0000-0000-000000000001',
   'EM-COM-C2-001','Medidor Compresor taller',
   'equipment','7e000000-0000-0000-0000-000000000031','electricity','accumulator','energy','kWh','iot_db'),
  ('7c000000-0000-0000-0000-000000000045','40000000-0000-0000-0000-000000000001',
   'EM-TOR-C2-001','Medidor Torno CNC',
   'equipment','7e000000-0000-0000-0000-000000000032','electricity','accumulator','energy','kWh','iot_db'),
  -- C3 Almacén
  ('7c000000-0000-0000-0000-000000000046','40000000-0000-0000-0000-000000000001',
   'EM-CAM-C3-001','Medidor Cámara fría',
   'equipment','7e000000-0000-0000-0000-000000000033','electricity','accumulator','energy','kWh','iot_db'),
  ('7c000000-0000-0000-0000-000000000047','40000000-0000-0000-0000-000000000001',
   'EM-MON-C3-001','Medidor Montacargas',
   'equipment','7e000000-0000-0000-0000-000000000034','electricity','accumulator','energy','kWh','iot_db')
on conflict (id) do nothing;

-- ── Lecturas 18 meses — equipos nivel 3 ──────────────────────────────────────
do $$
declare
  v_m   int;
  v_ts  timestamptz;
  -- A2/A3 equipment (steam + electricity)
  v_past  numeric := 1000000;  -- Pasteurizador steam kg
  v_bcirc numeric :=   50000;  -- Bomba circulación kWh
  v_termo numeric :=  200000;  -- Termoformadora kWh
  v_palet numeric :=   80000;  -- Paletizador kWh
  -- B1 Mezclado
  v_agi1  numeric :=  150000;
  v_agi2  numeric :=  140000;
  v_bm1   numeric :=   70000;
  -- B2 Cocimiento
  v_mar1  numeric :=  800000;  -- steam kg
  v_mar2  numeric :=  760000;  -- steam kg
  v_bp2   numeric :=   45000;  -- kWh
  -- B3 Enfriamiento
  v_chi   numeric :=  400000;
  v_ahu   numeric :=  100000;
  v_bb3   numeric :=   50000;
  -- C1 Laboratorio
  v_ana   numeric :=   20000;
  v_inc   numeric :=   12000;
  -- C2 Mantenimiento
  v_comp  numeric :=   90000;
  v_torn  numeric :=   30000;
  -- C3 Almacén
  v_cam   numeric :=  175000;
  v_mon   numeric :=   20000;
begin
  for v_m in 1..18 loop
    v_ts := ('2025-01-01'::date + ((v_m - 1) || ' months')::interval)::timestamptz + '23:45:00';

    v_past  := v_past  + 35000 + (random()*3500)::int;
    v_bcirc := v_bcirc + 60    + (random()*8)::int;
    v_termo := v_termo + 280   + (random()*30)::int;
    v_palet := v_palet + 120   + (random()*12)::int;

    v_agi1  := v_agi1  + 250   + (random()*25)::int;
    v_agi2  := v_agi2  + 230   + (random()*23)::int;
    v_bm1   := v_bm1   + 120   + (random()*12)::int;

    v_mar1  := v_mar1  + 40000 + (random()*4000)::int;
    v_mar2  := v_mar2  + 38000 + (random()*3800)::int;
    v_bp2   := v_bp2   + 80    + (random()*8)::int;

    v_chi   := v_chi   + 800   + (random()*80)::int;
    v_ahu   := v_ahu   + 180   + (random()*18)::int;
    v_bb3   := v_bb3   + 90    + (random()*9)::int;

    v_ana   := v_ana   + 40    + (random()*4)::int;
    v_inc   := v_inc   + 25    + (random()*3)::int;

    v_comp  := v_comp  + 180   + (random()*18)::int;
    v_torn  := v_torn  + 60    + (random()*6)::int;

    v_cam   := v_cam   + 350   + (random()*35)::int;
    v_mon   := v_mon   + 40    + (random()*4)::int;

    insert into measurement_readings (measurement_point_id, value, recorded_at, quality, notes)
    values
      ('7c000000-0000-0000-0000-000000000029', v_past,  v_ts, 'good', 'Mensual VAP PAST'),
      ('7c000000-0000-0000-0000-000000000030', v_bcirc, v_ts, 'good', 'Mensual EM BOM-CIR'),
      ('7c000000-0000-0000-0000-000000000031', v_termo, v_ts, 'good', 'Mensual EM TERMO'),
      ('7c000000-0000-0000-0000-000000000032', v_palet, v_ts, 'good', 'Mensual EM PALET'),
      ('7c000000-0000-0000-0000-000000000033', v_agi1,  v_ts, 'good', 'Mensual EM AGI-B1-001'),
      ('7c000000-0000-0000-0000-000000000034', v_agi2,  v_ts, 'good', 'Mensual EM AGI-B1-002'),
      ('7c000000-0000-0000-0000-000000000035', v_bm1,   v_ts, 'good', 'Mensual EM BOM-B1-001'),
      ('7c000000-0000-0000-0000-000000000036', v_mar1,  v_ts, 'good', 'Mensual FM MAR-B2-001'),
      ('7c000000-0000-0000-0000-000000000037', v_mar2,  v_ts, 'good', 'Mensual FM MAR-B2-002'),
      ('7c000000-0000-0000-0000-000000000038', v_bp2,   v_ts, 'good', 'Mensual EM BOM-B2-001'),
      ('7c000000-0000-0000-0000-000000000039', v_chi,   v_ts, 'good', 'Mensual EM CHI-B3-001'),
      ('7c000000-0000-0000-0000-000000000040', v_ahu,   v_ts, 'good', 'Mensual EM AHU-B3-001'),
      ('7c000000-0000-0000-0000-000000000041', v_bb3,   v_ts, 'good', 'Mensual EM BOM-B3-001'),
      ('7c000000-0000-0000-0000-000000000042', v_ana,   v_ts, 'good', 'Mensual EM ANA-C1-001'),
      ('7c000000-0000-0000-0000-000000000043', v_inc,   v_ts, 'good', 'Mensual EM INC-C1-001'),
      ('7c000000-0000-0000-0000-000000000044', v_comp,  v_ts, 'good', 'Mensual EM COM-C2-001'),
      ('7c000000-0000-0000-0000-000000000045', v_torn,  v_ts, 'good', 'Mensual EM TOR-C2-001'),
      ('7c000000-0000-0000-0000-000000000046', v_cam,   v_ts, 'good', 'Mensual EM CAM-C3-001'),
      ('7c000000-0000-0000-0000-000000000047', v_mon,   v_ts, 'good', 'Mensual EM MON-C3-001');
  end loop;
end $$;

-- Lecturas "en vivo" — equipos nivel 3
do $$
declare live_ts timestamptz := now() - interval '75 minutes';
begin
  insert into measurement_readings (measurement_point_id, value, recorded_at, quality, notes)
  select v.mp_id,
    coalesce((select max(r.value)+v.inc from measurement_readings r where r.measurement_point_id=v.mp_id), v.inc),
    live_ts, 'good', v.notes
  from (values
    ('7c000000-0000-0000-0000-000000000029'::uuid, 3200::numeric,  'En vivo VAP PAST'),
    ('7c000000-0000-0000-0000-000000000030'::uuid,    5::numeric,  'En vivo BOM-CIR'),
    ('7c000000-0000-0000-0000-000000000031'::uuid,   25::numeric,  'En vivo TERMO'),
    ('7c000000-0000-0000-0000-000000000032'::uuid,   11::numeric,  'En vivo PALET'),
    ('7c000000-0000-0000-0000-000000000033'::uuid,   22::numeric,  'En vivo AGI-B1-001'),
    ('7c000000-0000-0000-0000-000000000034'::uuid,   20::numeric,  'En vivo AGI-B1-002'),
    ('7c000000-0000-0000-0000-000000000035'::uuid,   10::numeric,  'En vivo BOM-B1-001'),
    ('7c000000-0000-0000-0000-000000000036'::uuid, 3700::numeric,  'En vivo MAR-B2-001'),
    ('7c000000-0000-0000-0000-000000000037'::uuid, 3500::numeric,  'En vivo MAR-B2-002'),
    ('7c000000-0000-0000-0000-000000000038'::uuid,    7::numeric,  'En vivo BOM-B2-001'),
    ('7c000000-0000-0000-0000-000000000039'::uuid,   72::numeric,  'En vivo CHI-B3-001'),
    ('7c000000-0000-0000-0000-000000000040'::uuid,   16::numeric,  'En vivo AHU-B3-001'),
    ('7c000000-0000-0000-0000-000000000041'::uuid,    8::numeric,  'En vivo BOM-B3-001'),
    ('7c000000-0000-0000-0000-000000000042'::uuid,    4::numeric,  'En vivo ANA-C1-001'),
    ('7c000000-0000-0000-0000-000000000043'::uuid,    2::numeric,  'En vivo INC-C1-001'),
    ('7c000000-0000-0000-0000-000000000044'::uuid,   16::numeric,  'En vivo COM-C2-001'),
    ('7c000000-0000-0000-0000-000000000045'::uuid,    5::numeric,  'En vivo TOR-C2-001'),
    ('7c000000-0000-0000-0000-000000000046'::uuid,   32::numeric,  'En vivo CAM-C3-001'),
    ('7c000000-0000-0000-0000-000000000047'::uuid,    3::numeric,  'En vivo MON-C3-001')
  ) as v(mp_id, inc, notes)
  on conflict (measurement_point_id, recorded_at) do nothing;
end $$;

------------------------------------------------------------
-- Flujos de energía — demo Planta Principal
-- 14 enlaces que definen la distribución completa de la planta
------------------------------------------------------------
insert into energy_flow_links
  (id, site_id, from_type, from_area_id, from_name, from_color,
   to_area_id, utility_type, sort_order, notes) values

  -- ── Fuentes externas → áreas de primer nivel ──────────────────────
  ('9a000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001',
   'external', null, 'CFE Red eléctrica', '#1B6FF8',
   '7a000000-0000-0000-0000-000000000006',   -- → Infraestructura
   'electricity', 0, 'Acometida 13.2 kV CFE'),

  ('9a000000-0000-0000-0000-000000000002',
   '40000000-0000-0000-0000-000000000001',
   'external', null, 'CENAGAS Gas natural', '#ea580c',
   '7a000000-0000-0000-0000-000000000001',   -- → Sala de Calderas
   'natural_gas', 0, 'Acometida gas natural presión media'),

  ('9a000000-0000-0000-0000-000000000003',
   '40000000-0000-0000-0000-000000000001',
   'external', null, 'Red municipal agua', '#0ea5e9',
   '7a000000-0000-0000-0000-000000000002',   -- → Sala de Pozos
   'industrial_water', 0, 'Agua de pozos propios'),

  -- ── Infraestructura → áreas de producción y servicios ─────────────
  ('9a000000-0000-0000-0000-000000000010',
   '40000000-0000-0000-0000-000000000001',
   'area', '7a000000-0000-0000-0000-000000000006', null, null,  -- Infraestructura
   '7a000000-0000-0000-0000-000000000003',   -- → Nave A
   'electricity', 1, 'Tablero LP-A'),

  ('9a000000-0000-0000-0000-000000000011',
   '40000000-0000-0000-0000-000000000001',
   'area', '7a000000-0000-0000-0000-000000000006', null, null,
   '7a000000-0000-0000-0000-000000000004',   -- → Nave B
   'electricity', 2, 'Tablero LP-B'),

  ('9a000000-0000-0000-0000-000000000012',
   '40000000-0000-0000-0000-000000000001',
   'area', '7a000000-0000-0000-0000-000000000006', null, null,
   '7a000000-0000-0000-0000-000000000005',   -- → Nave C
   'electricity', 3, 'Tablero LP-C'),

  ('9a000000-0000-0000-0000-000000000013',
   '40000000-0000-0000-0000-000000000001',
   'area', '7a000000-0000-0000-0000-000000000006', null, null,
   '7a000000-0000-0000-0000-000000000001',   -- → Sala de Calderas
   'electricity', 4, 'Aux eléctrico calderas'),

  ('9a000000-0000-0000-0000-000000000014',
   '40000000-0000-0000-0000-000000000001',
   'area', '7a000000-0000-0000-0000-000000000006', null, null,
   '7a000000-0000-0000-0000-000000000002',   -- → Sala de Pozos
   'electricity', 5, 'Aux eléctrico bombas de pozo'),

  -- ── Sala de Calderas → Naves (distribución de vapor) ──────────────
  ('9a000000-0000-0000-0000-000000000020',
   '40000000-0000-0000-0000-000000000001',
   'area', '7a000000-0000-0000-0000-000000000001', null, null,  -- Sala de Calderas
   '7a000000-0000-0000-0000-000000000003',   -- → Nave A
   'steam', 1, 'Manifold vapor → Nave A'),

  ('9a000000-0000-0000-0000-000000000021',
   '40000000-0000-0000-0000-000000000001',
   'area', '7a000000-0000-0000-0000-000000000001', null, null,
   '7a000000-0000-0000-0000-000000000004',   -- → Nave B
   'steam', 2, 'Manifold vapor → Nave B'),

  ('9a000000-0000-0000-0000-000000000022',
   '40000000-0000-0000-0000-000000000001',
   'area', '7a000000-0000-0000-0000-000000000001', null, null,
   '7a000000-0000-0000-0000-000000000005',   -- → Nave C
   'steam', 3, 'Manifold vapor → Nave C'),

  -- ── Sala de Pozos → Naves (distribución de agua industrial) ───────
  ('9a000000-0000-0000-0000-000000000030',
   '40000000-0000-0000-0000-000000000001',
   'area', '7a000000-0000-0000-0000-000000000002', null, null,  -- Sala de Pozos
   '7a000000-0000-0000-0000-000000000003',   -- → Nave A
   'industrial_water', 1, 'Red agua industrial → Nave A'),

  ('9a000000-0000-0000-0000-000000000031',
   '40000000-0000-0000-0000-000000000001',
   'area', '7a000000-0000-0000-0000-000000000002', null, null,
   '7a000000-0000-0000-0000-000000000004',   -- → Nave B
   'industrial_water', 2, 'Red agua industrial → Nave B'),

  ('9a000000-0000-0000-0000-000000000032',
   '40000000-0000-0000-0000-000000000001',
   'area', '7a000000-0000-0000-0000-000000000002', null, null,
   '7a000000-0000-0000-0000-000000000005',   -- → Nave C
   'industrial_water', 3, 'Red agua industrial → Nave C')

on conflict (id) do nothing;
