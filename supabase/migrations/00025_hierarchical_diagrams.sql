-- 00025_hierarchical_diagrams.sql
-- VersaEnergy — Diagramas jerárquicos vinculados al árbol de activos
--
-- Extiende energy_diagrams con scope_type + scope_id para que cada
-- nodo del árbol (site, area, system, equipment) pueda tener su
-- propio diagrama de utilities.  El drill-down se implementa via
-- nodos child_block que llevan el UUID del hijo en properties.

alter table energy_diagrams
  add column if not exists scope_type text
    check (scope_type in ('site', 'area', 'system', 'equipment')),
  add column if not exists scope_id uuid;

-- Índice para lookup rápido: "dame el diagrama de esta área"
create index if not exists idx_diagrams_scope
  on energy_diagrams(scope_type, scope_id)
  where scope_type is not null;

comment on column energy_diagrams.scope_type is
  'Nivel del árbol al que pertenece: site | area | system | equipment';
comment on column energy_diagrams.scope_id is
  'UUID del nodo del árbol (site_id, area_id, utility_system_id o equipment_id)';

-- node_type reference (no tabla, sólo documentación de contratos):
--   port_in    — entrada de energía desde el nivel padre
--   port_out   — salida de energía hacia el nivel padre
--   child_block — bloque hijo clickeable para drill-down
--   (los tipos de equipo existentes siguen funcionando igual)
--
-- properties JSONB esperado por tipo:
--   child_block: { child_scope_type, child_scope_id, child_name, utilities[] }
--   port_in:     { utility, source_label, parent_scope_type, parent_scope_id }
--   port_out:    { utility, dest_label }
