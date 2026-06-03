import { supabase } from './supabase'

export type EnergyAssetNodeType = 'plant' | 'area' | 'system' | 'equipment'
export type CmmsReadiness = 'ready' | 'partial' | 'missing'
export type EnergyAssetCreateKind = 'area' | 'system' | 'equipment' | 'meter'

export interface EnergyAssetTreeNode {
  id: string
  sourceId: string
  parentId: string | null
  type: EnergyAssetNodeType
  name: string
  code: string | null
  utility: string | null
  status: string
  description: string | null
  properties: Record<string, unknown>
  isMeasurementAsset: boolean
  measurementPointCount: number
  childCount: number
  cmmsReadiness: CmmsReadiness
  cmmsNotes: string[]
  children: EnergyAssetTreeNode[]
}

export interface EnergyAssetTreeSummary {
  plants: number
  areas: number
  systems: number
  equipment: number
  measurementPoints: number
  cmmsReadyEquipment: number
}

export interface EnergyAssetTreeResult {
  root: EnergyAssetTreeNode | null
  flatNodes: EnergyAssetTreeNode[]
  summary: EnergyAssetTreeSummary
}

export interface EnergyAssetCreateInput {
  siteId: string
  parentType: EnergyAssetNodeType
  parentSourceId: string
  kind: EnergyAssetCreateKind
  name: string
  code: string
  description?: string | null
  utility: string
  equipmentType?: string
  measurement?: {
    measurementType: string
    quantity: string
    unit: string
    sourceMode: 'manual' | 'csv' | 'iot'
    frequency: 'daily' | 'weekly' | 'monthly' | 'on_demand'
    lastCalibrationDate?: string | null
    calibrationDueDate?: string | null
  }
}

interface SiteRow {
  id: string
  name: string
  code: string | null
  address: string | null
}

interface AssetCompatRow {
  id: string
  site_id: string
  parent_id: string | null
  name: string
  code: string | null
  asset_type: string
  category: string | null
  status: string
  utility_type: string | null
  energy_role: string | null
}

interface MeasurementPointRow {
  id: string
  target_type: string
  target_id: string
  meter_equipment_id: string | null
  last_calibration_date: string | null
  calibration_due_date: string | null
}

export async function loadEnergyAssetTree(
  siteId: string,
  utilityType: string | null,
): Promise<EnergyAssetTreeResult> {
  const [
    { data: site },
    { data: assetsCompat },
    { data: measurementPoints },
  ] = await Promise.all([
    supabase.from('sites').select('id, name, code, address').eq('id', siteId).single(),
    queryAssetsCompat(siteId, utilityType),
    queryMeasurementPoints(siteId, utilityType),
  ])

  if (!site) {
    return emptyTree()
  }

  return buildEnergyAssetTree({
    site: site as SiteRow,
    assetsCompat: (assetsCompat || []) as AssetCompatRow[],
    measurementPoints: (measurementPoints || []) as MeasurementPointRow[],
  })
}

function queryAssetsCompat(siteId: string, utilityType: string | null) {
  let query = supabase
    .from('assets_compat')
    .select('id, site_id, parent_id, name, code, asset_type, category, status, utility_type, energy_role')
    .eq('site_id', siteId)
    .neq('status', 'decommissioned')
    .order('name')

  if (utilityType) query = query.eq('utility_type', utilityType)
  return query
}

function queryMeasurementPoints(siteId: string, utilityType: string | null) {
  let query = supabase
    .from('measurement_points')
    .select('id, target_type, target_id, meter_equipment_id, last_calibration_date, calibration_due_date')
    .eq('site_id', siteId)
    .eq('is_active', true)

  if (utilityType) query = query.eq('utility', utilityType)
  return query
}

function emptyTree(): EnergyAssetTreeResult {
  return {
    root: null,
    flatNodes: [],
    summary: {
      plants: 0,
      areas: 0,
      systems: 0,
      equipment: 0,
      measurementPoints: 0,
      cmmsReadyEquipment: 0,
    },
  }
}

