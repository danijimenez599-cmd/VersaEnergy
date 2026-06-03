export type UtilityCategory = 'fluid' | 'gas' | 'electrical' | 'thermal' | 'custom'

export type UtilityType =
  | 'electricity'
  | 'natural_gas'
  | 'lpg'
  | 'diesel'
  | 'steam'
  | 'condensate'
  | 'compressed_air'
  | 'chilled_water'
  | 'hot_water'
  | 'industrial_water'
  | 'potable_water'
  | 'process_water'
  | 'refrigeration'
  | 'industrial_gas'
  | 'solar_generation'
  | 'battery_storage'

export interface UtilityDefinition {
  id: string
  name: string
  category: UtilityCategory
  defaultUnit: string
  flowUnits: string[]
  energyUnits?: string[]
  allowedNodeTypes: string[]
  allowedMeterTypes: string[]
  lineStyle: {
    color: string
    strokeWidth: number
    strokeDasharray?: string
  }
}

export type NodeFamily =
  | 'equipment'
  | 'connector'
  | 'control'
  | 'measurement'
  | 'iot'
  | 'organizational'
  | 'special'

export type EquipmentType =
  | 'boiler'
  | 'pump'
  | 'compressor'
  | 'chiller'
  | 'cooling_tower'
  | 'tank'
  | 'transformer'
  | 'panel'
  | 'generator'
  | 'heat_exchanger'
  | 'motor'
  | 'consumer'
  | 'custom_equipment'

export type ConnectorType =
  | 'pipe'
  | 'duct'
  | 'cable'
  | 'busbar'
  | 'header'
  | 'manifold'
  | 'branch'
  | 'junction'

export type ControlType =
  | 'valve'
  | 'damper'
  | 'breaker'
  | 'disconnect'
  | 'control_valve'
  | 'regulator'
  | 'check_valve'

export type MeasurementNodeType =
  | 'flow_meter'
  | 'energy_meter'
  | 'pressure_sensor'
  | 'temperature_sensor'
  | 'level_sensor'
  | 'current_transformer'
  | 'power_meter'
  | 'gas_meter'
  | 'water_meter'
  | 'steam_meter'
  | 'custom_meter'

export type IoTNodeType =
  | 'iot_device'
  | 'gateway'
  | 'plc'
  | 'rtu'
  | 'edge_device'
  | 'virtual_point'
  | 'api_source'
  | 'manual_reading_source'

export type OrganizationalNodeType =
  | 'area'
  | 'process'
  | 'production_line'
  | 'site'
  | 'cost_center'

export type SpecialNodeType =
  | 'utility_source'
  | 'loss_node'
  | 'group'
  | 'annotation'

export type DiagramNodeType =
  | EquipmentType
  | ConnectorType
  | ControlType
  | MeasurementNodeType
  | IoTNodeType
  | OrganizationalNodeType
  | SpecialNodeType
  | 'connector_pipe' | 'connector_duct' | 'connector_cable' | 'connector_busbar'
  | 'area_node' | 'process_node' | 'production_line'

export type DiagramEdgeType =
  | 'pipe'
  | 'cable'
  | 'duct'
  | 'busbar'
  | 'signal'
  | 'logical'

export function isPhysicalEdge(edgeType: string | null | undefined): edgeType is Extract<DiagramEdgeType, 'pipe' | 'cable' | 'duct' | 'busbar'> {
  return edgeType === 'pipe' || edgeType === 'cable' || edgeType === 'duct' || edgeType === 'busbar'
}

export type FlowDirection =
  | 'source_to_target'
  | 'target_to_source'
  | 'bidirectional'
  | 'unknown'

export type MeterAnchorType = 'node' | 'edge'
export type MeterAnchorSide = 'source' | 'load' | 'line' | 'return'

export interface MeterAnchorBinding {
  type: MeterAnchorType
  id: string
  position?: number
  side?: MeterAnchorSide
  offset?: { x: number; y: number }
}

export interface DiagramNodeData {
  [key: string]: unknown
  tag: string
  label: string
  nodeType: DiagramNodeType
  equipmentType?: string
  utility?: string
  properties: Record<string, unknown>
  measurementPointIds?: string[]
}

export interface DiagramEdgeData {
  [key: string]: unknown
  tag?: string
  edgeType: DiagramEdgeType
  utility: string
  flowDirection: FlowDirection
  label?: string
  lineSize?: string
  material?: string
  lossFactor?: number
  leakFactor?: number
  allocationFactor?: number
  properties: Record<string, unknown>
  measurementPointIds?: string[]
}

export type MeasurementType =
  | 'instantaneous'
  | 'accumulator'
  | 'counter'
  | 'status'
  | 'calculated'
  | 'manual'

export type MeasurementQuantity =
  | 'flow'
  | 'volume'
  | 'mass'
  | 'energy'
  | 'power'
  | 'pressure'
  | 'temperature'
  | 'level'
  | 'current'
  | 'voltage'
  | 'runtime'
  | 'custom'

export interface AccumulatorConfig {
  rollover?: {
    enabled: boolean
    maxValue: number
  }
  multiplier: number
  offset: number
  allowNegativeDelta: boolean
  resetDetection: boolean
}

