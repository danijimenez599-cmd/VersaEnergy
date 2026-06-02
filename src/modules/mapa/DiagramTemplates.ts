import type { Node, Edge } from '@xyflow/react'
import type { DiagramNodeData, DiagramEdgeData } from '@/services/topology-engine/graphTypes'

// ── Template definition ───────────────────────────────────────────────────────

export interface DiagramTemplate {
  id: string
  name: string
  description: string
  utility: string
  nodeCount: number
  icon: string    // emoji for quick visual
  nodes: Omit<Node<DiagramNodeData>, 'id'>[]   // ids generated at use time
  edges: Array<{ sourceIndex: number; targetIndex: number; data: Partial<DiagramEdgeData> }>
}

// ── Helper to stamp UUIDs and build React Flow nodes/edges ────────────────────

export function instantiateTemplate(template: DiagramTemplate): {
  nodes: Node<DiagramNodeData>[]
  edges: Edge<DiagramEdgeData>[]
} {
  const nodeIds = template.nodes.map(() => crypto.randomUUID())

  const nodes: Node<DiagramNodeData>[] = template.nodes.map((n, i) => ({
    ...n,
    id: nodeIds[i],
  }))

  const edges: Edge<DiagramEdgeData>[] = template.edges.map((e) => ({
    id: crypto.randomUUID(),
    source: nodeIds[e.sourceIndex],
    target: nodeIds[e.targetIndex],
    type: 'utility',
    data: {
      edgeType: 'cable',
      utility: template.utility,
      flowDirection: 'source_to_target',
      ...e.data,
    } as DiagramEdgeData,
  }))

  return { nodes, edges }
}

// ── Template: Eléctrico básico ────────────────────────────────────────────────

const electricTemplate: DiagramTemplate = {
  id: 'electricity_basic',
  name: 'Diagrama eléctrico básico',
  description: 'Fuente → Transformador → Tablero → Consumidores. Plantilla típica para redes eléctricas industriales.',
  utility: 'electricity',
  nodeCount: 5,
  icon: '⚡',
  nodes: [
    {
      type: 'special',
      position: { x: 80, y: 180 },
      data: { nodeType: 'utility_source', label: 'Suministro CFE', tag: 'US-001', utility: 'electricity', properties: {} },
    },
    {
      type: 'equipment',
      position: { x: 300, y: 130 },
      data: { nodeType: 'transformer', label: 'Transformador Principal', tag: 'TR-001', utility: 'electricity', properties: {} },
    },
    {
      type: 'control',
      position: { x: 300, y: 230 },
      data: { nodeType: 'breaker', label: 'Interruptor Principal', tag: 'BR-001', utility: 'electricity', properties: {} },
    },
    {
      type: 'equipment',
      position: { x: 520, y: 180 },
      data: { nodeType: 'panel', label: 'Tablero Principal', tag: 'TP-001', utility: 'electricity', properties: {} },
    },
    {
      type: 'measurement',
      position: { x: 740, y: 180 },
      data: { nodeType: 'energy_meter', label: 'Medidor Energía', tag: 'EM-001', utility: 'electricity', properties: {} },
    },
  ],
  edges: [
    { sourceIndex: 0, targetIndex: 1, data: { edgeType: 'cable', utility: 'electricity', label: 'Entrada HV' } },
    { sourceIndex: 1, targetIndex: 2, data: { edgeType: 'cable', utility: 'electricity' } },
    { sourceIndex: 2, targetIndex: 3, data: { edgeType: 'busbar', utility: 'electricity', label: 'Bus principal' } },
    { sourceIndex: 3, targetIndex: 4, data: { edgeType: 'cable', utility: 'electricity' } },
  ],
}

// ── Template: Red de vapor ────────────────────────────────────────────────────

const steamTemplate: DiagramTemplate = {
  id: 'steam_basic',
  name: 'Red de vapor básica',
  description: 'Caldera → Header → Trampas → Consumidores. Incluye medidores de vapor y condensate loop.',
  utility: 'steam',
  nodeCount: 5,
  icon: '♨️',
  nodes: [
    {
      type: 'special',
      position: { x: 80, y: 180 },
      data: { nodeType: 'utility_source', label: 'Generación Vapor', tag: 'VS-001', utility: 'steam', properties: {} },
    },
    {
      type: 'equipment',
      position: { x: 280, y: 130 },
      data: { nodeType: 'boiler', label: 'Caldera Principal', tag: 'CA-001', utility: 'steam', properties: {} },
    },
    {
      type: 'control',
      position: { x: 280, y: 240 },
      data: { nodeType: 'valve', label: 'V. Control Vapor', tag: 'VC-001', utility: 'steam', properties: {} },
    },
    {
      type: 'connector',
      position: { x: 500, y: 180 },
      data: { nodeType: 'header', label: 'Header Vapor', tag: 'HV-001', utility: 'steam', properties: {} },
    },
    {
      type: 'measurement',
      position: { x: 700, y: 180 },
      data: { nodeType: 'steam_meter', label: 'Med. Vapor Total', tag: 'SM-001', utility: 'steam', properties: {} },
    },
  ],
  edges: [
    { sourceIndex: 0, targetIndex: 1, data: { edgeType: 'pipe', utility: 'steam', label: 'Agua alim.' } },
    { sourceIndex: 1, targetIndex: 2, data: { edgeType: 'pipe', utility: 'steam' } },
    { sourceIndex: 2, targetIndex: 3, data: { edgeType: 'pipe', utility: 'steam', label: 'Vapor saturado' } },
    { sourceIndex: 3, targetIndex: 4, data: { edgeType: 'pipe', utility: 'steam' } },
  ],
}

