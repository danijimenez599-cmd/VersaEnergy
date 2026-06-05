// ── Balance Sheet Calculator ──────────────────────────────────────────────────
// Lee lecturas de measurement_readings para el período del sheet,
// calcula delta (acumuladores) o suma (instantáneos), convierte a kWh-eq,
// y devuelve un SheetCalcResult listo para persistir o mostrar en UI.

import { supabase } from '@/services/supabase'
// Inline kWh conversion after balance-engine removal
const KWH_FACTORS: Record<string, Record<string, number>> = {
  electricity: { kWh: 1, MWh: 1000, GJ: 277.78 },
  natural_gas: { kWh: 1, MWh: 1000, GJ: 277.78, Nm3: 10.55, m3: 10.55 },
  steam: { kWh: 1, MWh: 1000, GJ: 277.78, kg: 0.778 },
  compressed_air: { kWh: 1, Nm3: 0.1 },
  chilled_water: { kWh: 1, 'TR-h': 3.517, 'kWh_th': 1 },
  hot_water: { kWh: 1, 'kWh_th': 1, GJ: 277.78 },
  industrial_water: { kWh: 0, m3: 0, L: 0 },
  diesel: { kWh: 1, L: 10.08, gal: 38.16, kg: 12 },
  lpg: { kWh: 1, kg: 13.83, L: 7.15 },
}
function convertToKwh(value: number, utility: string, unit: string): number | null {
  const factor = KWH_FACTORS[utility]?.[unit]
  if (factor == null) return null
  return value * factor
}
import type { BalanceSheet, BalanceEntry, EntryCalcResult, SheetCalcResult } from './types'

const UTILITY_LABELS: Record<string, string> = {
  electricity: 'Electricidad', natural_gas: 'Gas natural', steam: 'Vapor',
  compressed_air: 'Aire comp.', chilled_water: 'A. helada', hot_water: 'A. caliente',
  industrial_water: 'A. industrial', diesel: 'Diésel', lpg: 'GLP',
}

interface RawReading {
  measurement_point_id: string
  value: number
  recorded_at: string
  unit?: string | null
}

interface RawMP {
  id: string
  measurement_type: string
  quantity: string
  unit: string
  utility: string
}

// Última lectura dentro del período (inclusive ambos extremos)
function latestInside(readings: RawReading[], from: Date, to: Date): RawReading | null {
  return readings
    .filter((r) => {
      const t = new Date(r.recorded_at).getTime()
      return t >= from.getTime() && t <= to.getTime()
    })
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0] ?? null
}

// Última lectura ANTES del período (para calcular delta)
function latestBefore(readings: RawReading[], before: Date): RawReading | null {
  return readings
    .filter((r) => new Date(r.recorded_at).getTime() < before.getTime())
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0] ?? null
}

// Suma lecturas dentro del período
function sumInside(readings: RawReading[], from: Date, to: Date): number {
  return readings
    .filter((r) => {
      const t = new Date(r.recorded_at).getTime()
      return t >= from.getTime() && t <= to.getTime()
    })
    .reduce((s, r) => s + Number(r.value ?? 0), 0)
}

