import Dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'

// Dimensiones aproximadas por tipo de nodo React Flow (para que Dagre
// reserve el espacio correcto y no se traslapen). Se sobredimensiona un poco
// para garantizar holgura visual entre tarjetas y globos de medición.
const NODE_SIZE: Record<string, { width: number; height: number }> = {
  equipment:      { width: 184, height: 76 },
  special:        { width: 184, height: 108 },
  organizational: { width: 176, height: 64 },
  measurement:    { width: 96,  height: 104 }, // globo ISA + valor + holgura
  control:        { width: 64,  height: 64 },
  connector:      { width: 48,  height: 48 },
}

function sizeFor(node: Node): { width: number; height: number } {
  return NODE_SIZE[node.type || 'equipment'] || NODE_SIZE.equipment
}

export type LayoutDirection = 'LR' | 'TB'

/**
 * Reacomoda los nodos en capas sin traslapes usando Dagre.
 * - `LR` (izquierda→derecha) es lo natural para diagramas de flujo de utilities.
 * - Devuelve copias de los nodos con `position` actualizada.
 */
export function layoutNodes(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = 'TB',
): Node[] {
  if (nodes.length === 0) return nodes

  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: direction,
    nodesep: 64,    // separación entre nodos de la misma capa
    ranksep: 130,   // separación entre capas (holgura para flechas y labels)
    edgesep: 24,
    marginx: 40,
    marginy: 40,
    ranker: 'network-simplex',
  })

  nodes.forEach((node) => {
    const { width, height } = sizeFor(node)
    g.setNode(node.id, { width, height })
  })

  edges.forEach((edge) => {
    if (edge.source && edge.target) g.setEdge(edge.source, edge.target)
  })

  Dagre.layout(g)

  return nodes.map((node) => {
    const pos = g.node(node.id)
    if (!pos) return node
    const { width, height } = sizeFor(node)
    // Dagre da el centro; React Flow espera la esquina superior izquierda.
    return {
      ...node,
      position: { x: pos.x - width / 2, y: pos.y - height / 2 },
    }
  })
}

// IDs de handles estándar en todos los nodos (ver nodes/index.tsx).
const HANDLES = {
  TB: { source: 's-bottom', target: 't-top' },
  LR: { source: 's-right', target: 't-left' },
}

/**
 * Ajusta los handles de cada arista según la orientación, para que en vertical
 * las líneas salgan por abajo y entren por arriba, y en horizontal por los lados.
 */
export function orientEdges(edges: Edge[], direction: LayoutDirection = 'TB'): Edge[] {
  const h = HANDLES[direction]
  return edges.map((e) => ({ ...e, sourceHandle: h.source, targetHandle: h.target }))
}

/** Detecta si dos o más nodos se traslapan (bounding boxes con margen). */
export function hasOverlaps(nodes: Node[], margin = 8): boolean {
  const boxes = nodes.map((n) => {
    const { width, height } = sizeFor(n)
    return { x: n.position.x, y: n.position.y, w: width, h: height }
  })
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]
      const overlapX = a.x < b.x + b.w + margin && a.x + a.w + margin > b.x
      const overlapY = a.y < b.y + b.h + margin && a.y + a.h + margin > b.y
      if (overlapX && overlapY) return true
    }
  }
  return false
}
