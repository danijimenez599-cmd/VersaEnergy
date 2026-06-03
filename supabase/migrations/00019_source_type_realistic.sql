-- Actualiza source_type de measurement_points a fuentes realistas para SaaS.
-- Elimina protocolos industriales directos (mqtt, opcua, modbus) que no aplican.

alter table measurement_points
  drop constraint if exists measurement_points_source_type_check;

alter table measurement_points
  add constraint measurement_points_source_type_check
  check (source_type in ('manual', 'iot_db', 'api_pull', 'api_push', 'file_import', 'calculated'));

-- Migrar valores legacy 'iot' → 'iot_db'
update measurement_points
  set source_type = 'iot_db'
  where source_type = 'iot';
