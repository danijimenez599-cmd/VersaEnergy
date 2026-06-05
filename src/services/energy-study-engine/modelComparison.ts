import type { StudyCandidatePoint, StudyCandidateResult, StudyModelComparison } from './types'

function pctDelta(latest: number | null, reference: number | null): number | null {
  if (latest == null || reference == null || reference === 0) return null
  return ((latest - reference) / reference) * 100
}

function average(values: number[]) {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return null
  const avg = average(values)
  if (avg == null) return null
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

function linearRegression(points: StudyCandidatePoint[]) {
  const pairs = points
    .filter((point) => point.numeratorValue != null && point.denominatorValue != null)
    .map((point) => ({ x: point.denominatorValue as number, y: point.numeratorValue as number }))
  if (pairs.length < 3) return null

  const avgX = average(pairs.map((pair) => pair.x))
  const avgY = average(pairs.map((pair) => pair.y))
  if (avgX == null || avgY == null) return null

  const numerator = pairs.reduce((sum, pair) => sum + (pair.x - avgX) * (pair.y - avgY), 0)
  const denominator = pairs.reduce((sum, pair) => sum + (pair.x - avgX) ** 2, 0)
  if (denominator === 0) return null

  const slope = numerator / denominator
  const intercept = avgY - slope * avgX
  const ssTot = pairs.reduce((sum, pair) => sum + (pair.y - avgY) ** 2, 0)
  const ssRes = pairs.reduce((sum, pair) => {
    const predicted = intercept + slope * pair.x
    return sum + (pair.y - predicted) ** 2
  }, 0)
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0
  const latest = pairs.at(-1)
  const latestPredicted = latest ? intercept + slope * latest.x : null
  return { slope, intercept, r2, latestActual: latest?.y ?? null, latestPredicted }
}

function validValues(points: StudyCandidatePoint[]) {
  return points
    .map((point) => point.value)
    .filter((value): value is number => value != null && Number.isFinite(value))
}

export function buildModelComparisons(candidate: Omit<StudyCandidateResult, 'modelComparisons' | 'playbook'>): StudyModelComparison[] {
  const values = validValues(candidate.points)
  const latest = candidate.latestValue
  const previous = candidate.previousValue
  const avg = average(values)
  const best = values.length > 0 ? Math.min(...values) : null
  const stdev = standardDeviation(values)
  const stabilityPenalty = avg && stdev ? Math.min(30, Math.round((stdev / Math.abs(avg)) * 100)) : 0
  const baseQuality = Math.max(0, candidate.confidenceScore - stabilityPenalty)
  const regression = linearRegression(candidate.points)

  const models: StudyModelComparison[] = [
    {
      id: 'ratio',
      label: 'Ratio operacional',
      description: 'Lectura directa energia / driver en periodos comparables.',
      outputUnit: candidate.unit,
      latestValue: latest,
      referenceValue: previous,
      deltaPercent: pctDelta(latest, previous),
      qualityScore: candidate.confidenceScore,
      recommended: false,
      assumptions: [
        'Energia y driver se agregan en el mismo periodo.',
        'El ratio no ajusta clima, mezcla ni carga parcial.',
      ],
    },
    {
      id: 'stability_band',
      label: 'Banda estable',
      description: 'Promedio historico con penalizacion por variabilidad.',
      outputUnit: candidate.unit,
      latestValue: latest,
      referenceValue: avg,
      deltaPercent: pctDelta(latest, avg),
      qualityScore: baseQuality,
      recommended: false,
      assumptions: [
        'El promedio historico representa operacion normal.',
        'La desviacion estandar castiga modelos inestables.',
      ],
    },
    {
      id: 'best_period',
      label: 'Mejor periodo observado',
      description: 'Benchmark interno usando el menor consumo especifico observado.',
      outputUnit: candidate.unit,
      latestValue: latest,
      referenceValue: best,
      deltaPercent: pctDelta(latest, best),
      qualityScore: values.length >= 6 ? Math.max(45, candidate.confidenceScore - 10) : Math.max(20, candidate.confidenceScore - 25),
      recommended: false,
      assumptions: [
        'El mejor periodo es fisicamente repetible.',
        'No se confirma aun si influyeron mezcla, clima o calidad de dato.',
      ],
    },
    {
      id: 'regression_simple',
      label: 'Regresion simple',
      description: 'Modelo energia = base + pendiente x driver para separar carga base y consumo variable.',
      outputUnit: candidate.config.numeratorUnit || 'energia',
      latestValue: regression?.latestActual ?? null,
      referenceValue: regression?.latestPredicted ?? null,
      deltaPercent: pctDelta(regression?.latestActual ?? null, regression?.latestPredicted ?? null),
      qualityScore: regression ? Math.round(Math.min(100, candidate.confidenceScore * 0.55 + regression.r2 * 45)) : 0,
      recommended: false,
      assumptions: [
        'El driver tiene relacion fisica con la energia.',
        'La pendiente representa consumo incremental y el intercepto carga base.',
        'No corrige mezcla, clima ni regimenes operativos multiples.',
      ],
    },
    {
      id: 'cusum_watch',
      label: 'CUSUM inicial',
      description: 'Acumula desviaciones contra referencia para detectar cambio sostenido.',
      outputUnit: candidate.unit,
      latestValue: latest,
      referenceValue: avg,
      deltaPercent: pctDelta(latest, avg),
      qualityScore: values.length >= 6 ? Math.max(35, baseQuality - 5) : Math.max(0, baseQuality - 30),
      recommended: false,
      assumptions: [
        'La referencia historica representa operacion normal.',
        'CUSUM sirve como vigilancia inicial, no como prueba M&V cerrada sin baseline aprobado.',
      ],
    },
    {
      id: 'mv_guardian',
      label: 'M&V guardian',
      description: 'Linea de vigilancia para detectar degradacion despues de una mejora.',
      outputUnit: candidate.unit,
      latestValue: latest,
      referenceValue: avg,
      deltaPercent: pctDelta(latest, avg),
      qualityScore: candidate.validPointCount >= 12 ? baseQuality : Math.max(0, baseQuality - 20),
      recommended: false,
      assumptions: [
        'La ventana historica sera la referencia inicial de persistencia.',
        'Requiere owner y accion vinculada para cerrar el ciclo.',
      ],
    },
  ]

  const recommended = models
    .filter((model) => model.latestValue != null && model.referenceValue != null)
    .sort((a, b) => b.qualityScore - a.qualityScore)[0]?.id ?? 'ratio'

  return models.map((model) => ({ ...model, recommended: model.id === recommended }))
}
