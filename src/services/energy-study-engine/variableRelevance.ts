import type { EnPITrendPoint } from '@/services/enpi-engine'
import type { StudyVariableCandidate } from './types'

interface VariableInput {
  id: string | null
  name: string
  unit: string
  selected?: boolean
  trend: EnPITrendPoint[]
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]): number | null {
  if (values.length < 2) return null
  const avg = average(values)
  if (avg == null) return null
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

function correlation(xs: number[], ys: number[]): number | null {
  if (xs.length < 3 || xs.length !== ys.length) return null
  const avgX = average(xs)
  const avgY = average(ys)
  if (avgX == null || avgY == null) return null
  const numerator = xs.reduce((sum, x, index) => sum + (x - avgX) * (ys[index] - avgY), 0)
  const denomX = xs.reduce((sum, x) => sum + (x - avgX) ** 2, 0)
  const denomY = ys.reduce((sum, y) => sum + (y - avgY) ** 2, 0)
  const denominator = Math.sqrt(denomX * denomY)
  if (denominator === 0) return null
  return Math.max(-1, Math.min(1, numerator / denominator))
}

function recommendation(relevance: number, coverage: number, corr: number | null): StudyVariableCandidate['recommendation'] {
  if (coverage < 35) return 'needs_data'
  if (relevance >= 75) return 'primary_driver'
  if (relevance >= 58) return 'secondary_driver'
  if (corr != null && Math.abs(corr) >= 0.25) return 'monitor_only'
  return 'reject'
}

export function buildVariableCandidates(inputs: VariableInput[]): StudyVariableCandidate[] {
  const ranked = inputs.map((input): StudyVariableCandidate => {
    const valid = input.trend.filter((point) => (
      point.numerator_value != null &&
      point.denominator_value != null &&
      point.enpi_value != null &&
      Number.isFinite(point.numerator_value) &&
      Number.isFinite(point.denominator_value) &&
      Number.isFinite(point.enpi_value)
    ))
    const numeratorValues = valid.map((point) => point.numerator_value as number)
    const denominatorValues = valid.map((point) => point.denominator_value as number)
    const ratioValues = valid.map((point) => point.enpi_value as number)
    const corr = correlation(denominatorValues, numeratorValues)
    const avgRatio = average(ratioValues)
    const stdevRatio = standardDeviation(ratioValues)
    const ratioCvPercent = avgRatio && stdevRatio ? Math.abs((stdevRatio / avgRatio) * 100) : null
    const coverage = input.trend.length > 0 ? Math.round((valid.length / input.trend.length) * 100) : 0
    const stability = ratioCvPercent == null ? 45 : Math.max(0, Math.min(100, 100 - ratioCvPercent))
    const corrScore = corr == null ? 0 : Math.abs(corr) * 100
    const relevance = Math.round((coverage * 0.35) + (corrScore * 0.4) + (stability * 0.25))

    return {
      variableRefId: input.id,
      label: input.name,
      unit: input.unit,
      variableType: 'relevant_variable',
      physicalRationale: 'Variable relevante disponible en Supabase; requiere validacion del ingeniero antes de gobernar EnPI.',
      coveragePercent: coverage,
      correlationScore: corr,
      stabilityScore: Math.round(stability),
      relevanceScore: relevance,
      selected: Boolean(input.selected),
      recommendation: recommendation(relevance, coverage, corr),
      statistics: {
        validPointCount: valid.length,
        numeratorPointCount: input.trend.filter((point) => point.numerator_value != null).length,
        denominatorPointCount: input.trend.filter((point) => point.denominator_value != null).length,
        ratioCvPercent,
      },
    }
  })

  return ranked.sort((a, b) => {
    if (a.selected !== b.selected) return a.selected ? -1 : 1
    return b.relevanceScore - a.relevanceScore
  })
}
