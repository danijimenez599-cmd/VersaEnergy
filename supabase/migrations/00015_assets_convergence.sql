-- 00015_assets_convergence.sql
-- MP-R7: Convergencia de activos con el CMMS (Base de datos compartida).
-- Como este es el entorno local de Energy, mockeamos las tablas base del CMMS que existirán
-- en el entorno de producción compartido (VersaPlatform).

-- 1. Tablas core del CMMS (Simulando que ya existen)
CREATE TABLE IF NOT EXISTS public.equipment_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  parent_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  equipment_family_id UUID REFERENCES public.equipment_families(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT,
  node_type TEXT NOT NULL DEFAULT 'equipment'
    CHECK (node_type IN (
      'plant', 'production_hall', 'area', 'process', 'subprocess',
      'module', 'line', 'system', 'zone', 'room', 'equipment',
      'meter', 'other'
    )),
  node_role TEXT NOT NULL DEFAULT 'maintainable'
    CHECK (node_role IN ('grouping', 'maintainable')),
  maintainable_kind TEXT
    CHECK (maintainable_kind IN (
      'equipment', 'facility_asset', 'infrastructure',
      'utility_system', 'instrument', 'meter', 'other'
    )),
  allow_work_orders BOOLEAN NOT NULL DEFAULT TRUE,
  allow_pm BOOLEAN NOT NULL DEFAULT TRUE,
  allow_downtime BOOLEAN NOT NULL DEFAULT TRUE,
  rollup_kpis BOOLEAN NOT NULL DEFAULT FALSE,
  requires_equipment_family BOOLEAN NOT NULL DEFAULT FALSE,
  category TEXT CHECK (category IN ('rotating', 'static', 'electrical', 'instrument', 'civil', 'other')),
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  install_date DATE,
  description TEXT,
  specs JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'standby', 'decommissioned')),
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS node_type TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS node_role TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS maintainable_kind TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS allow_work_orders BOOLEAN;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS allow_pm BOOLEAN;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS allow_downtime BOOLEAN;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS rollup_kpis BOOLEAN;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS requires_equipment_family BOOLEAN;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '{}';

UPDATE public.assets
SET
  node_type = COALESCE(node_type, 'equipment'),
  node_role = COALESCE(node_role, CASE WHEN node_type IN ('plant','area','system') THEN 'grouping' ELSE 'maintainable' END),
  maintainable_kind = CASE
    WHEN COALESCE(node_role, 'maintainable') = 'grouping' THEN NULL
    ELSE COALESCE(maintainable_kind, CASE WHEN node_type = 'meter' THEN 'meter' ELSE 'equipment' END)
  END,
  allow_work_orders = COALESCE(allow_work_orders, COALESCE(node_role, 'maintainable') = 'maintainable'),
  allow_pm = COALESCE(allow_pm, COALESCE(node_role, 'maintainable') = 'maintainable'),
  allow_downtime = COALESCE(allow_downtime, COALESCE(node_role, 'maintainable') = 'maintainable'),
  rollup_kpis = COALESCE(rollup_kpis, COALESCE(node_role, 'maintainable') = 'grouping'),
  requires_equipment_family = COALESCE(requires_equipment_family, FALSE),
  specs = COALESCE(specs, '{}'::jsonb);

ALTER TABLE public.assets ALTER COLUMN node_type SET NOT NULL;
ALTER TABLE public.assets ALTER COLUMN node_type SET DEFAULT 'equipment';
ALTER TABLE public.assets ALTER COLUMN node_role SET NOT NULL;
ALTER TABLE public.assets ALTER COLUMN node_role SET DEFAULT 'maintainable';
ALTER TABLE public.assets ALTER COLUMN allow_work_orders SET NOT NULL;
ALTER TABLE public.assets ALTER COLUMN allow_pm SET NOT NULL;
ALTER TABLE public.assets ALTER COLUMN allow_downtime SET NOT NULL;
ALTER TABLE public.assets ALTER COLUMN rollup_kpis SET NOT NULL;
ALTER TABLE public.assets ALTER COLUMN requires_equipment_family SET NOT NULL;
ALTER TABLE public.assets ALTER COLUMN specs SET NOT NULL;

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_node_type_check;
ALTER TABLE public.assets ADD CONSTRAINT assets_node_type_check CHECK (
  node_type IN (
    'plant', 'production_hall', 'area', 'process', 'subprocess',
    'module', 'line', 'system', 'zone', 'room', 'equipment',
    'meter', 'other'
  )
);
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_node_role_check;
ALTER TABLE public.assets ADD CONSTRAINT assets_node_role_check CHECK (node_role IN ('grouping', 'maintainable'));
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_maintainable_kind_check;
ALTER TABLE public.assets ADD CONSTRAINT assets_maintainable_kind_check CHECK (
  maintainable_kind IS NULL OR maintainable_kind IN (
    'equipment', 'facility_asset', 'infrastructure',
    'utility_system', 'instrument', 'meter', 'other'
  )
);

