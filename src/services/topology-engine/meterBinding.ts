import type { GraphEdge, GraphNode, MeasurementPoint, MeterAnchorBinding, UtilityGraph } from './graphTypes'
import { getDownstreamNodes, getUpstreamNodes } from './graphQueries'

const MEASUREMENT_NODE_TYPES = new Set([
  'flow_meter',
  'energy_meter',
  'power_meter',
  'pressure_sensor',
  'temperature_sensor',
  'level_sensor',
  'current_transformer',
  'gas_meter',
  'water_meter',
  'steam_meter',
  'custom_meter',
])

export type MeterRole = 'boundary' | 'submeter' | 'virtual' | 'unknown'

export interface MeterScope {
  meterNodeId: string
  measurementPointId: string | null
  measurementPoint: MeasurementPoint | null
  measuredNodeId: string
  downstreamNodeIds: string[]
  role: MeterRole
  anchor: MeterAnchorBinding | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function measurementBinding(node: GraphNode): Record<string, unknown> | null {
  const binding = node.properties?.measurement_binding
  return isRecord(binding) ? binding : null
}

function measurementPointIdFromNode(node: GraphNode): string | null {
  const binding = measurementBinding(node)
  const fromBinding = binding?.measurement_point_id
  if (typeof fromBinding === 'string') return fromBinding
  return node.measurementPoints[0]?.id || null
}

function meterAnchorFromNode(node: GraphNode): MeterAnchorBinding | null {
  const binding = measurementBinding(node)
  const nested = binding?.anchor
  if (isRecord(nested)) {
    const type = nested.type === 'edge' || nested.type === 'node' ? nested.type : null
    const id = typeof nested.id === 'string' ? nested.id : null
    if (!type || !id) return null
    const position = typeof nested.position === 'number' ? nested.position : undefined
    const side = nested.side === 'source' || nested.side === 'load' || nested.side === 'line' || nested.side === 'return'
      ? nested.side
      : undefined
    const offsetValue = nested.offset
    const offset = isRecord(offsetValue) &&
      typeof offsetValue.x === 'number' &&
      typeof offsetValue.y === 'number'
      ? { x: offsetValue.x, y: offsetValue.y }
      : undefined
    return { type, id, position, side, offset }
  }

  const type = binding?.anchor_type === 'edge' || binding?.anchor_type === 'node'
    ? binding.anchor_type
    : null
  const id = typeof binding?.anchor_id === 'string' ? binding.anchor_id : null
  if (!type || !id) return null
  const position = typeof binding?.anchor_position === 'number' ? binding.anchor_position : undefined
  const side = binding?.anchor_side === 'source' || binding?.anchor_side === 'load' || binding?.anchor_side === 'line' || binding?.anchor_side === 'return'
    ? binding.anchor_side
    : undefined
  return { type, id, position, side }
}

function roleFromNode(node: GraphNode, mp: MeasurementPoint | null): MeterRole {
  const binding = measurementBinding(node)
  const role = String(binding?.role || node.properties?.meter_role || '')
  if (role === 'boundary' || role === 'submeter' || role === 'virtual') return role
  if (mp?.measurement_type === 'calculated') return 'virtual'
  return 'unknown'
}

function measuredNodeFromMeasurementPoint(graph: UtilityGraph, measurementPointId: string | null): string | null {
  if (!measurementPointId) return null
  const scope = graph.measurementScopes.find((item) => item.measurementPointId === measurementPointId)
  const nodeTarget = scope?.targets.find((target) => target.type === 'node')
  if (nodeTarget) return nodeTarget.id

  const edgeTarget = scope?.targets.find((target) => target.type === 'edge')
  if (!edgeTarget) return null
  const edge = graph.edges.find((item) => item.id === edgeTarget.id)
  if (!edge || edge.isAnnotation) return null
  return downstreamEndpoint(edge)
}

function measuredNodeFromAnchor(graph: UtilityGraph, anchor: MeterAnchorBinding | null): string | null {
  if (!anchor) return null
  if (anchor.type === 'node') {
    return graph.nodes.some((node) => node.id === anchor.id) ? anchor.id : null
  }

  const edge = graph.edges.find((item) => item.id === anchor.id)
  if (!edge || edge.isAnnotation) return null
  return downstreamEndpoint(edge)
}

function downstreamEndpoint(edge: GraphEdge): string {
  return edge.flowDirection === 'target_to_source' ? edge.source : edge.target
}

function measuredNodeFromSignalEdge(graph: UtilityGraph, meterNodeId: string): string | null {
  const signalEdges = graph.edges.filter(
    (edge) => edge.type === 'signal' && (edge.source === meterNodeId || edge.target === meterNodeId),
  )
  const preferred = signalEdges.find((edge) => edge.source === meterNodeId) || signalEdges[0]
  if (!preferred) return null
  return preferred.source === meterNodeId ? preferred.target : preferred.source
}

function measurementPointFromGraph(graph: UtilityGraph, measurementPointId: string | null): MeasurementPoint | null {
  if (!measurementPointId) return null
  for (const node of graph.nodes) {
    const found = node.measurementPoints.find((mp) => mp.id === measurementPointId)
    if (found) return found
  }
  for (const edge of graph.edges) {
    const found = edge.measurementPoints.find((mp) => mp.id === measurementPointId)
    if (found) return found
  }
  return null
}

export function isMeasurementGraphNode(node: GraphNode): boolean {
  return MEASUREMENT_NODE_TYPES.has(node.type as string)
}

export function getMeterScope(graph: UtilityGraph, meterNodeId: string): MeterScope | null {
  const meterNode = graph.nodes.find((node) => node.id === meterNodeId)
  if (!meterNode || !isMeasurementGraphNode(meterNode)) return null

  const measurementPointId = measurementPointIdFromNode(meterNode)
  const measurementPoint = measurementPointFromGraph(graph, measurementPointId)
  const anchor = meterAnchorFromNode(meterNode)
  // 3b: prioridad — 1° signal edge (ETAP-like), 2° anchor JSON, 3° MP target
  const measuredNodeId =
    measuredNodeFromSignalEdge(graph, meterNodeId) ||
    measuredNodeFromAnchor(graph, anchor) ||
    measuredNodeFromMeasurementPoint(graph, measurementPointId)

  if (!measuredNodeId) return null

  const downstreamNodeIds = [
    measuredNodeId,
    ...getDownstreamNodes(measuredNodeId, graph.nodes, graph.edges).map((node) => node.id),
  ]

  return {
    meterNodeId,
    measurementPointId,
    measurementPoint,
    measuredNodeId,
    downstreamNodeIds: [...new Set(downstreamNodeIds)],
    role: roleFromNode(meterNode, measurementPoint),
    anchor,
  }
}

export function getMeterScopes(graph: UtilityGraph): MeterScope[] {
  return graph.nodes
    .filter(isMeasurementGraphNode)
    .map((node) => getMeterScope(graph, node.id))
    .filter((scope): scope is MeterScope => Boolean(scope))
}

export function getMeterScopesByMeasurementPoint(graph: UtilityGraph): Map<string, MeterScope> {
  const map = new Map<string, MeterScope>()
  for (const scope of getMeterScopes(graph)) {
    if (scope.measurementPointId) map.set(scope.measurementPointId, scope)
  }
  return map
}

export function getBoundaryMeterScopes(graph: UtilityGraph): MeterScope[] {
  return getMeterScopes(graph).filter((scope) => scope.role === 'boundary')
}

/**
 * 3c — Auto-detecta si un medidor es frontera o submedidor.
 * Lógica: si hay otro nodo medidor aguas ARRIBA del elemento medido → submeter.
 * Sin medidores upstream → boundary.
 * Resultado 'unknown' si no puede determinar el elemento medido.
 */
export function autoDetectMeterRole(meterNodeId: string, graph: UtilityGraph): MeterRole {
  const scope = getMeterScope(graph, meterNodeId)
  if (!scope) return 'unknown'

  const upstreamNodes = getUpstreamNodes(scope.measuredNodeId, graph.nodes, graph.edges)
  const hasMeterUpstream = upstreamNodes.some((n) => isMeasurementGraphNode(n))

  return hasMeterUpstream ? 'submeter' : 'boundary'
}
