import type {
  UtilityGraph,
  GraphNode,
  GraphEdge,
  MeasurementScope,
  BalanceTree,
  MeasurementPoint,
} from './graphTypes'
import { validate } from './validators'

interface CompilerInput {
  diagramId: string
  versionId: string
  nodes: {
    id: string
    node_type: string
    tag: string
    label: string
    utility: string | null
    position_x: number
    position_y: number
    properties: Record<string, unknown>
  }[]
  edges: {
    id: string
    source_node_id: string
    target_node_id: string
    edge_type: string
    utility: string | null
    flow_direction: string
    label?: string
    loss_factor?: number
    leak_factor?: number
    properties: Record<string, unknown>
  }[]
  measurementPoints: MeasurementPoint[]
}

export function compileGraph(input: CompilerInput): UtilityGraph {
  const graphNodes: GraphNode[] = input.nodes.map((n) => {
    const nodeMeasPoints = input.measurementPoints.filter(
      (mp) => mp.target_type === 'node' && mp.target_id === n.id,
    )
    return {
      id: n.id,
      diagramNodeId: n.id,
      type: n.node_type as GraphNode['type'],
      tag: n.tag,
      label: n.label,
      utility: n.utility || 'unknown',
      properties: n.properties,
      measurementPoints: nodeMeasPoints,
      incoming: [],
      outgoing: [],
      position: { x: Number(n.position_x), y: Number(n.position_y) },
    }
  })

  const nodeMap = new Map(graphNodes.map((n) => [n.id, n]))

  const graphEdges: GraphEdge[] = input.edges.map((e) => {
    const edgeMeasPoints = input.measurementPoints.filter(
      (mp) => mp.target_type === 'edge' && mp.target_id === e.id,
    )
    return {
      id: e.id,
      diagramEdgeId: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      type: e.edge_type as GraphEdge['type'],
      utility: e.utility || 'unknown',
      flowDirection: e.flow_direction as GraphEdge['flowDirection'],
      label: e.label,
      lossFactor: e.loss_factor || undefined,
      leakFactor: e.leak_factor || undefined,
      measurementPoints: edgeMeasPoints,
      properties: e.properties,
    }
  })

  for (const edge of graphEdges) {
    const sourceNode = nodeMap.get(edge.source)
    const targetNode = nodeMap.get(edge.target)
    if (sourceNode) sourceNode.outgoing.push(edge.id)
    if (targetNode) targetNode.incoming.push(edge.id)
  }

  const measurementScopes: MeasurementScope[] = input.measurementPoints.map((mp) => {
    const targets: { type: 'node' | 'edge'; id: string }[] = []
    if (mp.target_type === 'node' || mp.target_type === 'edge') {
      targets.push({ type: mp.target_type, id: mp.target_id })
    }
    const coverage = targets.length > 0 ? 'direct' : 'none'
    return {
      measurementPointId: mp.id,
      tag: mp.tag,
      utility: mp.utility,
      targets,
      coverage,
    }
  })

  const balanceTrees: BalanceTree[] = []
  const sourceNodes = graphNodes.filter(
    (n) =>
      n.type === 'utility_source' ||
      (n.utility !== 'unknown' && n.outgoing.length > 0 && n.incoming.length === 0),
  )
  for (const source of sourceNodes) {
    balanceTrees.push(buildBalanceTree(source, nodeMap, graphEdges))
  }

  const graph: UtilityGraph = {
    id: input.diagramId,
    diagramId: input.diagramId,
    versionId: input.versionId,
    nodes: graphNodes,
    edges: graphEdges,
    measurementScopes,
    balanceTrees,
    validationIssues: [],
    utilityCompatibilityMap: {},
  }

  graph.validationIssues = validate({
    nodes: graphNodes,
    edges: graphEdges,
    measurementPoints: input.measurementPoints,
    utilityGraph: graph,
  })

  return graph
}

function buildBalanceTree(
  node: GraphNode,
  nodeMap: Map<string, GraphNode>,
  edges: GraphEdge[],
  visited: Set<string> = new Set(),
): BalanceTree {
  const tree: BalanceTree = {
    rootId: node.id,
    rootTag: node.tag,
    utility: node.utility,
    children: [],
  }

  if (visited.has(node.id)) return tree
  visited.add(node.id)

  for (const edgeId of node.outgoing) {
    const edge = edges.find((e) => e.id === edgeId)
    if (!edge) continue
    const childNode = nodeMap.get(edge.target)
    if (!childNode || visited.has(childNode.id)) continue
    tree.children.push(buildBalanceTree(childNode, nodeMap, edges, visited))
  }

  return tree
}

export function compileFromRows(
  diagramId: string,
  versionId: string,
  nodeRows: Record<string, unknown>[],
  edgeRows: Record<string, unknown>[],
  measurementPoints: MeasurementPoint[],
): UtilityGraph {
  return compileGraph({
    diagramId,
    versionId,
    nodes: nodeRows.map((r) => ({
      id: r.id as string,
      node_type: r.node_type as string,
      tag: r.tag as string,
      label: r.label as string,
      utility: r.utility as string | null,
      position_x: Number(r.position_x),
      position_y: Number(r.position_y),
      properties: (r.properties as Record<string, unknown>) || {},
    })),
    edges: edgeRows.map((r) => ({
      id: r.id as string,
      source_node_id: r.source_node_id as string,
      target_node_id: r.target_node_id as string,
      edge_type: r.edge_type as string,
      utility: r.utility as string | null,
      flow_direction: r.flow_direction as string,
      label: r.label as string | undefined,
      loss_factor: r.loss_factor ? Number(r.loss_factor) : undefined,
      leak_factor: r.leak_factor ? Number(r.leak_factor) : undefined,
      properties: (r.properties as Record<string, unknown>) || {},
    })),
    measurementPoints,
  })
}