-- Habilitar RLS en assets mock
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assets - view in own company"
  ON public.assets FOR SELECT
  USING (
    site_id IN (SELECT s.id FROM sites s WHERE s.company_id = get_my_company_id())
  );

CREATE POLICY "Assets - manage in own company"
  ON public.assets FOR ALL
  USING (
    site_id IN (SELECT s.id FROM sites s WHERE s.company_id = get_my_company_id())
    AND get_my_role() IN ('admin', 'engineer', 'manager')
  );

-- 2. Tablas satélite de Energy (Extendiendo los assets)
CREATE TABLE IF NOT EXISTS public.energy_asset_profiles (
  asset_id UUID PRIMARY KEY REFERENCES public.assets(id) ON DELETE CASCADE,
  utility_type TEXT REFERENCES public.utility_definitions(id),
  energy_role TEXT CHECK (energy_role IN (
    'consumer', 'producer', 'distributor', 'converter', 'storage',
    'measurement_device', 'measurement_subsystem'
  )),
  spec_capacity NUMERIC,
  spec_efficiency NUMERIC,
  properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.energy_asset_profiles DROP CONSTRAINT IF EXISTS energy_asset_profiles_energy_role_check;
ALTER TABLE public.energy_asset_profiles ADD CONSTRAINT energy_asset_profiles_energy_role_check
  CHECK (energy_role IN (
    'consumer', 'producer', 'distributor', 'converter', 'storage',
    'measurement_device', 'measurement_subsystem'
  ));

ALTER TABLE public.energy_asset_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Energy profiles - view in own company"
  ON public.energy_asset_profiles FOR SELECT
  USING (
    asset_id IN (
      SELECT a.id FROM assets a 
      JOIN sites s ON a.site_id = s.id 
      WHERE s.company_id = get_my_company_id()
    )
  );

CREATE POLICY "Energy profiles - manage in own company"
  ON public.energy_asset_profiles FOR ALL
  USING (
    asset_id IN (
      SELECT a.id FROM assets a 
      JOIN sites s ON a.site_id = s.id 
      WHERE s.company_id = get_my_company_id()
    )
    AND get_my_role() IN ('admin', 'engineer', 'manager')
  );

-- 3. Adaptación de Measurement Points
-- (En vez de dropear la anterior, agregamos asset_id permitiendo null por compatibilidad temporal)
ALTER TABLE public.measurement_points ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE;
ALTER TABLE public.measurement_points ADD COLUMN IF NOT EXISTS meter_equipment_id UUID REFERENCES public.assets(id) ON DELETE SET NULL;
ALTER TABLE public.measurement_points ADD COLUMN IF NOT EXISTS scope_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL;
ALTER TABLE public.measurement_points ADD COLUMN IF NOT EXISTS physical_meter_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL;
ALTER TABLE public.measurement_points ADD COLUMN IF NOT EXISTS domains TEXT[] NOT NULL DEFAULT ARRAY['energy']::TEXT[];
ALTER TABLE public.measurement_points ALTER COLUMN target_id DROP NOT NULL;
ALTER TABLE public.measurement_points ALTER COLUMN target_type DROP NOT NULL;

-- 3b. Capacidades de producto y solicitudes Core Asset Registry (mock local).
CREATE TABLE IF NOT EXISTS public.company_products (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_key TEXT NOT NULL CHECK (product_key IN ('versa_maint', 'versa_energy')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'trial', 'active', 'suspended')),
  settings JSONB NOT NULL DEFAULT '{}',
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, product_key)
);

