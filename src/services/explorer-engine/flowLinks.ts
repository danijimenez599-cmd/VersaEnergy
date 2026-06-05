// flowLinks.ts — Energy flow links between areas.
// A "link" says: "this utility enters area X FROM area Y (or external source Z)."
// Reading all links for a site rebuilds the energy flow diagram as pure data.

import { supabase } from '@/services/supabase'

export interface FlowLink {
  id: string
  fromType: 'area' | 'external'
  fromAreaId: string | null
  fromAreaName: string | null
  fromAreaCode: string | null
  fromName: string | null    // external source name
  fromColor: string | null   // hex hint for external chip
  toAreaId: string
  utility: string
  sortOrder: number
  notes: string | null
}

export interface CreateFlowLinkInput {
  siteId: string
  fromType: 'area' | 'external'
  fromAreaId?: string | null
  fromName?: string | null
  fromColor?: string | null
  toAreaId: string
  utility: string
  sortOrder?: number
  notes?: string | null
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function loadFlowLinks(siteId: string): Promise<FlowLink[]> {
  const { data, error } = await supabase
    .from('energy_flow_links')
    .select(`
      id, from_type, from_area_id, from_name, from_color,
      to_area_id, utility_type, sort_order, notes,
      from_area:energy_areas!energy_flow_links_from_area_id_fkey(name, code)
    `)
    .eq('site_id', siteId)
    .eq('active', true)
    .order('sort_order')

  if (error || !data) return []

  return (data as Record<string, unknown>[]).map((r) => {
    const fromArea = r.from_area && typeof r.from_area === 'object' && !Array.isArray(r.from_area)
      ? r.from_area as { name: string; code: string | null }
      : null
    return {
      id: r.id as string,
      fromType: r.from_type as 'area' | 'external',
      fromAreaId: (r.from_area_id as string | null) ?? null,
      fromAreaName: fromArea?.name ?? null,
      fromAreaCode: fromArea?.code ?? null,
      fromName: (r.from_name as string | null) ?? null,
      fromColor: (r.from_color as string | null) ?? null,
      toAreaId: r.to_area_id as string,
      utility: r.utility_type as string,
      sortOrder: (r.sort_order as number) ?? 0,
      notes: (r.notes as string | null) ?? null,
    }
  })
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createFlowLink(input: CreateFlowLinkInput): Promise<FlowLink | null> {
  const { data, error } = await supabase
    .from('energy_flow_links')
    .insert({
      site_id: input.siteId,
      from_type: input.fromType,
      from_area_id: input.fromAreaId ?? null,
      from_name: input.fromName ?? null,
      from_color: input.fromColor ?? null,
      to_area_id: input.toAreaId,
      utility_type: input.utility,
      sort_order: input.sortOrder ?? 0,
      notes: input.notes ?? null,
    })
    .select(`
      id, from_type, from_area_id, from_name, from_color,
      to_area_id, utility_type, sort_order, notes,
      from_area:energy_areas!energy_flow_links_from_area_id_fkey(name, code)
    `)
    .single()

  if (error || !data) return null
  const d = data as Record<string, unknown>
  const fromArea = d.from_area && typeof d.from_area === 'object' && !Array.isArray(d.from_area)
    ? d.from_area as { name: string; code: string | null }
    : null
  return {
    id: d.id as string,
    fromType: d.from_type as 'area' | 'external',
    fromAreaId: (d.from_area_id as string | null) ?? null,
    fromAreaName: fromArea?.name ?? null,
    fromAreaCode: fromArea?.code ?? null,
    fromName: (d.from_name as string | null) ?? null,
    fromColor: (d.from_color as string | null) ?? null,
    toAreaId: d.to_area_id as string,
    utility: d.utility_type as string,
    sortOrder: (d.sort_order as number) ?? 0,
    notes: (d.notes as string | null) ?? null,
  }
}

// ── Update notes ──────────────────────────────────────────────────────────────

export async function updateFlowLinkNotes(id: string, notes: string): Promise<boolean> {
  const { error } = await supabase
    .from('energy_flow_links')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', id)
  return !error
}

// ── Delete (soft) ─────────────────────────────────────────────────────────────

export async function deleteFlowLink(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('energy_flow_links')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  return !error
}

// ── Area options (for the editor dropdown) ────────────────────────────────────

export interface AreaOption {
  id: string
  name: string
  code: string | null
  parentName: string | null
}

export async function loadAreaOptions(siteId: string): Promise<AreaOption[]> {
  const { data } = await supabase
    .from('energy_areas')
    .select('id, name, code, parent:energy_areas!parent_area_id(name)')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .order('name')

  if (!data) return []
  return (data as Record<string, unknown>[]).map((a) => {
    const parent = a.parent && typeof a.parent === 'object' && !Array.isArray(a.parent)
      ? a.parent as { name: string }
      : null
    return {
      id: a.id as string,
      name: a.name as string,
      code: (a.code as string | null) ?? null,
      parentName: parent?.name ?? null,
    }
  })
}
