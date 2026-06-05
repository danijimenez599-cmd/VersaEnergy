// ── EnPI Engine — Calculator ───────────────────────────────────────────────────
// Lee measurement_readings (MP) o energy_balance_results (balance sheet) como
// numerador, y relevant_variable_readings como denominador.

import { supabase } from '@/services/supabase'
import type { EnPIRefConfig, EnPITrendPoint } from './types'

interface RawReading { value: number; recorded_at: string }
interface RawRelevantReading { period_start: string; period_end: string; value: number; frequency: string }
type TrendFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function buildPeriods(count: number, frequency: TrendFrequency): Array<{ period: string; start: string; end: string }> {
  const result: Array<{ period: string; start: string; end: string }> = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    if (frequency === 'daily') {
      const day = addDays(now, -i)
      result.push({ period: isoDate(day), start: isoDate(day), end: isoDate(day) })
    } else if (frequency === 'weekly') {
      const end = addDays(now, -i * 7)
      const start = addDays(end, -6)
      result.push({ period: isoDate(start), start: isoDate(start), end: isoDate(end) })
    } else if (frequency === 'quarterly') {
      const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1)
      const q = Math.floor(d.getMonth() / 3) + 1
      const start = new Date(d.getFullYear(), (q - 1) * 3, 1)
      const end = new Date(d.getFullYear(), q * 3, 0)
      result.push({ period: `${d.getFullYear()}-T${q}`, start: isoDate(start), end: isoDate(end) })
    } else if (frequency === 'annual') {
      const y = now.getFullYear() - i
      result.push({ period: String(y), start: `${y}-01-01`, end: `${y}-12-31` })
    } else {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = pad(d.getMonth() + 1)
      const start = `${y}-${m}-01`
      const end = isoDate(new Date(y, d.getMonth() + 1, 0))
      result.push({ period: `${y}-${m}`, start, end })
    }
  }
  return result
}

function accumulatorDelta(readings: RawReading[], from: Date, to: Date): number | null {
  const inside = readings
    .filter((r) => { const t = new Date(r.recorded_at); return t >= from && t <= to })
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
  const current = inside[0]
  if (!current) return null
  const before = readings
    .filter((r) => new Date(r.recorded_at) < from)
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0]
  return before ? Math.max(0, Number(current.value) - Number(before.value)) : Number(current.value)
}

async function fetchMPNumerator(
  mpId: string,
  periods: Array<{ period: string; start: string; end: string }>,
): Promise<Record<string, number | null>> {
  const extStart = new Date(periods[0].start)
  extStart.setMonth(extStart.getMonth() - 1)

  const [{ data: mpMeta }, { data: readings }] = await Promise.all([
    supabase.from('measurement_points').select('measurement_type').eq('id', mpId).single(),
    supabase.from('measurement_readings')
      .select('value, recorded_at')
      .eq('measurement_point_id', mpId)
      .gte('recorded_at', extStart.toISOString())
      .lte('recorded_at', periods[periods.length - 1].end + 'T23:59:59')
      .order('recorded_at', { ascending: true }),
  ])

  if (!readings) return {}
  const isAcc = mpMeta?.measurement_type === 'accumulator'

  const result: Record<string, number | null> = {}
  for (const { period, start, end } of periods) {
    const from = new Date(start + 'T00:00:00')
    const to   = new Date(end   + 'T23:59:59')
    if (isAcc) {
      result[period] = accumulatorDelta(readings as RawReading[], from, to)
    } else {
      const inside = (readings as RawReading[]).filter((r) => {
        const t = new Date(r.recorded_at)
        return t >= from && t <= to
      })
      result[period] = inside.length > 0 ? inside.reduce((s, r) => s + Number(r.value), 0) : null
    }
  }
  return result
}

