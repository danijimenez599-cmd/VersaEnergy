import { supabase } from './supabase'

export type EnergyAssetNodeType = 'plant' | 'area' | 'system' | 'equipment'
export type CmmsReadiness = 'ready' | 'partial' | 'missing'
export type EnergyAssetCreateKind = 'area' | 'system' | 'equipment' | 'meter'
export type EnergyAssetTreeSource = 'core' | 'legacy' | 'synthetic'
export type SiteProductMode = 'energy_only' | 'maint_only' | 'maint_and_energy' | 'none'

const PRODUCER_EQUIPMENT_TYPES = new Set([
  'boiler',
  'compressor',
  'chiller',
  'cooling_tower',
  'generator',
  'solar_array',
  'pv_array',
])

export interface EnergyAssetTreeNode {
  id: string
  sourceId: string
  siteId: string
  source: EnergyAssetTreeSource
  parentId: string | null
  type: EnergyAssetNodeType
  coreNodeType: string | null
  nodeRole: 'grouping' | 'maintainable' | null
  maintainableKind: string | null
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
  company_id: string
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
  description?: string | null
  properties?: Record<string, unknown> | null
}

interface MeasurementPointRow {
  id: string
  asset_id?: string | null
  scope_asset_id?: string | null
  physical_meter_asset_id?: string | null
  domains?: string[] | null
  target_type?: string | null
  target_id?: string | null
  meter_equipment_id?: string | null
  last_calibration_date?: string | null
  calibration_due_date?: string | null
}

interface CoreAssetRow {
  id: string
  site_id: string
  parent_id: string | null
  name: string
  code: string | null
  node_type: string
  node_role: 'grouping' | 'maintainable'
  maintainable_kind: string | null
  category: string | null
  status: string
  description: string | null
  specs: Record<string, unknown> | null
}

interface EnergyAssetProfileRow {
  asset_id: string
  utility_type: string | null
  energy_role: string | null
  spec_capacity: number | null
  spec_efficiency: number | null
  properties: Record<string, unknown> | null
}

interface EnergyAreaRow {
  id: string
  site_id: string
  parent_area_id: string | null
  name: string
  code: string | null
  description: string | null
  is_active: boolean
}

interface UtilitySystemRow {
  id: string
  site_id: string
  code: string | null
  name: string
  description: string | null
  utility_type: string | null
  area_id: string | null
  is_active: boolean
  properties: Record<string, unknown> | null
}

interface EnergyEquipmentRow {
  id: string
  site_id: string
  tag: string | null
  name: string
  equipment_type: string | null
  utility_type: string | null
  area_id: string | null
  utility_system_id: string | null
  status: string
  properties: Record<string, unknown> | null
}

export async function loadEnergyAssetTree(
  siteId: string,
  utilityType: string | null,
): Promise<EnergyAssetTreeResult> {
  const [
    { data: site },
    coreAssetsResult,
  ] = await Promise.all([
    supabase.from('sites').select('id, company_id, name, code, address').eq('id', siteId).single(),
    queryCoreAssets(siteId),
  ])

  if (!site) {
    return emptyTree()
  }

  if (!coreAssetsResult.error && (coreAssetsResult.data || []).length > 0) {
    const coreAssets = (coreAssetsResult.data || []) as CoreAssetRow[]
    const profiles = await queryEnergyAssetProfiles(coreAssets.map((asset) => asset.id))
    const measurementPoints = await queryCoreMeasurementPoints(coreAssets.map((asset) => asset.id))
    return buildCoreEnergyAssetTree({
      site: site as SiteRow,
      coreAssets: filterCoreRowsByUtility(coreAssets, profiles, utilityType),
      profiles,
      measurementPoints,
    })
  }

  const assetsCompatResult = await queryAssetsCompat(siteId)
  const assetsCompat = assetsCompatResult.error
    ? await queryFallbackAssetRows(siteId)
    : (assetsCompatResult.data || []) as AssetCompatRow[]
  const measurementPoints = await queryLegacyMeasurementPoints(siteId, utilityType)

  return buildLegacyEnergyAssetTree({
    site: site as SiteRow,
    assetsCompat: filterAssetRowsByUtility(assetsCompat, utilityType),
    measurementPoints,
  })
}

