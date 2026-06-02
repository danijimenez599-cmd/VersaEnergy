import { useCallback } from 'react'
import { supabase } from '@/services/supabase'
import { useDiagramStore } from './useDiagramStore'
import type { Node, Edge } from '@xyflow/react'
import type { DiagramNodeData, DiagramEdgeData } from '@/services/topology-engine/graphTypes'

const reactFlowNodeTypesByDiagramType: Record<string, string> = {
  connector_pipe: 'connector',
  connector_duct: 'connector',
  connector_cable: 'connector',
  connector_busbar: 'connector',
  header: 'connector',
  manifold: 'connector',
  branch: 'connector',
  junction: 'connector',
  valve: 'control',
  damper: 'control',
  breaker: 'control',
  disconnect: 'control',
  control_valve: 'control',
  regulator: 'control',
  check_valve: 'control',
  flow_meter: 'measurement',
  energy_meter: 'measurement',
  power_meter: 'measurement',
  pressure_sensor: 'measurement',
  temperature_sensor: 'measurement',
  level_sensor: 'measurement',
  current_transformer: 'measurement',
  gas_meter: 'measurement',
  water_meter: 'measurement',
  steam_meter: 'measurement',
  custom_meter: 'measurement',
  area_node: 'organizational',
  process_node: 'organizational',
  production_line: 'organizational',
  area: 'organizational',
  process: 'organizational',
  site: 'organizational',
  cost_center: 'organizational',
  utility_source: 'special',
  loss_node: 'special',
  group: 'special',
  annotation: 'special',
}

function getReactFlowNodeType(nodeType: string): string {
  return reactFlowNodeTypesByDiagramType[nodeType] || 'equipment'
}