export type MeasurementSource =
  | {
      kind: 'manual'
      frequency: 'daily' | 'weekly' | 'monthly' | 'on_demand'
    }
  | {
      kind: 'iot'
      protocol: 'mqtt' | 'opcua' | 'modbus' | 'http' | 'bacnet'
      address: string
      topic?: string
      nodeId?: string
      register?: string
      pollingSeconds?: number
    }
  | {
      kind: 'calculated'
      formula: string
      inputs: string[]
    }

export interface MeasurementPoint {
  id: string
  site_id: string
  tag: string
  name: string
  target_type: 'node' | 'edge' | 'system' | 'area' | 'equipment'
  target_id: string
  utility: string
  measurement_type: MeasurementType
  quantity: MeasurementQuantity
  unit: string
  source_type: 'manual' | 'iot' | 'calculated'
  source_config: MeasurementSource
  accumulator_config: AccumulatorConfig
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StandardsProfile {
  symbolSet: 'isa-5.1' | 'iec-60617' | 'iso-14617' | 'custom'
  tagSystem: 'isa' | 'iec-81346' | 'custom'
}

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  id: string
  ruleId: string
  severity: ValidationSeverity
  message: string
  targetId?: string
  targetType?: string
}

export interface UtilityEdgeStyle {
  color: string
  width: number
  dash?: string
}

export const NODE_FAMILIES: Record<NodeFamily, { label: string; color: string }> = {
  equipment: { label: 'Equipos', color: 'blue' },
  connector: { label: 'Conectores / Distribución', color: 'teal' },
  control: { label: 'Control / Aislamiento', color: 'orange' },
  measurement: { label: 'Medición', color: 'purple' },
  iot: { label: 'IoT / Datos', color: 'cyan' },
  organizational: { label: 'Organizacional', color: 'gray' },
  special: { label: 'Especial', color: 'red' },
}

// ── Graph Engine Types ──────────────────────────────────────────────

export interface GraphNode {
  id: string
  diagramNodeId: string
  type: DiagramNodeType
  tag: string
  label: string
  utility: string
  properties: Record<string, unknown>
  measurementPoints: MeasurementPoint[]
  incoming: string[]
  outgoing: string[]
  position: { x: number; y: number }
}

export interface GraphEdge {
  id: string
  diagramEdgeId: string
  source: string
  target: string
  type: DiagramEdgeType
  utility: string
  flowDirection: FlowDirection
  isAnnotation: boolean
  label?: string
  lossFactor?: number
  leakFactor?: number
  measurementPoints: MeasurementPoint[]
  properties: Record<string, unknown>
}

export interface MeasurementScope {
  measurementPointId: string
  tag: string
  utility: string
  targets: { type: 'node' | 'edge'; id: string }[]
  coverage: 'direct' | 'indirect' | 'none'
}

export interface BalanceTree {
  rootId: string
  rootTag: string
  utility: string
  children: BalanceTree[]
}

export interface UtilityCompatibilityMap {
  [utility: string]: string[]
}

export interface UtilityGraph {
  id: string
  diagramId: string
  versionId: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  measurementScopes: MeasurementScope[]
  balanceTrees: BalanceTree[]
  validationIssues: ValidationIssue[]
  utilityCompatibilityMap: Record<string, string[]>
}

export interface ValidationContext {
  nodes: GraphNode[]
  edges: GraphEdge[]
  measurementPoints: MeasurementPoint[]
  utilityGraph: UtilityGraph
}

export interface ValidationRule {
  id: string
  severity: ValidationSeverity
  appliesTo: 'node' | 'edge' | 'diagram' | 'measurement'
  check: (ctx: ValidationContext) => ValidationIssue[]
}

// ── Serialization ───────────────────────────────────────────────────

export interface DiagramSnapshot {
  schemaVersion: string
  id: string
  name: string
  versionId: string
  versionNumber: number
  createdAt: string
  canvas: {
    zoom: number
    viewport: { x: number; y: number }
    gridSize: number
  }
  nodes: Record<string, unknown>[]
  edges: Record<string, unknown>[]
  measurementPoints: Record<string, unknown>[]
  standardsProfile: StandardsProfile
  validationSummary: {
    errors: number
    warnings: number
    info: number
  }
}

// ── Versioning ──────────────────────────────────────────────────────

export type DiagramStatus = 'draft' | 'published' | 'archived'

export interface DiagramVersion {
  id: string
  diagramId: string
  versionNumber: number
  status: DiagramStatus
  snapshot: DiagramSnapshot | null
  createdBy: string | null
  createdAt: string
  publishedAt: string | null
}

// ── Unit Conversion ─────────────────────────────────────────────────

export interface UnitConversion {
  fromUnit: string
  toUnit: string
  factor: number
  utility?: string
  isEstimated: boolean
}

// ── Utility Compatibility Rules ─────────────────────────────────────

export interface UtilityRuleSet {
  utility: string
  category: string
  allowedNodeTypes: string[]
  allowedEdgeTypes: string[]
  allowedMeterTypes: string[]
  validFlowUnits: string[]
  validAccumulatorUnits: string[]
  incompatibleWith: string[]
  requiresSource: boolean
  requiresFlowDirection: boolean
}