function consumptionFromReadings(
  readings: RawReading[],
  mp: RawMP,
  from: Date,
  to: Date,
): { value: number; unit: string; coverage: EntryCalcResult['coverage'] } {
  const unit = mp.unit

  if (mp.measurement_type === 'accumulator') {
    const current = latestInside(readings, from, to)
    if (!current) return { value: 0, unit, coverage: 'no_data' }
    const previous = latestBefore(readings, from)
    const delta = previous
      ? Math.max(0, Number(current.value) - Number(previous.value))
      : Number(current.value)
    return { value: delta, unit, coverage: 'measured' }
  }

  if (mp.measurement_type === 'calculated') {
    const sum = sumInside(readings, from, to)
    return { value: sum, unit, coverage: 'measured' }
  }

  // instantaneous → promedio × días (aproximación para balance mensual)
  const inside = readings.filter((r) => {
    const t = new Date(r.recorded_at).getTime()
    return t >= from.getTime() && t <= to.getTime()
  })
  if (inside.length === 0) return { value: 0, unit, coverage: 'no_data' }
  const avg = inside.reduce((s, r) => s + Number(r.value), 0) / inside.length
  return { value: avg, unit, coverage: 'estimated' }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function calculateSheet(sheet: BalanceSheet, entries: BalanceEntry[]): Promise<SheetCalcResult> {
  const from = new Date(sheet.period_start + 'T00:00:00')
  const to   = new Date(sheet.period_end   + 'T23:59:59')

  const mpIds = entries
    .map((e) => e.measurement_point_id)
    .filter((id): id is string => Boolean(id))

  if (mpIds.length === 0) {
    return emptyResult(sheet.id, from, to)
  }

  // Fetch MPs metadata
  const { data: mpRows } = await supabase
    .from('measurement_points')
    .select('id, measurement_type, quantity, unit, utility')
    .in('id', mpIds)

  const mpMap = new Map<string, RawMP>((mpRows ?? []).map((m) => [m.id, m]))

  // Fetch readings — ventana ampliada (1 mes antes) para capturar lectura previa de acumuladores
  const windowStart = new Date(from)
  windowStart.setMonth(windowStart.getMonth() - 1)

  const { data: readingRows } = await supabase
    .from('measurement_readings')
    .select('measurement_point_id, value, recorded_at')
    .in('measurement_point_id', mpIds)
    .gte('recorded_at', windowStart.toISOString())
    .lte('recorded_at', to.toISOString())
    .order('recorded_at', { ascending: true })

  const readingsByMp = new Map<string, RawReading[]>()
  for (const r of readingRows ?? []) {
    const list = readingsByMp.get(r.measurement_point_id) ?? []
    list.push(r)
    readingsByMp.set(r.measurement_point_id, list)
  }

  // Calcular por entry
  const entryResults: EntryCalcResult[] = []
  const byUtility: Record<string, { input_kwh: number; output_kwh: number; label: string }> = {}

  for (const entry of entries) {
    const mpId = entry.measurement_point_id
    const mp = mpId ? mpMap.get(mpId) : undefined
    const label = entry.label ?? entry.measurement_point?.tag ?? entry.equipment?.tag ?? '—'

    if (!mp || !mpId) {
      entryResults.push({
        entry_id: entry.id, side: entry.side,
        measurement_point_id: null, label,
        utility: '', value: 0, unit: '', value_kwh_eq: null, coverage: 'no_data',
      })
      continue
    }

    const readings = readingsByMp.get(mpId) ?? []
    const { value, unit, coverage } = consumptionFromReadings(readings, mp, from, to)
    const kwh = convertToKwh(value, mp.utility, unit)

    entryResults.push({
      entry_id: entry.id, side: entry.side,
      measurement_point_id: mpId, label,
      utility: mp.utility, value, unit, value_kwh_eq: kwh ?? null, coverage,
    })

    // Acumular by_utility
    if (!byUtility[mp.utility]) {
      byUtility[mp.utility] = { input_kwh: 0, output_kwh: 0, label: UTILITY_LABELS[mp.utility] ?? mp.utility }
    }
    if (kwh != null) {
      if (entry.side === 'input') byUtility[mp.utility].input_kwh += kwh
      else                       byUtility[mp.utility].output_kwh += kwh
    }
  }

  // Totales
  const inputEntries  = entryResults.filter((e) => e.side === 'input')
  const outputEntries = entryResults.filter((e) => e.side === 'output')

  const totalInputKwh  = inputEntries.reduce((s, e) => s + (e.value_kwh_eq ?? 0), 0)
  const totalOutputKwh = outputEntries.reduce((s, e) => s + (e.value_kwh_eq ?? 0), 0)
  const unaccountedKwh = Math.max(0, totalInputKwh - totalOutputKwh)
  const unaccountedPct = totalInputKwh > 0 ? (unaccountedKwh / totalInputKwh) * 100 : 0

  const measuredEntries = entryResults.filter((e) => e.side === 'input' && e.coverage === 'measured')
  const coverage = totalInputKwh > 0
    ? (measuredEntries.reduce((s, e) => s + (e.value_kwh_eq ?? 0), 0) / totalInputKwh) * 100
    : 0

  // Totales en unidad nativa (solo si todas las entries son del mismo utility)
  const utilities = [...new Set(entryResults.map((e) => e.utility).filter(Boolean))]
  let totalInput: number | null = null
  let totalOutput: number | null = null
  let unit: string | null = null

  if (utilities.length === 1) {
    totalInput  = inputEntries.reduce((s, e) => s + e.value, 0)
    totalOutput = outputEntries.reduce((s, e) => s + e.value, 0)
    unit = inputEntries[0]?.unit ?? outputEntries[0]?.unit ?? null
  }

  return {
    sheet_id: sheet.id,
    period: { from, to },
    entries: entryResults,
    total_input: totalInput,
    total_output: totalOutput,
    unit,
    total_input_kwh_eq: totalInputKwh,
    total_output_kwh_eq: totalOutputKwh,
    unaccounted_for_kwh_eq: unaccountedKwh,
    unaccounted_for_pct: unaccountedPct,
    measurement_coverage: coverage,
    by_utility: byUtility,
  }
}

function emptyResult(sheet_id: string, from: Date, to: Date): SheetCalcResult {
  return {
    sheet_id, period: { from, to }, entries: [],
    total_input: null, total_output: null, unit: null,
    total_input_kwh_eq: 0, total_output_kwh_eq: 0,
    unaccounted_for_kwh_eq: 0, unaccounted_for_pct: 0,
    measurement_coverage: 0, by_utility: {},
  }
}

// Persiste el resultado en energy_balance_results y actualiza entries con valores
export async function persistResult(result: SheetCalcResult): Promise<void> {
  const { sheet_id, total_input, total_output, unit,
    total_input_kwh_eq, total_output_kwh_eq,
    unaccounted_for_kwh_eq, unaccounted_for_pct,
    measurement_coverage, by_utility } = result

  await supabase.from('energy_balance_results').insert({
    sheet_id,
    total_input, total_output, unit,
    total_input_kwh_eq, total_output_kwh_eq,
    unaccounted_for: total_input != null && total_output != null ? Math.max(0, total_input - total_output) : null,
    unaccounted_for_kwh_eq,
    unaccounted_for_pct,
    measurement_coverage,
    by_utility,
  })

  // Actualizar valores calculados en cada entry
  for (const e of result.entries) {
    if (!e.entry_id) continue
    await supabase
      .from('energy_balance_entries')
      .update({ value: e.value, unit: e.unit, value_kwh_eq: e.value_kwh_eq })
      .eq('id', e.entry_id)
  }
}