function buildEnergyAssetTree({
  site,
  assetsCompat,
  measurementPoints,
}: {
  site: SiteRow
  assetsCompat: AssetCompatRow[]
  measurementPoints: MeasurementPointRow[]
}): EnergyAssetTreeResult {
  const nodes = new Map<string, EnergyAssetTreeNode>()

  const root = createNode({
    id: toNodeId('plant', site.id),
    sourceId: site.id,
    parentId: null,
    type: 'plant',
    name: site.name,
    code: site.code,
    utility: null,
    status: 'active',
    description: site.address,
    properties: {},
    isMeasurementAsset: false,
    measurementPointCount: measurementPoints.length,
    cmmsReadiness: site.code ? 'ready' : 'partial',
    cmmsNotes: site.code ? ['Planta lista para CMMS'] : ['Agregar codigo de planta'],
  })
  nodes.set(root.id, root)

  for (const item of assetsCompat) {
    const parentId = item.parent_id ? toNodeId(getAssetTypeFromCompat(item.parent_id, assetsCompat), item.parent_id) : root.id
    const measurementCount = countMeasurements(measurementPoints, item.id)
    const isMeasurementAsset = item.energy_role === 'measurement_device' || item.energy_role === 'measurement_subsystem'

    const nodeType = item.asset_type as EnergyAssetNodeType
    const assetNode = createNode({
      id: toNodeId(nodeType, item.id),
      sourceId: item.id,
      parentId: nodes.has(parentId) ? parentId : root.id,
      type: nodeType,
      name: item.name,
      code: item.code,
      utility: item.utility_type,
      status: item.status,
      description: item.category || '',
      properties: { asset_role: item.energy_role },
      isMeasurementAsset,
      measurementPointCount: measurementCount,
      cmmsReadiness: item.code ? 'ready' : 'partial',
      cmmsNotes: buildCompatNotes(item, measurementCount, isMeasurementAsset),
    })
    nodes.set(assetNode.id, assetNode)
  }

  for (const node of nodes.values()) {
    if (!node.parentId) continue
    const parent = nodes.get(node.parentId)
    if (parent) parent.children.push(node)
  }

  const sortedRoot = sortTree(root)
  const flatNodes = flattenTree(sortedRoot)
  for (const node of flatNodes) node.childCount = node.children.length

  return {
    root: sortedRoot,
    flatNodes,
    summary: {
      plants: 1,
      areas: flatNodes.filter((node) => node.type === 'area').length,
      systems: flatNodes.filter((node) => node.type === 'system').length,
      equipment: flatNodes.filter((node) => node.type === 'equipment').length,
      measurementPoints: measurementPoints.length,
      cmmsReadyEquipment: flatNodes.filter((node) => node.type === 'equipment' && node.cmmsReadiness === 'ready').length,
    },
  }
}

function createNode(node: Omit<EnergyAssetTreeNode, 'children' | 'childCount'>): EnergyAssetTreeNode {
  return { ...node, children: [], childCount: 0 }
}

function getAssetTypeFromCompat(id: string, assets: AssetCompatRow[]): EnergyAssetNodeType {
  const asset = assets.find(a => a.id === id)
  return (asset?.asset_type as EnergyAssetNodeType) || 'equipment'
}

function toNodeId(type: EnergyAssetNodeType, id: string) {
  return `${type}:${id}`
}

function countMeasurements(measurementPoints: MeasurementPointRow[], targetId: string) {
  return measurementPoints.filter((point) => (
    point.target_id === targetId || point.meter_equipment_id === targetId
  )).length
}

function buildCompatNotes(item: AssetCompatRow, measurementCount: number, isMeasurementAsset: boolean) {
  const notes = []
  if (item.utility_type) notes.push(`Utility: ${item.utility_type}`)
  if (isMeasurementAsset) notes.push('Activo de medición (puede requerir calibración)')
  if (measurementCount > 0) notes.push(`${measurementCount} punto(s) de medicion`)
  if (!item.code) notes.push('Requiere código/TAG para integrarse al CMMS')
  notes.push('Sincronizado vía vista assets_compat')
  return notes
}

function sortTree(node: EnergyAssetTreeNode): EnergyAssetTreeNode {
  node.children = node.children
    .sort((a, b) => {
      const typeOrder = getTypeOrder(a.type) - getTypeOrder(b.type)
      return typeOrder !== 0 ? typeOrder : a.name.localeCompare(b.name)
    })
    .map(sortTree)

  return node
}

function getTypeOrder(type: EnergyAssetNodeType) {
  return { plant: 0, area: 1, system: 2, equipment: 3 }[type]
}

function flattenTree(node: EnergyAssetTreeNode): EnergyAssetTreeNode[] {
  return [node, ...node.children.flatMap(flattenTree)]
}

export function getAllowedCreateKinds(parentType: EnergyAssetNodeType): EnergyAssetCreateKind[] {
  if (parentType === 'plant') return ['area']
  if (parentType === 'area') return ['system', 'equipment', 'meter']
  if (parentType === 'system') return ['equipment', 'meter']
  if (parentType === 'equipment') return ['meter']
  return []
}

