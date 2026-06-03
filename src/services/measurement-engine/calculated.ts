/**
 * calculated.ts
 * Phase 5 — Engine for calculated measurement points.
 *
 * Fetches all MPs with source_type='calculated' for a site, resolves
 * their input readings, evaluates the formula, and persists the result
 * to measurement_readings with quality='calculated'.
 *
 * Operations supported (in source_config.formula):
 *   'sum'     → sum of all input values
 *   'average' → arithmetic mean of input values
 *   'max'     → maximum value among inputs
 *   'min'     → minimum value among inputs
 *   'ratio'   → inputs[0] / inputs[1]   (first / second)
 *   'product' → product of all input values
 *
 * source_config shape:
 *   { kind: 'calculated', formula: 'sum' | 'average' | 'max' | 'min' | 'ratio' | 'product', inputs: string[] }
 *
 * The engine is intentionally idempotent: it only inserts a new reading
 * if the computed value differs from the last stored result (by >0.01%) or
 * if there is no previous result.
 */

import { supabase } from '@/services/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CalculatedFormula = 'sum' | 'average' | 'max' | 'min' | 'ratio' | 'product'

export interface CalculatedMPConfig {
  kind: 'calculated'
  formula: CalculatedFormula
  inputs: string[]  // array of measurement_point IDs
}

export interface CalculationResult {
  mpId: string
  mpTag: string
  formula: CalculatedFormula
  inputs: string[]
  inputValues: number[]
  result: number | null
  error?: string
  skipped?: boolean  // true if result unchanged
}

// ── Formula evaluator ─────────────────────────────────────────────────────────

export function evaluateFormula(formula: CalculatedFormula, values: number[]): number | null {
  if (values.length === 0) return null

  switch (formula) {
    case 'sum':
      return values.reduce((acc, v) => acc + v, 0)

    case 'average':
      return values.reduce((acc, v) => acc + v, 0) / values.length

    case 'max':
      return Math.max(...values)

    case 'min':
      return Math.min(...values)

    case 'ratio':
      if (values.length < 2) return null
      if (values[1] === 0) return null  // avoid division by zero
      return values[0] / values[1]

    case 'product':
      return values.reduce((acc, v) => acc * v, 1)

    default:
      return null
  }
}

// ── Main engine ───────────────────────────────────────────────────────────────

/**
 * Evaluates all calculated MPs for the given site and persists new readings.
 * Safe to call on a schedule or on demand.
 */
export async function evaluateCalculatedMPs(siteId: string): Promise<CalculationResult[]> {
  if (!siteId) return []

  // 1. Fetch all calculated MPs for this site
  const { data: calcMPs, error: mpErr } = await supabase
    .from('measurement_points')
    .select('id, tag, source_config, unit')
    .eq('site_id', siteId)
    .eq('source_type', 'calculated')
    .eq('is_active', true)

  if (mpErr || !calcMPs || calcMPs.length === 0) return []

  const results: CalculationResult[] = []

  for (const mp of calcMPs) {
    const config = mp.source_config as CalculatedMPConfig | null

    if (!config || config.kind !== 'calculated' || !Array.isArray(config.inputs) || config.inputs.length === 0) {
      results.push({
        mpId: mp.id, mpTag: mp.tag,
        formula: 'sum', inputs: [], inputValues: [],
        result: null, error: 'Invalid source_config',
      })
      continue
    }

    const formula = config.formula || 'sum'
    const inputIds = config.inputs as string[]

    // 2. Fetch latest reading for each input MP
    const { data: readings } = await supabase
      .from('measurement_readings')
      .select('measurement_point_id, value, recorded_at')
      .in('measurement_point_id', inputIds)
      .order('recorded_at', { ascending: false })
      .limit(inputIds.length * 5)

    // Latest per MP
    const latestMap = new Map<string, number>()
    for (const r of readings || []) {
      if (!latestMap.has(r.measurement_point_id) && r.value != null) {
        latestMap.set(r.measurement_point_id, Number(r.value))
      }
    }

    const inputValues = inputIds
      .map((id) => latestMap.get(id))
      .filter((v): v is number => v != null)

    if (inputValues.length === 0) {
      results.push({
        mpId: mp.id, mpTag: mp.tag,
        formula, inputs: inputIds, inputValues: [],
        result: null, error: 'No input readings available',
      })
      continue
    }

    // 3. Evaluate formula
    const computed = evaluateFormula(formula, inputValues)

    if (computed === null) {
      results.push({
        mpId: mp.id, mpTag: mp.tag,
        formula, inputs: inputIds, inputValues,
        result: null, error: 'Formula evaluation returned null',
      })
      continue
    }

    // 4. Check last stored result — skip if same value (avoid noisy readings)
    const { data: lastResult } = await supabase
      .from('measurement_readings')
      .select('value')
      .eq('measurement_point_id', mp.id)
      .order('recorded_at', { ascending: false })
      .limit(1)

    const prevValue = lastResult?.[0]?.value != null ? Number(lastResult[0].value) : null
    const hasChanged = prevValue === null
      || Math.abs(computed - prevValue) / (Math.abs(prevValue) + 1e-10) > 0.0001

    if (!hasChanged) {
      results.push({
        mpId: mp.id, mpTag: mp.tag,
        formula, inputs: inputIds, inputValues,
        result: computed, skipped: true,
      })
      continue
    }

    // 5. Persist new reading
    const { error: insertErr } = await supabase
      .from('measurement_readings')
      .insert({
        measurement_point_id: mp.id,
        value: computed,
        recorded_at: new Date().toISOString(),
        quality: 'calculated',
        notes: `Auto-calculated: ${formula}(${inputIds.join(', ')})`,
      })

    results.push({
      mpId: mp.id, mpTag: mp.tag,
      formula, inputs: inputIds, inputValues,
      result: computed,
      error: insertErr?.message,
    })
  }

  return results
}
