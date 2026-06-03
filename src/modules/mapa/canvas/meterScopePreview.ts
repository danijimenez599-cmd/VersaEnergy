import type { Edge, Node } from '@xyflow/react'
import type { DiagramEdgeData, DiagramNodeData, MeterAnchorBinding } from '@/services/topology-engine/graphTypes'
import { compileFromRows } from '@/services/topology-engine/compiler'
import { getMeterScope, type MeterScope } from '@/services/topology-engine/meterBinding'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function getMeterAnchorFromNodeData(data: DiagramNodeData): MeterAnchorBinding | null {
  const binding = data.properties?.measurement_binding
  if (!isRecord(binding)) return null

  const nested = binding.anchor
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

  const type = binding.anchor_type === 'edge' || binding.anchor_type === 'node'
    ? binding.anchor_type
    : null
  const id = typeof binding.anchor_id === 'string' ? binding.anchor_id : null
  if (!type || !id) return null
  const position = typeof binding.anchor_position === 'number' ? binding.anchor_position : undefined
  const side = binding.anchor_side === 'source' || binding.anchor_side === 'load' || binding.anchor_side === 'line' || binding.anchor_side === 'return'
    ? binding.anchor_side
    : undefined
  return { type, id, position, side }
}

export function getMeterNodesAnchoredToEdge(
  nodes: Node<DiagramNodeData>[],
  edgeId: string,
): Node<DiagramNodeData>[] {
  return nodes.filter((node) => {
    const anchor = getMeterAnchorFromNodeData(node.data)
    return anchor?.type === 'edge' && anchor.id === edgeId
  })
}

export function getSelectedMeterScope(
  nodes: Node<DiagramNodeData>[],
  edges: Edge<DiagramEdgeData>[],
  selectedElement: { type: 'node' | 'edge'; id: string } | null,
): MeterScope | null {
  if (selectedElement?.type !== 'node') return null

  const graph = compileFromRows(
    'canvas-preview',
    'canvas-preview',
    nodes.map((node) => ({
      id: node.id,
      node_type: String(node.data.nodeType),
      tag: node.data.tag,
      label: node.data.label,
      utility: (node.data.utility as string) || null,
      position_x: node.position.x,
      position_y: node.position.y,
      properties: node.data.properties || {},
    })),
    edges.map((edge) => ({
      id: edge.id,
      source_node_id: edge.source,
      target_node_id: edge.target,
      edge_type: String(edge.data?.edgeType || 'pipe'),
      utility: edge.data?.utility || null,
      flow_direction: String(edge.data?.flowDirection || 'source_to_target'),
      label: edge.data?.label,
      loss_factor: edge.data?.lossFactor,
      leak_factor: edge.data?.leakFactor,
      properties: edge.data?.properties || {},
    })),
    [],
  )

  return getMeterScope(graph, selectedElement.id)
}