async function fetchBalanceNumerator(
  sheetId: string,
  side: 'input' | 'output' | 'net' | null,
  periods: Array<{ period: string; start: string; end: string }>,
): Promise<Record<string, number | null>> {
  const [{ data: sheet }, { data: results }] = await Promise.all([
    supabase.from('energy_balance_sheets').select('period_start').eq('id', sheetId).single(),
    supabase.from('energy_balance_results')
      .select('total_input_kwh_eq, total_output_kwh_eq, calculated_at')
      .eq('sheet_id', sheetId)
      .order('calculated_at', { ascending: false })
      .limit(1),
  ])
  if (!sheet || !results?.length) return {}

  const sheetPeriod = sheet.period_start.slice(0, 7)
  const r = results[0]
  const val = side === 'output' ? r.total_output_kwh_eq
    : side === 'net' ? (r.total_input_kwh_eq - r.total_output_kwh_eq)
    : r.total_input_kwh_eq

  const byPeriod: Record<string, number | null> = {}
  for (const { period } of periods) {
    byPeriod[period] = period === sheetPeriod ? val : null
  }
  return byPeriod
}

function aggregate(values: number[], method: string): number | null {
  if (values.length === 0) return null
  if (method === 'avg' || method === 'weighted_avg') return values.reduce((s, v) => s + v, 0) / values.length
  if (method === 'min') return Math.min(...values)
  if (method === 'max') return Math.max(...values)
  if (method === 'last') return values[values.length - 1]
  if (method === 'count') return values.length
  if (method === 'delta') return values.length > 1 ? values[values.length - 1] - values[0] : values[0]
  return values.reduce((s, v) => s + v, 0)
}

async function fetchRelevantDenominator(
  variableId: string,
  periods: Array<{ period: string; start: string; end: string }>,
  frequency: TrendFrequency,
): Promise<Record<string, number | null>> {
  const [{ data: variable }, { data: readings }] = await Promise.all([
    supabase
      .from('relevant_variables')
      .select('aggregation_method')
      .eq('id', variableId)
      .single(),
    supabase
      .from('relevant_variable_readings')
      .select('period_start, period_end, value, frequency')
      .eq('variable_id', variableId)
      .eq('frequency', frequency)
      .order('period_start', { ascending: true }),
  ])

  if (!readings) return {}
  const method = variable?.aggregation_method ?? 'sum'
  const byPeriod: Record<string, number | null> = {}
  for (const { period, start, end } of periods) {
    const from = new Date(start + 'T00:00:00')
    const to = new Date(end + 'T23:59:59')
    const values = (readings as RawRelevantReading[])
      .filter((reading) => {
        const readingStart = new Date(reading.period_start)
        return readingStart >= from && readingStart <= to
      })
      .map((reading) => Number(reading.value))
    byPeriod[period] = aggregate(values, method)
  }
  return byPeriod
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function computeEnPITrend(
  config: EnPIRefConfig,
  periodsCount = 12,
  frequency: TrendFrequency = 'monthly',
): Promise<EnPITrendPoint[]> {
  const periods = buildPeriods(periodsCount, frequency)

  let numeratorByPeriod: Record<string, number | null> = {}
  if (config.numerator_type === 'measurement_point' && config.numerator_ref_id) {
    numeratorByPeriod = await fetchMPNumerator(config.numerator_ref_id, periods)
  } else if (config.numerator_type === 'balance_sheet' && config.numerator_ref_id) {
    numeratorByPeriod = await fetchBalanceNumerator(config.numerator_ref_id, config.numerator_side, periods)
  }

  let denominatorByPeriod: Record<string, number | null> = {}
  if (config.denominator_type === 'relevant_variable' && config.denominator_ref_id) {
    denominatorByPeriod = await fetchRelevantDenominator(config.denominator_ref_id, periods, frequency)
  }

  return periods.map(({ period, start, end }) => {
    const num = numeratorByPeriod[period] ?? null
    const den = denominatorByPeriod[period] ?? null
    return {
      period,
      period_start: start,
      period_end: end,
      numerator_value: num,
      denominator_value: den,
      enpi_value: num != null && den != null && den > 0 ? num / den : null,
    }
  })
}
