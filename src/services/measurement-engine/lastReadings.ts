import { supabase } from '@/services/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

export type ReadingQuality = 'good' | 'delayed' | 'missing' | 'none'

export interface LastReading {
  nodeId: string           // canvas node ID (target_id of the linked MP)
  mpId: string
  mpTag: string
  name: string
  value: number | null
  unit: string
  measurementType: string  // 'accumulator' | 'instantaneous' | etc.
  quantity: string
  timestamp: string | null // ISO string of the last reading
  quality: ReadingQuality
  calibrationDueDate: string | null
  sourceType: string       // 'manual' | 'iot_db' | 'api_pull' | 'api_push' | 'file_import' | 'calculated'
}

// ── Quality calculation ──────────────────────────────────────────────────────

function calcQuality(timestamp: string | null, frequencyHours = 2): ReadingQuality {
  if (!timestamp) return 'missing'
  const ageMs = Date.now() - new Date(timestamp).getTime()
  const ageH = ageMs / 3_600_000
  if (ageH < 2 * frequencyHours) return 'good'
  if (ageH < 4 * frequencyHours) return 'delayed'
  return 'missing'
}

// ── Main service ─────────────────────────────────────────────────────────────

/**
 * Fetches the last reading for each canvas node in `nodeIds` by looking up
 * measurement_points with target_type='node' and target_id IN nodeIds,
 * then joining with the latest measurement_readings row per point.
 */
export async function getLastReadings(
  siteId: string,
  nodeIds: string[],
  diagramId?: string | null,
): Promise<LastReading[]> {
  if (!siteId || nodeIds.length === 0) return []

  const nodeIdsByMpId = new Map<string, string>()

  // 1. Diagram bindings are the presentation contract: any MP can be shown on
  // a canvas node without changing what the MP truly measures in the model.
  if (diagramId) {
    const { data: bindings } = await supabase
      .from('energy_diagram_measurement_bindings')
      .select('measurement_point_id, target_id')
      .eq('diagram_id', diagramId)
      .eq('target_type', 'node')
      .in('target_id', nodeIds)

    for (const binding of bindings || []) {
      if (!nodeIdsByMpId.has(binding.measurement_point_id)) {
        nodeIdsByMpId.set(binding.measurement_point_id, binding.target_id)
      }
    }
  }

  // 2. Legacy/direct canvas-node MPs still work.
  const { data: directMps, error: directError } = await supabase
    .from('measurement_points')
    .select(`
      id,
      tag,
      name,
      unit,
      measurement_type,
      quantity,
      source_type,
      target_id,
      calibration_due_date,
      is_active
    `)
    .eq('site_id', siteId)
    .eq('target_type', 'node')
    .in('target_id', nodeIds)
    .eq('is_active', true)

  if (!directError) {
    for (const mp of directMps || []) {
      if (!nodeIdsByMpId.has(mp.id)) nodeIdsByMpId.set(mp.id, mp.target_id as string)
    }
  }

  const boundMpIds = Array.from(nodeIdsByMpId.keys())
  if (boundMpIds.length === 0) return []

  // 3. Load MP metadata for all resolved IDs.
  const { data: mps, error: mpError } = await supabase
    .from('measurement_points')
    .select(`
      id,
      tag,
      name,
      unit,
      measurement_type,
      quantity,
      source_type,
      target_id,
      calibration_due_date,
      is_active
    `)
    .eq('site_id', siteId)
    .in('id', boundMpIds)
    .eq('is_active', true)

  if (mpError || !mps || mps.length === 0) return []

  const mpIds = mps.map((mp) => mp.id)

  // 4. Load latest reading per MP
  // We fetch the last reading for each MP using order + limit trick with a
  // separate query per MP would be expensive; instead we fetch recent readings
  // and pick the latest per mpId on the client side.
  const { data: readings } = await supabase
    .from('measurement_readings')
    .select('measurement_point_id, value, recorded_at')
    .in('measurement_point_id', mpIds)
    .order('recorded_at', { ascending: false })
    .limit(mpIds.length * 5) // allow some history to find the latest per MP

  // Build map: mpId → latest reading
  const latestByMp = new Map<string, { value: number | null; recorded_at: string }>()
  for (const r of readings || []) {
    if (!latestByMp.has(r.measurement_point_id)) {
      latestByMp.set(r.measurement_point_id, { value: r.value, recorded_at: r.recorded_at })
    }
  }

  // 5. Assemble result — one reading per canvas node (first MP found)
  const byNode = new Map<string, LastReading>()
  for (const mp of mps) {
    const nodeId = nodeIdsByMpId.get(mp.id) || (mp.target_id as string)
    if (byNode.has(nodeId)) continue // take first MP per node
    const latest = latestByMp.get(mp.id)
    byNode.set(nodeId, {
      nodeId,
      mpId: mp.id,
      mpTag: mp.tag,
      name: mp.name,
      value: latest?.value ?? null,
      unit: mp.unit,
      measurementType: mp.measurement_type,
      quantity: mp.quantity,
      timestamp: latest?.recorded_at ?? null,
      quality: calcQuality(latest?.recorded_at ?? null),
      calibrationDueDate: (mp.calibration_due_date as string) ?? null,
      sourceType: (mp.source_type as string) || 'manual',
    })
  }

  return Array.from(byNode.values())
}

// ── Quality style helpers ────────────────────────────────────────────────────

export const QUALITY_COLORS: Record<ReadingQuality, string> = {
  good:    '#15803d', // green-700
  delayed: '#b45309', // amber-700
  missing: '#b91c1c', // red-700
  none:    '#6b7280', // gray-500
}

export const QUALITY_LABELS: Record<ReadingQuality, string> = {
  good:    'Actualizado',
  delayed: 'Con retraso',
  missing: 'Sin datos',
  none:    'Sin medidor',
}

// ── Relative time helper ─────────────────────────────────────────────────────

export function relativeTime(isoTimestamp: string | null): string {
  if (!isoTimestamp) return '—'
  const diffMs = Date.now() - new Date(isoTimestamp).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}
