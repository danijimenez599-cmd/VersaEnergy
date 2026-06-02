import { useCallback } from 'react'
import { supabase } from '@/services/supabase'
import { useDiagramStore } from './useDiagramStore'
import type { Node, Edge } from '@xyflow/react'
import type { DiagramNodeData, DiagramEdgeData } from '@/services/topology-engine/graphTypes'

export function useDiagramPersistence() {
  const store = useDiagramStore()

  const loadDiagrams = useCallback(async (siteId: string) => {
    const { data } = await supabase
      .from('energy_diagrams')
      .select('id, name, utility_type')
      .eq('site_id', siteId)
      .eq('status', 'draft')
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
      type: 'equipment',
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

    store.setDiagram(diagramId, diag.name, diag.utility_type)
    store.setNodes(nodes)
    store.setEdges(edges)
    store.markClean()
    return diag
  }, [store])

  const createDiagram = useCallback(async (siteId: string, name: string, utility?: string | null) => {
    const { data } = await supabase
      .from('energy_diagrams')
      .insert({ site_id: siteId, name, utility_type: utility || null, canvas_state: {} })
      .select('id, name, utility_type')
      .single()
    if (data) {
      store.setDiagram(data.id, data.name, data.utility_type)
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

  const deleteDiagram = useCallback(async (diagramId: string) => {
    await supabase.from('energy_diagrams').delete().eq('id', diagramId)
  }, [])

  return { loadDiagrams, loadDiagram, createDiagram, saveDiagram, deleteDiagram }
}
