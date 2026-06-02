import type { DiagramSnapshot, UtilityGraph, GraphNode, GraphEdge } from './graphTypes'
import { getIssuesBySeverity } from './validators'

export function createSnapshot(
  diagramId: string,
  diagramName: string,
  versionId: string,
  versionNumber: number,
  graph: UtilityGraph,
  canvasState?: { zoom: number; viewport: { x: number; y: number }; gridSize: number },
): DiagramSnapshot {
  const errors = getIssuesBySeverity(graph.validationIssues, 'error')
  const warnings = getIssuesBySeverity(graph.validationIssues, 'warning')
  const info = getIssuesBySeverity(graph.validationIssues, 'info')

  return {
    schemaVersion: '1.0.0',
    id: diagramId,
    name: diagramName,
    versionId,
    versionNumber,
    createdAt: new Date().toISOString(),
    canvas: canvasState || { zoom: 1, viewport: { x: 0, y: 0 }, gridSize: 16 },
    nodes: graph.nodes.map(serializeNode),
    edges: graph.edges.map(serializeEdge),
    measurementPoints: graph.measurementScopes.map((scope) => ({
      measurementPointId: scope.measurementPointId,
      tag: scope.tag,
      utility: scope.utility,
      targets: scope.targets,
      coverage: scope.coverage,
    })),
    standardsProfile: {
      symbolSet: 'custom',
      tagSystem: 'custom',
    },
    validationSummary: {
      errors: errors.length,
      warnings: warnings.length,
      info: info.length,
    },
  }
}

function serializeNode(node: GraphNode): Record<string, unknown> {
  return {
    id: node.id,
    tag: node.tag,
    label: node.label,
    type: node.type,
    utility: node.utility,
    properties: node.properties,
    measurementPointIds: node.measurementPoints.map((mp) => mp.id),
    incoming: node.incoming,
    outgoing: node.outgoing,
    position: node.position,
  }
}

function serializeEdge(edge: GraphEdge): Record<string, unknown> {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    utility: edge.utility,
    flowDirection: edge.flowDirection,
    label: edge.label,
    lossFactor: edge.lossFactor,
    leakFactor: edge.leakFactor,
    measurementPointIds: edge.measurementPoints.map((mp) => mp.id),
    properties: edge.properties,
  }
}

export function snapshotToJson(snapshot: DiagramSnapshot): string {
  return JSON.stringify(snapshot, null, 2)
}

export function parseSnapshot(json: string): DiagramSnapshot {
  return JSON.parse(json) as DiagramSnapshot
}

export function compareSnapshots(
  prev: DiagramSnapshot,
  next: DiagramSnapshot,
): { addedNodes: number; removedNodes: number; addedEdges: number; removedEdges: number; modifiedNodes: number } {
  const prevNodeIds = new Set(prev.nodes.map((n) => n.id))
  const nextNodeIds = new Set(next.nodes.map((n) => n.id))

  const addedNodes = next.nodes.filter((n) => !prevNodeIds.has(n.id)).length
  const removedNodes = prev.nodes.filter((n) => !nextNodeIds.has(n.id)).length

  const prevEdgeIds = new Set(prev.edges.map((e) => e.id))
  const nextEdgeIds = new Set(next.edges.map((e) => e.id))

  const addedEdges = next.edges.filter((e) => !prevEdgeIds.has(e.id)).length
  const removedEdges = prev.edges.filter((e) => !nextEdgeIds.has(e.id)).length

  const modifiedNodes = next.nodes.filter((n) => {
    const prevNode = prev.nodes.find((p) => p.id === n.id)
    return prevNode && JSON.stringify(prevNode) !== JSON.stringify(n)
  }).length

  return { addedNodes, removedNodes, addedEdges, removedEdges, modifiedNodes }
}
