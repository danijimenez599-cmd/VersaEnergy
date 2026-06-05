import type { EnPITrendPoint } from '@/services/enpi-engine'
import type {
  StudyCandidateConfig,
  StudyCandidatePoint,
  StudyCandidateResult,
  StudyCoverageTone,
  StudyDecision,
  StudyFinding,
  StudyVariableCandidate,
} from './types'
import { buildModelComparisons } from './modelComparison'
import { getStudyPlaybook } from './playbooks'

function coverageTone(coverage: number): StudyCoverageTone {
  if (coverage >= 70) return 'ok'
  if (coverage >= 35) return 'warn'
  return 'danger'
}

function deltaPercent(latest: number | null, previous: number | null): number | null {
  if (latest == null || previous == null || previous === 0) return null
  return ((latest - previous) / previous) * 100
}

function confidenceScore(coverage: number, validPointCount: number, hasNumerator: boolean, hasDenominator: boolean): number {
  let score = 0
  if (hasNumerator) score += 20
  if (hasDenominator) score += 20
  if (validPointCount >= 3) score += 20
  if (validPointCount >= 6) score += 10
  score += Math.min(30, Math.round(coverage * 0.3))
  return Math.min(100, score)
}

function buildFindings(config: StudyCandidateConfig, validPointCount: number, coverage: number): StudyFinding[] {
  return [
    {
      id: 'energy_source',
      ok: Boolean(config.numeratorRefId),
      text: config.numeratorType === 'measurement_point'
        ? 'Fuente energetica vinculada a un medidor real.'
        : 'Fuente energetica vinculada a un balance existente.',
    },
    {
      id: 'driver',
      ok: Boolean(config.denominatorRefId),
      text: 'Driver operacional definido para normalizar el consumo.',
    },
    {
      id: 'periods',
      ok: validPointCount >= 3,
      text: 'Hay al menos 3 periodos comparables para observar tendencia.',
    },
    {
      id: 'coverage',
      ok: coverage >= 70,
      text: 'Cobertura suficiente para promover la metrica con confianza inicial.',
    },
  ]
}

function buildWarnings(config: StudyCandidateConfig, validPointCount: number, coverage: number): string[] {
  const warnings: string[] = []
  if (!config.numeratorRefId) warnings.push('Selecciona una fuente energetica.')
  if (!config.denominatorRefId) warnings.push('Selecciona un driver operacional.')
  if (validPointCount > 0 && validPointCount < 3) warnings.push('Hay pocos periodos comparables; usa la metrica solo como observacion.')
  if (coverage < 70) warnings.push('La cobertura todavia no es suficiente para gobernar la metrica como EnPI.')
  return warnings
}

function buildDecisions(config: StudyCandidateConfig, canPromote: boolean, coverage: number, validPointCount: number, delta: number | null): StudyDecision[] {
  const hasMaterialDeviation = delta != null && Math.abs(delta) >= 8
  const projectLike = config.studyType === 'baseline_model' ||
    config.studyType === 'mv_guardian' ||
    config.studyType === 'multi_utility_normalization' ||
    (hasMaterialDeviation && coverage >= 70)

  return [
    {
      id: 'promote_enpi',
      enabled: canPromote,
      label: 'Promover a EnPI',
      detail: 'Crear indicador maduro con baseline y target.',
    },
    {
      id: 'request_measurement',
      enabled: coverage < 70,
      label: 'Solicitar medicion',
      detail: 'Registrar brecha de medicion antes de gobernar o invertir.',
    },
    {
      id: 'create_quick_action',
      enabled: validPointCount > 0,
      label: 'Accion rapida',
      detail: 'Crear trabajo corto: ajuste, inspeccion, reparacion, calibracion o correccion operativa.',
    },
    {
      id: 'create_project',
      enabled: validPointCount > 0 && projectLike,
      label: 'Proyecto',
      detail: 'Crear iniciativa estructurada con fases, tareas, presupuesto y M&V.',
    },
    {
      id: 'create_sgen_evidence',
      enabled: validPointCount > 0,
      label: 'Evidencia SGEn',
      detail: 'Guardar snapshot del estudio para revision energetica.',
    },
  ]
}

export function calculateRatioStudy(
  config: StudyCandidateConfig,
  trend: EnPITrendPoint[],
  variableCandidates: StudyVariableCandidate[] = [],
): StudyCandidateResult {
  const points: StudyCandidatePoint[] = trend.map((point) => ({
    period: point.period,
    periodStart: point.period_start,
    periodEnd: point.period_end,
    numeratorValue: point.numerator_value,
    denominatorValue: point.denominator_value,
    value: point.enpi_value,
  }))

  const validPoints = points.filter((point) => point.value != null)
  const numeratorPointCount = points.filter((point) => point.numeratorValue != null).length
  const denominatorPointCount = points.filter((point) => point.denominatorValue != null).length
  const coverage = points.length > 0 ? Math.round((validPoints.length / points.length) * 100) : 0
  const latestValue = validPoints.at(-1)?.value ?? null
  const previousValue = validPoints.length > 1 ? validPoints.at(-2)?.value ?? null : null
  const delta = deltaPercent(latestValue, previousValue)
  const canPromote = Boolean(config.numeratorRefId && config.denominatorRefId && validPoints.length >= 3)
  const unit = `${config.numeratorUnit || 'energia'}/${config.denominatorUnit || 'produccion'}`

  const baseResult = {
    config,
    unit,
    points,
    validPointCount: validPoints.length,
    numeratorPointCount,
    denominatorPointCount,
    coverage,
    coverageTone: coverageTone(coverage),
    latestValue,
    previousValue,
    deltaPercent: delta,
    confidenceScore: confidenceScore(coverage, validPoints.length, Boolean(config.numeratorRefId), Boolean(config.denominatorRefId)),
    canPromote,
    findings: buildFindings(config, validPoints.length, coverage),
    decisions: buildDecisions(config, canPromote, coverage, validPoints.length, delta),
    variableCandidates,
    warnings: buildWarnings(config, validPoints.length, coverage),
  }

  return {
    ...baseResult,
    modelComparisons: buildModelComparisons(baseResult),
    playbook: getStudyPlaybook(config.studyType),
  }
}