export async function createEnergyAssetFromTree(input: EnergyAssetCreateInput) {
  const name = input.name.trim()
  const code = input.code.trim().toUpperCase()
  if (!name) throw new Error('El nombre es requerido.')
  if (!code) throw new Error('El codigo/TAG es requerido.')

  if (input.kind === 'area') {
    const { error } = await supabase.from('energy_areas').insert({
      site_id: input.siteId,
      name,
      code,
      description: input.description || null,
      sync_status: 'pending_sync',
      integration_key: buildIntegrationKey(input.siteId, 'area', code),
    })
    if (error) throw error
    return
  }

  const parent = await resolveParentContext(input.siteId, input.parentType, input.parentSourceId)

  if (input.kind === 'system') {
    if (!parent.areaId) throw new Error('Selecciona un area para crear sistemas.')
    const { error } = await supabase.from('utility_systems').insert({
      site_id: input.siteId,
      code,
      name,
      description: input.description || null,
      utility_type: input.utility,
      area_id: parent.areaId,
      properties: { cmms_asset_type: 'system' },
      sync_status: 'pending_sync',
      integration_key: buildIntegrationKey(input.siteId, 'system', code),
    })
    if (error) throw error
    return
  }

  if (input.kind === 'equipment') {
    if (!parent.areaId) throw new Error('Selecciona un area o sistema para crear equipos.')
    const { error } = await supabase.from('energy_equipment').insert({
      site_id: input.siteId,
      tag: code,
      name,
      equipment_type: input.equipmentType || 'consumer',
      utility_type: input.utility,
      area_id: parent.areaId,
      utility_system_id: parent.systemId,
      status: 'active',
      properties: { cmms_asset_type: 'equipment' },
      sync_status: 'pending_sync',
      integration_key: buildIntegrationKey(input.siteId, 'equipment', code),
    })
    if (error) throw error
    return
  }

  await createMeterAsset(input, parent, name, code)
}

async function createMeterAsset(
  input: EnergyAssetCreateInput,
  parent: ParentContext,
  name: string,
  code: string,
) {
  if (!parent.areaId) throw new Error('El medidor debe pertenecer a un area.')
  const measurement = input.measurement
  if (!measurement) throw new Error('Falta la configuracion de medicion.')

  const measurementSystemId = await ensureMeasurementSystem(input.siteId, parent.areaId, input.utility)

  const { data: meter, error: meterError } = await supabase
    .from('energy_equipment')
    .insert({
      site_id: input.siteId,
      tag: code,
      name,
      equipment_type: 'meter',
      utility_type: input.utility,
      area_id: parent.areaId,
      utility_system_id: measurementSystemId,
      status: 'active',
      properties: {
        cmms_asset_type: 'equipment',
        asset_role: 'measurement_device',
        calibration: {
          lastDate: measurement.lastCalibrationDate || null,
          dueDate: measurement.calibrationDueDate || null,
        },
        data_capture: {
          mode: measurement.sourceMode,
          frequency: measurement.frequency,
        },
      },
      sync_status: 'pending_sync',
      integration_key: buildIntegrationKey(input.siteId, 'meter', code),
    })
    .select('id')
    .single()

  if (meterError) throw meterError
  if (!meter?.id) throw new Error('No se pudo crear el equipo medidor.')

  const target = resolveMeasurementTarget(parent, meter.id)
  const { error: pointError } = await supabase.from('measurement_points').insert({
    site_id: input.siteId,
    tag: code,
    name,
    target_type: target.type,
    target_id: target.id,
    meter_equipment_id: meter.id,
    utility: input.utility,
    measurement_type: measurement.measurementType,
    quantity: measurement.quantity,
    unit: measurement.unit,
    source_type: measurement.sourceMode === 'iot' ? 'iot' : 'manual',
    source_config: buildMeterSourceConfig(measurement),
    accumulator_config: buildDefaultAccumulatorConfig(measurement.measurementType),
    last_calibration_date: measurement.lastCalibrationDate || null,
    calibration_due_date: measurement.calibrationDueDate || null,
    properties: {
      cmms_asset_role: 'measurement_device',
      created_from_asset_tree: true,
      capture_mode: measurement.sourceMode,
    },
    sync_status: 'pending_sync',
    integration_key: buildIntegrationKey(input.siteId, 'measurement_point', code),
  })
  if (pointError) throw pointError
}

interface ParentContext {
  type: EnergyAssetNodeType
  id: string
  areaId: string | null
  systemId: string | null
  equipmentId: string | null
  utility: string | null
}

