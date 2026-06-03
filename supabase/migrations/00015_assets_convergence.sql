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
  asset_type TEXT NOT NULL CHECK (asset_type IN ('plant', 'area', 'system', 'equipment')),
  category TEXT CHECK (category IN ('rotating', 'static', 'electrical', 'instrument', 'civil', 'other')),
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  install_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'standby', 'decommissioned')),
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  energy_role TEXT CHECK (energy_role IN ('consumer', 'producer', 'distributor', 'storage')),
  spec_capacity NUMERIC,
  spec_efficiency NUMERIC,
  properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
ALTER TABLE public.measurement_points ALTER COLUMN target_id DROP NOT NULL;
ALTER TABLE public.measurement_points ALTER COLUMN target_type DROP NOT NULL;

-- 4. Vista de Compatibilidad (assets_compat)
-- Usada temporalmente para leer del nuevo formato mientras se migran los viejos datos
CREATE OR REPLACE VIEW public.assets_compat AS
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