CREATE TABLE IF NOT EXISTS public.site_products (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  product_key TEXT NOT NULL CHECK (product_key IN ('versa_maint', 'versa_energy')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('inactive', 'trial', 'active', 'suspended')),
  settings JSONB NOT NULL DEFAULT '{}',
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, site_id, product_key)
);

CREATE OR REPLACE FUNCTION public.fn_site_product_enabled(
  p_site_id UUID,
  p_product_key TEXT
) RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN sp.status IS NOT NULL THEN sp.status IN ('trial', 'active')
      ELSE cp.status IN ('trial', 'active')
    END
    FROM public.sites s
    LEFT JOIN public.company_products cp
      ON cp.company_id = s.company_id
     AND cp.product_key = p_product_key
    LEFT JOIN public.site_products sp
      ON sp.company_id = s.company_id
     AND sp.site_id = s.id
     AND sp.product_key = p_product_key
    WHERE s.id = p_site_id
  ), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.fn_site_product_mode(p_site_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_maint_enabled BOOLEAN;
  v_energy_enabled BOOLEAN;
BEGIN
  v_maint_enabled := public.fn_site_product_enabled(p_site_id, 'versa_maint');
  v_energy_enabled := public.fn_site_product_enabled(p_site_id, 'versa_energy');

  IF v_maint_enabled AND v_energy_enabled THEN
    RETURN 'maint_and_energy';
  ELSIF v_maint_enabled THEN
    RETURN 'maint_only';
  ELSIF v_energy_enabled THEN
    RETURN 'energy_only';
  END IF;

  RETURN 'none';
END;
$$;

CREATE TABLE IF NOT EXISTS public.asset_registry_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  requested_from_app TEXT NOT NULL DEFAULT 'versa_energy',
  request_type TEXT NOT NULL CHECK (request_type IN (
    'create_physical_asset',
    'adopt_physical_asset',
    'update_physical_asset',
    'merge_physical_asset',
    'create_physical_meter',
    'create_measurement_point',
    'update_measurement_point'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged', 'cancelled')),
  target_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  proposed_parent_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  proposed_payload JSONB NOT NULL DEFAULT '{}',
  decision_payload JSONB NOT NULL DEFAULT '{}',
  decision_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Vista de Compatibilidad (assets_compat)
-- Usada temporalmente para leer del nuevo formato mientras se migran los viejos datos
CREATE OR REPLACE VIEW public.assets_compat AS
SELECT
  a.id,
  a.site_id,
  a.parent_id,
  a.name,
  a.code,
  CASE
    WHEN a.node_type = 'plant' THEN 'plant'
    WHEN a.node_role = 'maintainable' THEN 'equipment'
    WHEN a.node_type = 'system' THEN 'system'
    ELSE 'area'
  END as asset_type,
  COALESCE(a.category, 'other') as category,
  a.status,
  eap.utility_type,
  eap.energy_role
FROM public.assets a
LEFT JOIN public.energy_asset_profiles eap ON eap.asset_id = a.id
UNION ALL
SELECT 
  id, 
  site_id, 
  NULL::uuid as parent_id, 
  name, 
  code, 
  'area' as asset_type, 
  'other' as category, 
  CASE WHEN is_active THEN 'active' ELSE 'decommissioned' END as status, 
  NULL as utility_type, 
  NULL as energy_role
FROM public.energy_areas
UNION ALL
SELECT 
  id, 
  site_id, 
  area_id as parent_id, 
  name, 
  code, 
  'system' as asset_type, 
  'other' as category, 
  CASE WHEN is_active THEN 'active' ELSE 'decommissioned' END as status, 
  utility_type, 
  properties->>'asset_role' as energy_role
FROM public.utility_systems
UNION ALL
SELECT 
  id, 
  site_id, 
  COALESCE(utility_system_id, area_id) as parent_id, 
  name, 
  tag as code, 
  'equipment' as asset_type, 
  CASE WHEN equipment_type = 'meter' THEN 'instrument' ELSE 'other' END as category, 
  status, 
  utility_type, 
  properties->>'asset_role' as energy_role
FROM public.energy_equipment;

-- Fin de migración.