// ── Template: Aire comprimido ─────────────────────────────────────────────────

const compressedAirTemplate: DiagramTemplate = {
  id: 'compressed_air_basic',
  name: 'Sistema aire comprimido',
  description: 'Compresor → Secador → Tanque → Red de distribución con caudalímetros por zona.',
  utility: 'compressed_air',
  nodeCount: 5,
  icon: '💨',
  nodes: [
    {
      type: 'special',
      position: { x: 80, y: 180 },
      data: { nodeType: 'utility_source', label: 'Sala de Compresores', tag: 'AC-SRC', utility: 'compressed_air', properties: {} },
    },
    {
      type: 'equipment',
      position: { x: 280, y: 180 },
      data: { nodeType: 'compressor', label: 'Compresor Principal', tag: 'CP-001', utility: 'compressed_air', properties: {} },
    },
    {
      type: 'equipment',
      position: { x: 460, y: 130 },
      data: { nodeType: 'tank', label: 'Tanque Acumulador', tag: 'TK-001', utility: 'compressed_air', properties: {} },
    },
    {
      type: 'control',
      position: { x: 460, y: 240 },
      data: { nodeType: 'regulator', label: 'Regulador Presión', tag: 'RP-001', utility: 'compressed_air', properties: {} },
    },
    {
      type: 'measurement',
      position: { x: 660, y: 180 },
      data: { nodeType: 'flow_meter', label: 'Caudalímetro Red', tag: 'FM-001', utility: 'compressed_air', properties: {} },
    },
  ],
  edges: [
    { sourceIndex: 0, targetIndex: 1, data: { edgeType: 'pipe', utility: 'compressed_air', label: 'Aspiración' } },
    { sourceIndex: 1, targetIndex: 2, data: { edgeType: 'pipe', utility: 'compressed_air', label: 'Descarga' } },
    { sourceIndex: 1, targetIndex: 3, data: { edgeType: 'pipe', utility: 'compressed_air' } },
    { sourceIndex: 3, targetIndex: 4, data: { edgeType: 'pipe', utility: 'compressed_air', label: 'Red distr.' } },
  ],
}

// ── Template: Agua industrial ─────────────────────────────────────────────────

const waterTemplate: DiagramTemplate = {
  id: 'industrial_water_basic',
  name: 'Red de agua industrial',
  description: 'Fuente → Bomba → Manifold de distribución por proceso con medidores y válvulas.',
  utility: 'industrial_water',
  nodeCount: 5,
  icon: '💧',
  nodes: [
    {
      type: 'special',
      position: { x: 80, y: 180 },
      data: { nodeType: 'utility_source', label: 'Suministro Agua', tag: 'WS-001', utility: 'industrial_water', properties: {} },
    },
    {
      type: 'equipment',
      position: { x: 280, y: 180 },
      data: { nodeType: 'pump', label: 'Bomba Principal', tag: 'BP-001', utility: 'industrial_water', properties: {} },
    },
    {
      type: 'connector',
      position: { x: 480, y: 180 },
      data: { nodeType: 'manifold', label: 'Manifold Distribución', tag: 'MF-001', utility: 'industrial_water', properties: {} },
    },
    {
      type: 'measurement',
      position: { x: 680, y: 130 },
      data: { nodeType: 'water_meter', label: 'Med. Agua Total', tag: 'WM-001', utility: 'industrial_water', properties: {} },
    },
    {
      type: 'control',
      position: { x: 480, y: 290 },
      data: { nodeType: 'valve', label: 'Válvula Aislamiento', tag: 'VA-001', utility: 'industrial_water', properties: {} },
    },
  ],
  edges: [
    { sourceIndex: 0, targetIndex: 1, data: { edgeType: 'pipe', utility: 'industrial_water', label: 'Succión' } },
    { sourceIndex: 1, targetIndex: 2, data: { edgeType: 'pipe', utility: 'industrial_water', label: 'Impulsión' } },
    { sourceIndex: 2, targetIndex: 3, data: { edgeType: 'pipe', utility: 'industrial_water' } },
    { sourceIndex: 2, targetIndex: 4, data: { edgeType: 'pipe', utility: 'industrial_water' } },
  ],
}

// ── Template: Diagrama en blanco ──────────────────────────────────────────────

const blankTemplate: DiagramTemplate = {
  id: 'blank',
  name: 'Diagrama en blanco',
  description: 'Comienza desde cero. Solo incluye una fuente de suministro inicial.',
  utility: '',
  nodeCount: 1,
  icon: '📋',
  nodes: [
    {
      type: 'special',
      position: { x: 200, y: 200 },
      data: { nodeType: 'utility_source', label: 'Fuente de Suministro', tag: 'SRC-001', properties: {} },
    },
  ],
  edges: [],
}

// ── Exports ───────────────────────────────────────────────────────────────────

export const ALL_TEMPLATES: DiagramTemplate[] = [
  blankTemplate,
  electricTemplate,
  steamTemplate,
  compressedAirTemplate,
  waterTemplate,
]

/** Filter templates relevant to a given utility (blank always included) */
export function getTemplatesForUtility(utility: string): DiagramTemplate[] {
  return ALL_TEMPLATES.filter(
    (t) => t.id === 'blank' || !t.utility || t.utility === utility,
  )
}
