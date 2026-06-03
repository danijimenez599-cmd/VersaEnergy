import { supabase } from './supabase'
import type { Node, Edge } from '@xyflow/react'
import type { DiagramNodeData, DiagramEdgeData } from './topology-engine/graphTypes'

export interface DiagramVersionMeta {
  id: string
  diagram_id: string
  version_number: number
  label: string | null
  is_published: boolean
  node_count: number
  edge_count: number
  created_at: string
  created_by: string | null
}

export interface DiagramSnapshot {
  nodes: Node<DiagramNodeData>[]
  edges: Edge<DiagramEdgeData>[]
}

/** Lista las versiones de un diagrama (metadata, sin el snapshot completo). */
export async function listVersions(diagramId: string): Promise<DiagramVersionMeta[]> {
  const { data } = await supabase
    .from('energy_diagram_versions')
    .select('id, diagram_id, version_number, label, is_published, node_count, edge_count, created_at, created_by')
    .eq('diagram_id', diagramId)
    .order('version_number', { ascending: false })
  return (data || []) as DiagramVersionMeta[]
}

/** Devuelve el snapshot (nodes + edges) de una versión específica. */
export async function getVersionSnapshot(versionId: string): Promise<DiagramSnapshot | null> {
  const { data } = await supabase
    .from('energy_diagram_versions')
    .select('snapshot')
    .eq('id', versionId)
    .single()
  if (!data?.snapshot) return null
  const snap = data.snapshot as Partial<DiagramSnapshot>
  return { nodes: snap.nodes || [], edges: snap.edges || [] }
}

/**
 * Crea una nueva versión (snapshot inmutable) del estado actual del diagrama.
 * Calcula el siguiente version_number automáticamente.
 */
export async function saveVersion(
  diagramId: string,
  nodes: Node<DiagramNodeData>[],
  edges: Edge<DiagramEdgeData>[],
  opts: { label?: string; isPublished?: boolean } = {},
): Promise<DiagramVersionMeta | null> {
  // Siguiente número de versión
  const { data: last } = await supabase
    .from('energy_diagram_versions')
    .select('version_number')
    .eq('diagram_id', diagramId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextNumber = (last?.version_number ?? 0) + 1

  const { data: profile } = await supabase.auth.getUser()
  const createdBy = profile?.user?.id ?? null

  const { data, error } = await supabase
    .from('energy_diagram_versions')
    .insert({
      diagram_id: diagramId,
      version_number: nextNumber,
      label: opts.label ?? null,
      is_published: opts.isPublished ?? false,
      snapshot: { nodes, edges },
      node_count: nodes.length,
      edge_count: edges.length,
      created_by: createdBy,
    })
    .select('id, diagram_id, version_number, label, is_published, node_count, edge_count, created_at, created_by')
    .single()

  if (error) {
    console.error('saveVersion error', error)
    return null
  }
  return data as DiagramVersionMeta
}

/** Marca una versión como la publicada/oficial (desmarca las demás). */
export async function markVersionPublished(diagramId: string, versionId: string): Promise<void> {
  await supabase.from('energy_diagram_versions').update({ is_published: false }).eq('diagram_id', diagramId)
  await supabase.from('energy_diagram_versions').update({ is_published: true }).eq('id', versionId)
}