export function useDiagramPersistence() {
  const store = useDiagramStore()

  const loadDiagrams = useCallback(async (siteId: string) => {
    const { data } = await supabase
      .from('energy_diagrams')
      .select('id, name, utility_type, status, updated_at')
      .eq('site_id', siteId)
      .order('updated_at', { ascending: false })
    return data || []
  }, [])

  const loadDiagram = useCallback(async (diagramId: string) => {
    const { data: diag } = await supabase
      .from('energy_diagrams')
      .select('*')
      .eq('id', diagramId)
      .single()
    if (!diag) return null

    const { data: nodeRows } = await supabase
      .from('energy_diagram_nodes')
      .select('*')
      .eq('diagram_id', diagramId)

    const { data: edgeRows } = await supabase
      .from('energy_diagram_edges')
      .select('*')
      .eq('diagram_id', diagramId)

    const nodes: Node<DiagramNodeData>[] = (nodeRows || []).map((row) => ({
      id: row.id,
      type: getReactFlowNodeType(row.node_type as string),
      position: { x: Number(row.position_x), y: Number(row.position_y) },
      data: {
        tag: row.tag,
        label: row.label,
        nodeType: row.node_type as DiagramNodeData['nodeType'],
        utility: row.utility || undefined,
        properties: row.properties || {},
      },
    }))

    const edges: Edge<DiagramEdgeData>[] = (edgeRows || []).map((row) => ({
      id: row.id,
      source: row.source_node_id,
      target: row.target_node_id,
      type: 'utility',
      data: {
        edgeType: row.edge_type as DiagramEdgeData['edgeType'],
        utility: row.utility || '',
        tag: row.tag || undefined,
        flowDirection: row.flow_direction as DiagramEdgeData['flowDirection'],
        label: row.label || undefined,
        lossFactor: row.loss_factor || undefined,
        leakFactor: row.leak_factor || undefined,
        properties: row.properties || {},
      },
    }))

    store.setDiagram(diagramId, diag.name, diag.utility_type, diag.status || 'draft')
    store.setNodes(nodes)
    store.setEdges(edges)
    store.markClean()
    return diag
  }, [store])

  const createDiagram = useCallback(async (siteId: string, name: string, utility?: string | null) => {
    const { data } = await supabase
      .from('energy_diagrams')
      .insert({ site_id: siteId, name, utility_type: utility || null, canvas_state: {}, status: 'draft' })
      .select('id, name, utility_type, status')
      .single()
    if (data) {
      store.setDiagram(data.id, data.name, data.utility_type, data.status || 'draft')
      store.setNodes([])
      store.setEdges([])
      store.markClean()
    }
    return data
  }, [store])

  const saveDiagram = useCallback(async () => {
    const { diagramId, nodes, edges, isDirty, diagramName, diagramUtility } = useDiagramStore.getState()
    if (!diagramId || !isDirty) return

    await supabase.from('energy_diagrams').update({
      name: diagramName,
      utility_type: diagramUtility,
      updated_at: new Date().toISOString(),
    }).eq('id', diagramId)

    const existingNodeIds = nodes.map((n) => n.id)
    if (existingNodeIds.length > 0) {
      await supabase.from('energy_diagram_nodes').delete().eq('diagram_id', diagramId).not('id', 'in', `(${existingNodeIds.join(',')})`)
    } else {
      await supabase.from('energy_diagram_nodes').delete().eq('diagram_id', diagramId)
    }

    const existingEdgeIds = edges.map((e) => e.id)
    if (existingEdgeIds.length > 0) {
      await supabase.from('energy_diagram_edges').delete().eq('diagram_id', diagramId).not('id', 'in', `(${existingEdgeIds.join(',')})`)
    } else {
      await supabase.from('energy_diagram_edges').delete().eq('diagram_id', diagramId)
    }

    for (const node of nodes) {
      await supabase.from('energy_diagram_nodes').upsert({
        id: node.id, diagram_id: diagramId,
        node_type: node.data.nodeType as string, tag: node.data.tag,
        utility: node.data.utility, label: node.data.label,
        position_x: node.position.x, position_y: node.position.y,
        properties: node.data.properties || {},
      }, { onConflict: 'id' })
    }

    for (const edge of edges) {
      await supabase.from('energy_diagram_edges').upsert({
        id: edge.id, diagram_id: diagramId,
        source_node_id: edge.source, target_node_id: edge.target,
        edge_type: edge.data?.edgeType || 'pipe', utility: edge.data?.utility || '',
        tag: edge.data?.tag, flow_direction: edge.data?.flowDirection || 'source_to_target',
        label: edge.data?.label, loss_factor: edge.data?.lossFactor,
        leak_factor: edge.data?.leakFactor, properties: edge.data?.properties || {},
      }, { onConflict: 'id' })
    }

    store.markClean()
  }, [store])

  /** Publish: freeze diagram → status = 'published' */
  const publishDiagram = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    const { diagramId, diagramStatus } = useDiagramStore.getState()
    if (!diagramId) return { success: false, message: 'No hay diagrama cargado.' }
    if (diagramStatus !== 'draft') return { success: false, message: 'Solo se pueden publicar diagramas en estado draft.' }

    // Save first if dirty
    const { isDirty } = useDiagramStore.getState()
    if (isDirty) {
      // Use a simple call without callback reference issues
      const { nodes, edges, diagramName, diagramUtility } = useDiagramStore.getState()
      await supabase.from('energy_diagrams').update({
        name: diagramName,
        utility_type: diagramUtility,
        updated_at: new Date().toISOString(),
      }).eq('id', diagramId)
      for (const node of nodes) {
        await supabase.from('energy_diagram_nodes').upsert({
          id: node.id, diagram_id: diagramId,
          node_type: node.data.nodeType as string, tag: node.data.tag,
          utility: node.data.utility, label: node.data.label,
          position_x: node.position.x, position_y: node.position.y,
          properties: node.data.properties || {},
        }, { onConflict: 'id' })
      }
      for (const edge of edges) {
        await supabase.from('energy_diagram_edges').upsert({
          id: edge.id, diagram_id: diagramId,
          source_node_id: edge.source, target_node_id: edge.target,
          edge_type: edge.data?.edgeType || 'pipe', utility: edge.data?.utility || '',
          tag: edge.data?.tag, flow_direction: edge.data?.flowDirection || 'source_to_target',
          label: edge.data?.label, loss_factor: edge.data?.lossFactor,
          leak_factor: edge.data?.leakFactor, properties: edge.data?.properties || {},
        }, { onConflict: 'id' })
      }
      store.markClean()
    }

    const { error } = await supabase.from('energy_diagrams').update({
      status: 'published',
      updated_at: new Date().toISOString(),
    }).eq('id', diagramId)

    if (error) return { success: false, message: error.message }

    store.setStatus('published')
    return { success: true, message: 'Diagrama publicado. La versión queda congelada.' }
  }, [store])

  /** Clone: create new draft from published diagram */
  const cloneDiagram = useCallback(async (diagramId: string, siteId: string): Promise<{ success: boolean; newId?: string }> => {
    // Load source
    const { data: src } = await supabase.from('energy_diagrams').select('*').eq('id', diagramId).single()
    if (!src) return { success: false }

    const { data: nodeRows } = await supabase.from('energy_diagram_nodes').select('*').eq('diagram_id', diagramId)
    const { data: edgeRows } = await supabase.from('energy_diagram_edges').select('*').eq('diagram_id', diagramId)

    // Create new draft
    const { data: newDiag } = await supabase.from('energy_diagrams').insert({
      site_id: siteId,
      name: `${src.name} (copia)`,
      utility_type: src.utility_type,
      canvas_state: {},
      status: 'draft',
    }).select('id').single()

    if (!newDiag) return { success: false }

    // Clone nodes with new IDs
    const nodeIdMap = new Map<string, string>()
    for (const row of nodeRows || []) {
      const newId = crypto.randomUUID()
      nodeIdMap.set(row.id, newId)
      await supabase.from('energy_diagram_nodes').insert({
        id: newId,
        diagram_id: newDiag.id,
        node_type: row.node_type,
        tag: row.tag,
        utility: row.utility,
        label: row.label,
        position_x: row.position_x,
        position_y: row.position_y,
        properties: row.properties || {},
      })
    }

    // Clone edges with remapped node IDs
    for (const row of edgeRows || []) {
      await supabase.from('energy_diagram_edges').insert({
        id: crypto.randomUUID(),
        diagram_id: newDiag.id,
        source_node_id: nodeIdMap.get(row.source_node_id) || row.source_node_id,
        target_node_id: nodeIdMap.get(row.target_node_id) || row.target_node_id,
        edge_type: row.edge_type,
        utility: row.utility,
        tag: row.tag,
        flow_direction: row.flow_direction,
        label: row.label,
        loss_factor: row.loss_factor,
        leak_factor: row.leak_factor,
        properties: row.properties || {},
      })
    }

    return { success: true, newId: newDiag.id }
  }, [])

  const deleteDiagram = useCallback(async (diagramId: string) => {
    await supabase.from('energy_diagrams').delete().eq('id', diagramId)
  }, [])

  return { loadDiagrams, loadDiagram, createDiagram, saveDiagram, deleteDiagram, publishDiagram, cloneDiagram }
}
