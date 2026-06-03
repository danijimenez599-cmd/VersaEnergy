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
): Promise<LastReading[]> {
  if (!siteId || nodeIds.length === 0) return []

  // 1. Load all MPs targeting these canvas node IDs
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
    .eq('target_type', 'node')
    .in('target_id', nodeIds)
    .eq('is_active', true)

  if (mpError || !mps || mps.length === 0) return []

  const mpIds = mps.map((mp) => mp.id)

  // 2. Load latest reading per MP
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

  // 3. Assemble result — one reading per node (first MP found)
  const byNode = new Map<string, LastReading>()
  for (const mp of mps) {
    const nodeId = mp.target_id as string
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
