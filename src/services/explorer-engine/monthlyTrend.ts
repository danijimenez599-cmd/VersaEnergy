// ── Monthly Trend Service ─────────────────────────────────────────────────────
// Fetches monthly consumption for a list of measurement point IDs.
// Readings are accumulator (running total) values → monthly consumption = delta
// between consecutive end-of-month readings.

import { supabase } from '@/services/supabase'

export interface MonthlyPoint {
  period: string    // 'YYYY-MM'
  label: string     // 'Ene 25', 'Feb 26', ...
  value: number     // consumption for that month (delta)
  unit: string
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
}

function periodLabel(yyyymm: string): string {
  const [year, mon] = yyyymm.split('-')
  return `${MONTH_LABELS[mon] ?? mon} ${year.slice(2)}`
}

export async function fetchMonthlyTrend(
  mpIds: string[],
  maxMonths = 12,
): Promise<Map<string, MonthlyPoint[]>> {
  if (!mpIds.length) return new Map()

  const cutoff = new Date(Date.now() - (maxMonths + 3) * 31 * 86_400_000).toISOString()
  const currentMonth = new Date().toISOString().slice(0, 7)

  const { data } = await supabase
    .from('measurement_readings')
    .select('measurement_point_id, value, recorded_at')
    .in('measurement_point_id', mpIds)
    .gte('recorded_at', cutoff)
    .order('recorded_at', { ascending: true })

  if (!data || !data.length) return new Map()

  // Group readings by mpId → by YYYY-MM, keeping the latest reading per month
  const byMpMonth = new Map<string, Map<string, { value: number; unit: string }>>()
  for (const r of data as { measurement_point_id: string; value: number; recorded_at: string }[]) {
    const period = (r.recorded_at as string).slice(0, 7)
    if (period >= currentMonth) continue // skip current (incomplete) month
    let mpMap = byMpMonth.get(r.measurement_point_id)
    if (!mpMap) { mpMap = new Map(); byMpMonth.set(r.measurement_point_id, mpMap) }
    mpMap.set(period, { value: Number(r.value), unit: '' })
  }

  // For each mp: sorted month keys → compute deltas
  const result = new Map<string, MonthlyPoint[]>()
  for (const [mpId, monthMap] of byMpMonth) {
    const sorted = Array.from(monthMap.keys()).sort()
    const points: MonthlyPoint[] = []
    for (let i = 1; i < sorted.length; i++) {
      const cur = monthMap.get(sorted[i])!
      const prev = monthMap.get(sorted[i - 1])!
      const delta = cur.value - prev.value
      if (delta >= 0) {
        points.push({ period: sorted[i], label: periodLabel(sorted[i]), value: delta, unit: cur.unit })
      }
    }
    // Return last maxMonths
    result.set(mpId, points.slice(-maxMonths))
  }
  return result
}