function queryCoreAssets(siteId: string) {
  return supabase
    .from('assets')
    .select('id, site_id, parent_id, name, code, node_type, node_role, maintainable_kind, category, status, description, specs')
    .eq('site_id', siteId)
    .neq('status', 'decommissioned')
    .order('name')
}

async function queryEnergyAssetProfiles(assetIds: string[]): Promise<Map<string, EnergyAssetProfileRow>> {
  if (assetIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('energy_asset_profiles')
    .select('asset_id, utility_type, energy_role, spec_capacity, spec_efficiency, properties')
    .in('asset_id', assetIds)

  if (error) return new Map()
  return new Map(((data || []) as EnergyAssetProfileRow[]).map((profile) => [profile.asset_id, profile]))
}

function queryAssetsCompat(siteId: string) {
  return supabase
    .from('assets_compat')
    .select('id, site_id, parent_id, name, code, asset_type, category, status, utility_type, energy_role')
    .eq('site_id', siteId)
    .neq('status', 'decommissioned')
    .order('name')
}

async function queryFallbackAssetRows(siteId: string): Promise<AssetCompatRow[]> {
  const [
    { data: areas, error: areasError },
    { data: systems, error: systemsError },
    { data: equipment, error: equipmentError },
  ] = await Promise.all([
    supabase
      .from('energy_areas')
      .select('id, site_id, parent_area_id, name, code, description, is_active')
      .eq('site_id', siteId)
      .order('name'),
    supabase
      .from('utility_systems')
      .select('id, site_id, code, name, description, utility_type, area_id, is_active, properties')
      .eq('site_id', siteId)
      .order('name'),
    supabase
      .from('energy_equipment')
      .select('id, site_id, tag, name, equipment_type, utility_type, area_id, utility_system_id, status, properties')
      .eq('site_id', siteId)
      .order('name'),
  ])

  const error = areasError || systemsError || equipmentError
  if (error) throw error

  return [
    ...((areas || []) as EnergyAreaRow[]).map(areaToCompatRow),
    ...((systems || []) as UtilitySystemRow[]).map(systemToCompatRow),
    ...((equipment || []) as EnergyEquipmentRow[]).map(equipmentToCompatRow),
  ].filter((row) => row.status !== 'decommissioned')
}

function areaToCompatRow(area: EnergyAreaRow): AssetCompatRow {
  return {
    id: area.id,
    site_id: area.site_id,
    parent_id: area.parent_area_id,
    name: area.name,
    code: area.code,
    asset_type: 'area',
    category: 'other',
    status: area.is_active ? 'active' : 'decommissioned',
    utility_type: null,
    energy_role: null,
    description: area.description,
  }
}

function systemToCompatRow(system: UtilitySystemRow): AssetCompatRow {
  return {
    id: system.id,
    site_id: system.site_id,
    parent_id: system.area_id,
    name: system.name,
    code: system.code,
    asset_type: 'system',
    category: 'other',
    status: system.is_active ? 'active' : 'decommissioned',
    utility_type: system.utility_type,
    energy_role: getAssetRole(system.properties),
    description: system.description,
    properties: system.properties,
  }
}

function equipmentToCompatRow(equipment: EnergyEquipmentRow): AssetCompatRow {
  return {
    id: equipment.id,
    site_id: equipment.site_id,
    parent_id: equipment.utility_system_id || equipment.area_id,
    name: equipment.name,
    code: equipment.tag,
    asset_type: 'equipment',
    category: equipment.equipment_type === 'meter' ? 'instrument' : 'other',
    status: equipment.status,
    utility_type: equipment.utility_type,
    energy_role: getAssetRole(equipment.properties),
    properties: {
      ...(equipment.properties || {}),
      equipment_type: equipment.equipment_type,
    },
  }
}

function getAssetRole(properties: Record<string, unknown> | null) {
  return typeof properties?.asset_role === 'string'
    ? properties.asset_role
    : null
}

function filterAssetRowsByUtility(rows: AssetCompatRow[], utilityType: string | null) {
  if (!utilityType) return rows

  const rowsById = new Map(rows.map((row) => [row.id, row]))
  const included = new Set<string>()

  for (const row of rows) {
    if (row.utility_type !== utilityType) continue

    let current: AssetCompatRow | undefined = row
    while (current) {
      included.add(current.id)
      current = current.parent_id ? rowsById.get(current.parent_id) : undefined
    }
  }

  return rows.filter((row) => included.has(row.id))
}

function filterCoreRowsByUtility(
  rows: CoreAssetRow[],
  profiles: Map<string, EnergyAssetProfileRow>,
  utilityType: string | null,
) {
  if (!utilityType) return rows

  const rowsById = new Map(rows.map((row) => [row.id, row]))
  const included = new Set<string>()

  for (const row of rows) {
    const profile = profiles.get(row.id)
    if (profile?.utility_type !== utilityType) continue

    let current: CoreAssetRow | undefined = row
    while (current) {
      included.add(current.id)
      current = current.parent_id ? rowsById.get(current.parent_id) : undefined
    }
  }

  return rows.filter((row) => included.has(row.id))
}

async function queryCoreMeasurementPoints(assetIds: string[]): Promise<MeasurementPointRow[]> {
  if (assetIds.length === 0) return []

  const { data, error } = await supabase
    .from('measurement_points')
    .select('id, asset_id, scope_asset_id, physical_meter_asset_id, domains')
    .or([
      `asset_id.in.(${assetIds.join(',')})`,
      `scope_asset_id.in.(${assetIds.join(',')})`,
      `physical_meter_asset_id.in.(${assetIds.join(',')})`,
    ].join(','))

  if (error) return []
  return (data || []) as MeasurementPointRow[]
}

async function queryLegacyMeasurementPoints(siteId: string, utilityType: string | null): Promise<MeasurementPointRow[]> {
  let query = supabase
    .from('measurement_points')
    .select('id, target_type, target_id, meter_equipment_id, last_calibration_date, calibration_due_date')
    .eq('site_id', siteId)
    .eq('is_active', true)

  if (utilityType) query = query.eq('utility', utilityType)
  const { data, error } = await query
  if (error) return []
  return (data || []) as MeasurementPointRow[]
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

function buildLegacyEnergyAssetTree({
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
    siteId: site.id,
    source: 'synthetic',
    parentId: null,
    type: 'plant',
    coreNodeType: 'plant',
    nodeRole: 'grouping',
    maintainableKind: null,
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
      siteId: site.id,
      source: 'legacy',
      parentId: nodes.has(parentId) ? parentId : root.id,
      type: nodeType,
      coreNodeType: item.asset_type,
      nodeRole: nodeType === 'equipment' ? 'maintainable' : 'grouping',
      maintainableKind: nodeType === 'equipment' ? 'equipment' : null,
      name: item.name,
      code: item.code,
      utility: item.utility_type,
      status: item.status,
      description: item.description ?? item.category ?? '',
      properties: {
        ...(item.properties || {}),
        asset_role: item.energy_role,
        category: item.category,
      },
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

function buildCoreEnergyAssetTree({
  site,
  coreAssets,
  profiles,
  measurementPoints,
}: {
  site: SiteRow
  coreAssets: CoreAssetRow[]
  profiles: Map<string, EnergyAssetProfileRow>
  measurementPoints: MeasurementPointRow[]
}): EnergyAssetTreeResult {
  const nodes = new Map<string, EnergyAssetTreeNode>()
  const assetsById = new Map(coreAssets.map((asset) => [asset.id, asset]))
  const rootAsset = coreAssets.find((asset) => asset.node_type === 'plant' && !asset.parent_id)
    || coreAssets.find((asset) => !asset.parent_id)

  const root = rootAsset
    ? coreAssetToNode(rootAsset, site, null, profiles.get(rootAsset.id), measurementPoints)
    : createNode({
      id: toNodeId('plant', site.id),
      sourceId: site.id,
      siteId: site.id,
      source: 'synthetic',
      parentId: null,
      type: 'plant',
      coreNodeType: 'plant',
      nodeRole: 'grouping',
      maintainableKind: null,
      name: site.name,
      code: site.code,
      utility: null,
      status: 'active',
      description: site.address,
      properties: {},
      isMeasurementAsset: false,
      measurementPointCount: measurementPoints.length,
      cmmsReadiness: site.code ? 'ready' : 'partial',
      cmmsNotes: site.code ? ['Sede lista para Core'] : ['Agregar codigo de sede'],
    })

  nodes.set(root.id, root)

  for (const asset of coreAssets) {
    if (rootAsset?.id === asset.id) continue
    const parentAsset = asset.parent_id ? assetsById.get(asset.parent_id) : null
    const parentVisualType = parentAsset ? mapCoreNodeToEnergyType(parentAsset) : 'plant'
    const parentId = parentAsset ? toNodeId(parentVisualType, parentAsset.id) : root.id
    const node = coreAssetToNode(
      asset,
      site,
      nodes.has(parentId) ? parentId : root.id,
      profiles.get(asset.id),
      measurementPoints,
    )
    nodes.set(node.id, node)
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
      plants: flatNodes.filter((node) => node.type === 'plant').length,
      areas: flatNodes.filter((node) => node.type === 'area').length,
      systems: flatNodes.filter((node) => node.type === 'system').length,
      equipment: flatNodes.filter((node) => node.type === 'equipment').length,
      measurementPoints: measurementPoints.length,
      cmmsReadyEquipment: flatNodes.filter((node) => node.type === 'equipment' && node.cmmsReadiness === 'ready').length,
    },
  }
}

function coreAssetToNode(
  asset: CoreAssetRow,
  site: SiteRow,
  parentId: string | null,
  profile: EnergyAssetProfileRow | undefined,
  measurementPoints: MeasurementPointRow[],
): EnergyAssetTreeNode {
  const visualType = mapCoreNodeToEnergyType(asset)
  const measurementCount = countMeasurements(measurementPoints, asset.id)
  const isMeasurementAsset = asset.maintainable_kind === 'meter'
    || asset.maintainable_kind === 'instrument'
    || profile?.energy_role === 'measurement_device'
    || profile?.energy_role === 'measurement_subsystem'

  return createNode({
    id: toNodeId(visualType, asset.id),
    sourceId: asset.id,
    siteId: site.id,
    source: 'core',
    parentId,
    type: visualType,
    coreNodeType: asset.node_type,
    nodeRole: asset.node_role,
    maintainableKind: asset.maintainable_kind,
    name: asset.name,
    code: asset.code,
    utility: profile?.utility_type || null,
    status: asset.status,
    description: asset.description ?? asset.category ?? null,
    properties: {
      ...(asset.specs || {}),
      ...(profile?.properties || {}),
      specs: asset.specs || {},
      category: asset.category,
      asset_role: profile?.energy_role || null,
      energy_role: profile?.energy_role || null,
      spec_capacity: profile?.spec_capacity ?? null,
      spec_efficiency: profile?.spec_efficiency ?? null,
      core_node_type: asset.node_type,
      node_role: asset.node_role,
      maintainable_kind: asset.maintainable_kind,
      registry_source: 'core',
    },
    isMeasurementAsset,
    measurementPointCount: measurementCount,
    cmmsReadiness: buildCoreReadiness(asset),
    cmmsNotes: buildCoreNotes(asset, profile, measurementCount, isMeasurementAsset),
  })
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
    point.asset_id === targetId
    || point.scope_asset_id === targetId
    || point.physical_meter_asset_id === targetId
    || point.target_id === targetId
    || point.meter_equipment_id === targetId
  )).length
}

function mapCoreNodeToEnergyType(asset: CoreAssetRow): EnergyAssetNodeType {
  if (asset.node_type === 'plant') return 'plant'
  if (asset.node_role === 'maintainable') return 'equipment'
  if (asset.node_type === 'system') return 'system'
  return 'area'
}

function buildCoreReadiness(asset: CoreAssetRow): CmmsReadiness {
  if (!asset.code) return 'partial'
  if (asset.node_role === 'maintainable' && !asset.maintainable_kind) return 'partial'
  return 'ready'
}

function buildCoreNotes(
  asset: CoreAssetRow,
  profile: EnergyAssetProfileRow | undefined,
  measurementCount: number,
  isMeasurementAsset: boolean,
) {
  const notes: string[] = []
  notes.push(`Core: ${asset.node_type} / ${asset.node_role}`)
  if (asset.maintainable_kind) notes.push(`Mantenible: ${asset.maintainable_kind}`)
  if (profile?.utility_type) notes.push(`Utility: ${profile.utility_type}`)
  if (!profile) notes.push('Sin perfil Energy')
  if (isMeasurementAsset) notes.push('Medidor/instrumento fisico mantenible')
  if (measurementCount > 0) notes.push(`${measurementCount} MeasurementPoint(s)`)
  if (!asset.code) notes.push('Requiere codigo/TAG maestro')
  notes.push('Leido desde Core Asset Registry')
  return notes
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

  const site = await getSiteContext(input.siteId)
  const productMode = await getSiteProductMode(input.siteId)

  if (productMode === 'maint_and_energy' || productMode === 'maint_only') {
    await createAssetRegistryRequest(input, site, name, code, productMode)
    return
  }

  await createCoreAssetFromEnergy(input, site, name, code)
}

async function createCoreAssetFromEnergy(
  input: EnergyAssetCreateInput,
  site: SiteRow,
  name: string,
  code: string,
) {
  const parent = await resolveCoreParentContext(input.siteId, input.parentSourceId)
  const coreShape = getCoreCreateShape(input.kind)

  const { data: asset, error } = await supabase
    .from('assets')
    .insert({
      site_id: input.siteId,
      company_id: site.company_id,
      parent_id: parent.assetId,
      name,
      code,
      node_type: coreShape.nodeType,
      node_role: coreShape.nodeRole,
      maintainable_kind: coreShape.maintainableKind,
      category: coreShape.category,
      status: 'active',
      description: input.description || null,
      specs: {
        created_from: 'versa_energy',
        utility_type: input.utility,
        equipment_type: input.equipmentType || null,
      },
    })
    .select('id')
    .single()

  if (error) throw error
  if (!asset?.id) throw new Error('No se pudo crear el activo Core.')

  await upsertEnergyAssetProfile(asset.id, input)

  if (input.kind === 'meter') {
    await createCoreMeasurementPoint(input, site, asset.id, parent.assetId || asset.id, name, code)
  }
}

async function createAssetRegistryRequest(
  input: EnergyAssetCreateInput,
  site: SiteRow,
  name: string,
  code: string,
  productMode: SiteProductMode,
) {
  const parent = await resolveCoreParentContext(input.siteId, input.parentSourceId)
  const coreShape = getCoreCreateShape(input.kind)
  const payload = {
    name,
    code,
    site_id: input.siteId,
    parent_id: parent.assetId,
    node_type: coreShape.nodeType,
    node_role: coreShape.nodeRole,
    maintainable_kind: coreShape.maintainableKind,
    category: coreShape.category,
    description: input.description || null,
    utility_type: input.utility,
    equipment_type: input.equipmentType || null,
    measurement: input.measurement || null,
    product_mode: productMode,
  }

  const requestType = input.kind === 'meter'
    ? 'create_physical_meter'
    : 'create_physical_asset'

  const { error } = await supabase
    .from('asset_registry_requests')
    .insert({
      company_id: site.company_id,
      site_id: input.siteId,
      requested_from_app: 'versa_energy',
      request_type: requestType,
      proposed_parent_id: parent.assetId,
      proposed_payload: payload,
    })

  if (error) throw error
}

async function upsertEnergyAssetProfile(assetId: string, input: EnergyAssetCreateInput) {
  const { error } = await supabase
    .from('energy_asset_profiles')
    .upsert({
      asset_id: assetId,
      utility_type: input.utility,
      energy_role: input.kind === 'meter' ? 'measurement_device' : inferEnergyRole(input.kind, input.equipmentType),
      properties: {
        equipment_type: input.equipmentType || null,
        created_from_asset_tree: true,
      },
    })

  if (error) throw error
}

async function createCoreMeasurementPoint(
  input: EnergyAssetCreateInput,
  site: SiteRow,
  physicalMeterAssetId: string,
  scopeAssetId: string,
  name: string,
  code: string,
) {
  const measurement = input.measurement
  if (!measurement) throw new Error('Falta la configuracion de medicion.')

  const corePayload = {
    asset_id: scopeAssetId,
    scope_asset_id: scopeAssetId,
    physical_meter_asset_id: physicalMeterAssetId,
    domains: ['energy'],
    name,
    unit: measurement.unit,
    current_value: null,
    requires_energy_validation: false,
    scope_notes: `Creado desde VersaEnergy (${input.utility}).`,
  }

  const { error: coreError } = await supabase.from('measurement_points').insert(corePayload)
  if (!coreError) return

  const legacyPayload = {
    site_id: input.siteId,
    tag: code,
    name,
    target_type: 'equipment',
    target_id: scopeAssetId,
    asset_id: scopeAssetId,
    scope_asset_id: scopeAssetId,
    physical_meter_asset_id: physicalMeterAssetId,
    meter_equipment_id: physicalMeterAssetId,
    domains: ['energy'],
    utility: input.utility,
    measurement_type: measurement.measurementType,
    quantity: measurement.quantity,
    unit: measurement.unit,
    source_type: measurement.sourceMode === 'iot' ? 'iot_db' : 'manual',
    source_config: buildMeterSourceConfig(measurement),
    accumulator_config: buildDefaultAccumulatorConfig(measurement.measurementType),
    last_calibration_date: measurement.lastCalibrationDate || null,
    calibration_due_date: measurement.calibrationDueDate || null,
    properties: {
      cmms_asset_role: 'measurement_device',
      created_from_asset_tree: true,
      capture_mode: measurement.sourceMode,
      site_company_id: site.company_id,
    },
    sync_status: 'pending_sync',
    integration_key: buildIntegrationKey(input.siteId, 'measurement_point', code),
  }

  const { error } = await supabase.from('measurement_points').insert(legacyPayload)
  if (error) throw error
}

async function getSiteContext(siteId: string): Promise<SiteRow> {
  const { data, error } = await supabase
    .from('sites')
    .select('id, company_id, name, code, address')
    .eq('id', siteId)
    .single()
  if (error) throw error
  return data as SiteRow
}

async function getSiteProductMode(siteId: string): Promise<SiteProductMode> {
  const { data, error } = await supabase.rpc('fn_site_product_mode', { p_site_id: siteId })
  if (!error && isSiteProductMode(data)) return data
  return 'energy_only'
}

function isSiteProductMode(value: unknown): value is SiteProductMode {
  return value === 'energy_only'
    || value === 'maint_only'
    || value === 'maint_and_energy'
    || value === 'none'
}

function getCoreCreateShape(kind: EnergyAssetCreateKind) {
  if (kind === 'area') {
    return { nodeType: 'area', nodeRole: 'grouping', maintainableKind: null, category: 'other' }
  }
  if (kind === 'system') {
    return { nodeType: 'system', nodeRole: 'grouping', maintainableKind: null, category: 'other' }
  }
  if (kind === 'meter') {
    return { nodeType: 'meter', nodeRole: 'maintainable', maintainableKind: 'meter', category: 'instrument' }
  }
  return { nodeType: 'equipment', nodeRole: 'maintainable', maintainableKind: 'equipment', category: 'other' }
}

function inferEnergyRole(kind: EnergyAssetCreateKind, equipmentType?: string) {
  if (kind === 'meter') return 'measurement_device'
  if (equipmentType && PRODUCER_EQUIPMENT_TYPES.has(equipmentType)) return 'producer'
  return 'consumer'
}

interface CoreParentContext {
  assetId: string | null
}

async function resolveCoreParentContext(siteId: string, parentSourceId: string): Promise<CoreParentContext> {
  if (parentSourceId === siteId) return { assetId: null }

  const { data, error } = await supabase
    .from('assets')
    .select('id, site_id')
    .eq('site_id', siteId)
    .eq('id', parentSourceId)
    .maybeSingle()

  if (error) throw error
  return { assetId: data?.id || null }
}

export async function createLegacyEnergyAssetFromTree(input: EnergyAssetCreateInput) {
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
    source_type: measurement.sourceMode === 'iot' ? 'iot_db' : 'manual',
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
