import type { GraphNode, GraphEdge } from './graphTypes'

export interface PathResult {
  path: string[]
  edges: GraphEdge[]
  totalLoss: number
}

export function getConnectedComponent(
  startNodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
): Set<string> {
  const component = new Set<string>()
  const stack: string[] = [startNodeId]
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  while (stack.length > 0) {
    const current = stack.pop()!
    if (component.has(current)) continue
    component.add(current)

    const node = nodeMap.get(current)
    if (!node) continue

    for (const edgeId of [...node.incoming, ...node.outgoing]) {
      const edge = edges.find((e) => e.id === edgeId)
      if (!edge) continue
      const neighbor = edge.source === current ? edge.target : edge.source
      if (!component.has(neighbor)) stack.push(neighbor)
    }
  }

  return component
}

export function getUpstreamNodes(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
): GraphNode[] {
  const result: GraphNode[] = []
  const visited = new Set<string>()
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const queue: string[] = [nodeId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    const node = nodeMap.get(current)
    if (!node) continue

    for (const edgeId of node.incoming) {
      const edge = edges.find((e) => e.id === edgeId)
      if (!edge) continue
      if (edge.flowDirection === 'target_to_source') {
        const targetNode = nodeMap.get(edge.target)
        if (targetNode && !visited.has(targetNode.id)) {
          result.push(targetNode)
          queue.push(targetNode.id)
        }
      } else {
        const sourceNode = nodeMap.get(edge.source)
        if (sourceNode && !visited.has(sourceNode.id)) {
          result.push(sourceNode)
          queue.push(sourceNode.id)
        }
      }
    }
  }

  return result
}

export function getDownstreamNodes(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
): GraphNode[] {
  const result: GraphNode[] = []
  const visited = new Set<string>()
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const queue: string[] = [nodeId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    const node = nodeMap.get(current)
    if (!node) continue

    for (const edgeId of node.outgoing) {
      const edge = edges.find((e) => e.id === edgeId)
      if (!edge) continue
      const nextNode = nodeMap.get(edge.target)
      if (nextNode && !visited.has(nextNode.id)) {
        result.push(nextNode)
        queue.push(nextNode.id)
      }
    }
  }

  return result
}

export function getPath(
  sourceId: string,
  targetId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
): PathResult | null {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const edgeMap = new Map(edges.map((e) => [e.id, e]))

  interface QueueItem {
    nodeId: string
    path: string[]
    pathEdges: GraphEdge[]
  }

  const visited = new Set<string>()
  const queue: QueueItem[] = [{ nodeId: sourceId, path: [sourceId], pathEdges: [] }]

  while (queue.length > 0) {
    const { nodeId, path, pathEdges } = queue.shift()!
    if (nodeId === targetId) {
      return {
        path,
        edges: pathEdges,
        totalLoss: pathEdges.reduce((sum, e) => sum + (e.lossFactor || 0), 0),
      }
    }

    if (visited.has(nodeId)) continue
    visited.add(nodeId)

    const node = nodeMap.get(nodeId)
    if (!node) continue

    for (const edgeId of node.outgoing) {
      const edge = edgeMap.get(edgeId)
      if (!edge) continue
      if (!visited.has(edge.target)) {
        queue.push({
          nodeId: edge.target,
          path: [...path, edge.target],
          pathEdges: [...pathEdges, edge],
        })
      }
    }
  }

  return null
}

export function getMeasuredNodes(nodes: GraphNode[]): GraphNode[] {
  return nodes.filter((n) => n.measurementPoints.length > 0)
}

export function getUnmeasuredNodes(nodes: GraphNode[]): GraphNode[] {
  return nodes.filter((n) => n.measurementPoints.length === 0)
}

export function getNodesByUtility(nodes: GraphNode[], utility: string): GraphNode[] {
  return nodes.filter((n) => n.utility === utility)
}

export function getSourceNodes(nodes: GraphNode[]): GraphNode[] {
  return nodes.filter((n) => n.type === 'utility_source' || (n.incoming.length === 0 && n.outgoing.length > 0))
}

export function getLeafNodes(nodes: GraphNode[]): GraphNode[] {
  return nodes.filter(
    (n) =>
      n.type === 'consumer' ||
      (n.outgoing.length === 0 && n.type !== 'annotation'),
  )
}