async function resolveParentContext(
  siteId: string,
  parentType: EnergyAssetNodeType,
  parentSourceId: string,
): Promise<ParentContext> {
  if (parentType === 'plant') {
    return { type: 'plant', id: siteId, areaId: null, systemId: null, equipmentId: null, utility: null }
  }

  if (parentType === 'area') {
    const { data, error } = await supabase
      .from('energy_areas')
      .select('id')
      .eq('site_id', siteId)
      .eq('id', parentSourceId)
      .single()
    if (error) throw error
    return { type: 'area', id: data.id, areaId: data.id, systemId: null, equipmentId: null, utility: null }
  }

  if (parentType === 'system') {
    const { data, error } = await supabase
      .from('utility_systems')
      .select('id, area_id, utility_type')
      .eq('site_id', siteId)
      .eq('id', parentSourceId)
      .single()
    if (error) throw error
    return {
      type: 'system',
      id: data.id,
      areaId: data.area_id,
      systemId: data.id,
      equipmentId: null,
      utility: data.utility_type,
    }
  }

  const { data, error } = await supabase
    .from('energy_equipment')
    .select('id, area_id, utility_system_id, utility_type')
    .eq('site_id', siteId)
    .eq('id', parentSourceId)
    .single()
  if (error) throw error
  return {
    type: 'equipment',
    id: data.id,
    areaId: data.area_id,
    systemId: data.utility_system_id,
    equipmentId: data.id,
    utility: data.utility_type,
  }
}

async function ensureMeasurementSystem(siteId: string, areaId: string, utility: string) {
  const code = `MED-${utilityPrefix(utility)}`
  const { data: existing, error: existingError } = await supabase
    .from('utility_systems')
    .select('id')
    .eq('site_id', siteId)
    .eq('area_id', areaId)
    .eq('utility_type', utility)
    .eq('code', code)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing?.id) return existing.id

  const { data, error } = await supabase
    .from('utility_systems')
    .insert({
      site_id: siteId,
      code,
      name: `Medicion - ${utilityLabel(utility)}`,
      description: 'Subsistema reservado para medidores e instrumentos mantenibles.',
      utility_type: utility,
      area_id: areaId,
      properties: { asset_role: 'measurement_subsystem', cmms_asset_type: 'system' },
      sync_status: 'pending_sync',
      integration_key: buildIntegrationKey(siteId, 'system', `${areaId}-${code}`),
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

function resolveMeasurementTarget(parent: ParentContext, meterId: string): { type: string; id: string } {
  if (parent.type === 'equipment' && parent.equipmentId) return { type: 'equipment', id: parent.equipmentId }
  if (parent.type === 'system' && parent.systemId) return { type: 'system', id: parent.systemId }
  if (parent.type === 'area' && parent.areaId) return { type: 'area', id: parent.areaId }
  return { type: 'equipment', id: meterId }
}

function buildMeterSourceConfig(measurement: NonNullable<EnergyAssetCreateInput['measurement']>) {
  if (measurement.sourceMode === 'iot') {
    return {
      kind: 'iot',
      status: 'planned',
      protocol: 'mqtt',
      address: 'pending',
      pollingSeconds: 60,
    }
  }

  return {
    kind: 'manual',
    frequency: measurement.frequency,
    captureMethod: measurement.sourceMode === 'csv' ? 'csv_import' : 'manual_routine',
  }
}

function buildDefaultAccumulatorConfig(measurementType: string) {
  if (measurementType !== 'accumulator') return {}
  return {
    multiplier: 1,
    offset: 0,
    allowNegativeDelta: false,
    resetDetection: true,
    rollover: { enabled: false, maxValue: 999999 },
  }
}

function buildIntegrationKey(siteId: string, kind: string, code: string) {
  return `${siteId}:${kind}:${code}`.toLowerCase()
}

function utilityPrefix(utility: string) {
  const map: Record<string, string> = {
    electricity: 'ELEC',
    natural_gas: 'NG',
    steam: 'STM',
    compressed_air: 'AIR',
    chilled_water: 'CHW',
    hot_water: 'HW',
    industrial_water: 'IW',
    diesel: 'DSL',
    lpg: 'LPG',
  }
  return map[utility] || utility.slice(0, 6).toUpperCase()
}

function utilityLabel(utility: string) {
  const map: Record<string, string> = {
    electricity: 'Electricidad',
    natural_gas: 'Gas natural',
    steam: 'Vapor',
    compressed_air: 'Aire comprimido',
    chilled_water: 'Agua helada',
    hot_water: 'Agua caliente',
    industrial_water: 'Agua industrial',
    diesel: 'Diesel',
    lpg: 'GLP',
  }
  return map[utility] || utility
}
