import { supabase } from './supabase'

export interface CockpitParams {
  siteId: string
  utilityType: string | null
  period: string
}

export interface UtilityCockpitRow {
  utility: string
  pointCount: number
  pointsWithReadings: number
  readingCount: number
  measuredDelta: number
  unit: string
  coveragePercent: number
  latestReadingAt: string | null
}

export interface CockpitAlert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  module: 'equipos' | 'mapa' | 'medicion' | 'balances' | 'desempeno' | 'acciones'
  title: string
  detail: string
  path: string
}

export interface CockpitAction {
  id: string
  title: string
  workType: string
  status: string
  priority: string
  utility: string | null
  estimatedCostSavings: number
  estimatedEnergySavings: number
  savingsUnit: string | null
  plannedFinish: string | null
}

export interface CockpitTrendPoint {
  period: string
  value: number
}

export interface CockpitData {
  siteHealthScore: number
  utilityRows: UtilityCockpitRow[]
  alerts: CockpitAlert[]
  actions: CockpitAction[]
  trends: CockpitTrendPoint[]
  kpis: {
    measurementCoverage: number
    readingCount: number
    openActionCount: number
    projectCount: number
    potentialCostSavings: number
    verifiedCostSavings: number
    worstUnaccountedPercent: number | null
    deviatedEnpiCount: number
    diagramCount: number
    publishedDiagramCount: number
  }
  moduleStatus: {
    areas: number
    equipment: number
    measurementPoints: number
    diagrams: number
    balances: number
    enpis: number
    improvements: number
  }
}

interface MeasurementPointRow {
  id: string
  utility: string
  measurement_type: string
  unit: string
}

interface ReadingRow {
  measurement_point_id: string
  timestamp: string
  value: number
  unit: string
}

interface BalanceRow {
  utility: string
  unaccounted_for_percent: number | null
  measurement_coverage: number | null
}

interface EnpiRow {
  id: string
  utility: string
}

interface PerformanceRow {
  enpi_id: string
  period_start: string
  actual_value: number
  deviation_percent: number | null
}

interface ImprovementRow {
  id: string
  title: string
  work_type: string
  status: string
  priority: string
  utility: string | null
  estimated_cost_savings: number | null
  estimated_energy_savings: number | null
  savings_unit: string | null
  actual_cost_savings: number | null
  planned_finish: string | null
}

export function getPeriodRange(period: string) {
  const [year, month] = period.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  const previousStart = new Date(year, month - 2, 1)

  return {
    start,
    end,
    previousStart,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    previousStartIso: previousStart.toISOString(),
  }
}

export async function loadCockpitData({
  siteId,
  utilityType,
  period,
}: CockpitParams): Promise<CockpitData> {
  const range = getPeriodRange(period)
  const utilityFilter = utilityType || null

  let pointsQuery = supabase
    .from('measurement_points')
    .select('id, utility, measurement_type, unit')
    .eq('site_id', siteId)
    .eq('is_active', true)

  if (utilityFilter) pointsQuery = pointsQuery.eq('utility', utilityFilter)

  const [
    { count: areaCount },
    { count: equipmentCount },
    { data: pointsData },
    { data: diagramData },
    { data: balanceData },
    { data: enpiData },
    { data: improvementData },
  ] = await Promise.all([
    supabase.from('energy_areas').select('*', { count: 'exact', head: true }).eq('site_id', siteId),
    supabase.from('energy_equipment').select('*', { count: 'exact', head: true }).eq('site_id', siteId),
    pointsQuery,
    queryDiagrams(siteId, utilityFilter),
    queryBalances(siteId, utilityFilter, range.startIso, range.endIso),
    queryEnpis(siteId, utilityFilter),
    queryImprovements(siteId, utilityFilter),
  ])

  const points = (pointsData || []) as MeasurementPointRow[]
  const pointIds = points.map((point) => point.id)
  const accumulatorPointIds = points
    .filter((point) => point.measurement_type === 'accumulator')
    .map((point) => point.id)

  const [{ data: readingsData }, { data: performanceData }] = await Promise.all([
    pointIds.length > 0
      ? supabase
          .from('energy_readings_raw')
          .select('measurement_point_id, timestamp, value, unit')
          .in('measurement_point_id', pointIds)
          .gte('timestamp', range.previousStartIso)
          .lt('timestamp', range.endIso)
          .order('timestamp')
      : Promise.resolve({ data: [] }),
    enpiData && enpiData.length > 0
      ? supabase
          .from('energy_performance_results')
          .select('enpi_id, period_start, actual_value, deviation_percent')
          .in('enpi_id', (enpiData as EnpiRow[]).map((enpi) => enpi.id))
          .gte('period_start', range.startIso.slice(0, 10))
          .lt('period_start', range.endIso.slice(0, 10))
      : Promise.resolve({ data: [] }),
  ])

  const readings = (readingsData || []) as ReadingRow[]
  const balances = (balanceData || []) as BalanceRow[]
  const enpis = (enpiData || []) as EnpiRow[]
  const performance = (performanceData || []) as PerformanceRow[]
  const improvements = (improvementData || []) as ImprovementRow[]

  const periodReadings = readings.filter((reading) => {
    const ts = new Date(reading.timestamp).getTime()
    return ts >= range.start.getTime() && ts < range.end.getTime()
  })

  const utilityRows = buildUtilityRows(points, readings, accumulatorPointIds, range)
  const measurementCoverage = calculateMeasurementCoverage(points, periodReadings)
  const openActions = improvements.filter((item) => !['closed', 'cancelled'].includes(item.status))
  const activeProjects = openActions.filter((item) => item.work_type === 'project')
  const verifiedCostSavings = improvements
    .filter((item) => item.status === 'closed')
    .reduce((sum, item) => sum + Number(item.actual_cost_savings || item.estimated_cost_savings || 0), 0)
  const potentialCostSavings = openActions.reduce((sum, item) => sum + Number(item.estimated_cost_savings || 0), 0)
  const worstUnaccountedPercent = balances.reduce<number | null>((worst, balance) => {
    const value = Number(balance.unaccounted_for_percent ?? 0)
    return worst === null || value > worst ? value : worst
  }, null)
  const deviatedEnpiCount = performance.filter((item) => Number(item.deviation_percent || 0) > 0).length
  const alerts = buildAlerts({
    points,
    periodReadings,
    balances,
    enpis,
    performance,
    improvements: openActions,
    diagramCount: diagramData?.length || 0,
    publishedDiagramCount: (diagramData || []).filter((diagram: { status: string }) => diagram.status === 'published').length,
    measurementCoverage,
    worstUnaccountedPercent,
  })

  const siteHealthScore = calculateHealthScore({
    measurementCoverage,
    worstUnaccountedPercent,
    deviatedEnpiCount,
    alertCount: alerts.filter((alert) => alert.severity !== 'info').length,
    openActionCount: openActions.length,
  })

  return {
    siteHealthScore,
    utilityRows,
    alerts,
    actions: openActions.slice(0, 6).map(mapImprovement),
    trends: buildTrend(points, readings, accumulatorPointIds),
    kpis: {
      measurementCoverage,
      readingCount: periodReadings.length,
      openActionCount: openActions.length,
      projectCount: activeProjects.length,
      potentialCostSavings,
      verifiedCostSavings,
      worstUnaccountedPercent,
      deviatedEnpiCount,
      diagramCount: diagramData?.length || 0,
      publishedDiagramCount: (diagramData || []).filter((diagram: { status: string }) => diagram.status === 'published').length,
    },
    moduleStatus: {
      areas: areaCount || 0,
      equipment: equipmentCount || 0,
      measurementPoints: points.length,
      diagrams: diagramData?.length || 0,
      balances: balances.length,
      enpis: enpis.length,
      improvements: improvements.length,
    },
  }
}

function queryDiagrams(siteId: string, utility: string | null) {
  let query = supabase
    .from('energy_diagrams')
    .select('id, status, utility_type')
    .eq('site_id', siteId)

  if (utility) query = query.eq('utility_type', utility)
  return query
}

function queryBalances(siteId: string, utility: string | null, startIso: string, endIso: string) {
  let query = supabase
    .from('energy_balances')
    .select('utility, unaccounted_for_percent, measurement_coverage')
    .eq('site_id', siteId)
    .gte('period_start', startIso.slice(0, 10))
    .lt('period_start', endIso.slice(0, 10))

  if (utility) query = query.eq('utility', utility)
  return query
}

function queryEnpis(siteId: string, utility: string | null) {
  let query = supabase
    .from('energy_enpis')
    .select('id, utility')
    .eq('site_id', siteId)
    .eq('is_active', true)

  if (utility) query = query.eq('utility', utility)
  return query
}

function queryImprovements(siteId: string, utility: string | null) {
  let query = supabase
    .from('energy_improvements')
    .select('id, title, work_type, status, priority, utility, estimated_cost_savings, estimated_energy_savings, savings_unit, actual_cost_savings, planned_finish')
    .eq('site_id', siteId)
    .neq('status', 'cancelled')
    .order('priority', { ascending: true })
    .order('planned_finish', { ascending: true })

  if (utility) query = query.eq('utility', utility)
  return query
}

function buildUtilityRows(
  points: MeasurementPointRow[],
  readings: ReadingRow[],
  accumulatorPointIds: string[],
  range: ReturnType<typeof getPeriodRange>,
) {
  const rows = new Map<string, UtilityCockpitRow>()

  for (const point of points) {
    const existing = rows.get(point.utility) ?? {
      utility: point.utility,
      pointCount: 0,
      pointsWithReadings: 0,
      readingCount: 0,
      measuredDelta: 0,
      unit: point.unit,
      coveragePercent: 0,
      latestReadingAt: null,
    }

    existing.pointCount += 1
    rows.set(point.utility, existing)
  }

  for (const row of rows.values()) {
    const utilityPoints = points.filter((point) => point.utility === row.utility)
    const utilityPointIds = utilityPoints.map((point) => point.id)
    const periodReadings = readings.filter((reading) => {
      const ts = new Date(reading.timestamp).getTime()
      return utilityPointIds.includes(reading.measurement_point_id) &&
        ts >= range.start.getTime() &&
        ts < range.end.getTime()
    })

    row.readingCount = periodReadings.length
    row.pointsWithReadings = new Set(periodReadings.map((reading) => reading.measurement_point_id)).size
    row.coveragePercent = row.pointCount > 0 ? Math.round((row.pointsWithReadings / row.pointCount) * 100) : 0
    row.latestReadingAt = periodReadings.at(-1)?.timestamp ?? null
    row.measuredDelta = calculateMeasuredDelta(utilityPoints, readings, accumulatorPointIds, range)
  }

  return [...rows.values()].sort((a, b) => b.measuredDelta - a.measuredDelta)
}

function calculateMeasuredDelta(
  points: MeasurementPointRow[],
  readings: ReadingRow[],
  accumulatorPointIds: string[],
  range: ReturnType<typeof getPeriodRange>,
) {
  return points.reduce((total, point) => {
    if (!accumulatorPointIds.includes(point.id)) return total

    const pointReadings = readings
      .filter((reading) => reading.measurement_point_id === point.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    const current = [...pointReadings]
      .reverse()
      .find((reading) => {
        const ts = new Date(reading.timestamp).getTime()
        return ts >= range.start.getTime() && ts < range.end.getTime()
      })
    const previous = [...pointReadings]
      .reverse()
      .find((reading) => new Date(reading.timestamp).getTime() < range.start.getTime())

    if (!current || !previous) return total
    const delta = Number(current.value) - Number(previous.value)
    return total + (delta > 0 ? delta : 0)
  }, 0)
}

function calculateMeasurementCoverage(points: MeasurementPointRow[], periodReadings: ReadingRow[]) {
  if (points.length === 0) return 0
  const pointsWithReadings = new Set(periodReadings.map((reading) => reading.measurement_point_id)).size
  return Math.round((pointsWithReadings / points.length) * 100)
}

function buildAlerts({
  points,
  periodReadings,
  balances,
  enpis,
  performance,
  improvements,
  diagramCount,
  publishedDiagramCount,
  measurementCoverage,
  worstUnaccountedPercent,
}: {
  points: MeasurementPointRow[]
  periodReadings: ReadingRow[]
  balances: BalanceRow[]
  enpis: EnpiRow[]
  performance: PerformanceRow[]
  improvements: ImprovementRow[]
  diagramCount: number
  publishedDiagramCount: number
  measurementCoverage: number
  worstUnaccountedPercent: number | null
}) {
  const alerts: CockpitAlert[] = []

  if (points.length === 0) {
    alerts.push({
      id: 'missing-measurement-points',
      severity: 'critical',
      module: 'equipos',
      title: 'No hay puntos de medicion',
      detail: 'El sitio necesita MeasurementPoints para alimentar medicion, balances y EnPI.',
      path: '/equipos',
    })
  } else if (measurementCoverage < 80) {
    alerts.push({
      id: 'low-measurement-coverage',
      severity: 'warning',
      module: 'medicion',
      title: 'Cobertura de medicion baja',
      detail: `${measurementCoverage}% de los puntos tienen lectura en el periodo.`,
      path: '/medicion',
    })
  }

  if (periodReadings.length === 0 && points.length > 0) {
    alerts.push({
      id: 'missing-period-readings',
      severity: 'warning',
      module: 'medicion',
      title: 'Sin lecturas del periodo',
      detail: 'Carga lecturas manuales o importa CSV antes de analizar balances.',
      path: '/medicion',
    })
  }

  if (diagramCount === 0) {
    alerts.push({
      id: 'missing-diagrams',
      severity: 'info',
      module: 'mapa',
      title: 'Mapa tecnico pendiente',
      detail: 'Crea al menos un diagrama para conectar el cockpit con la topologia.',
      path: '/mapa',
    })
  } else if (publishedDiagramCount === 0) {
    alerts.push({
      id: 'no-published-diagram',
      severity: 'info',
      module: 'mapa',
      title: 'Diagramas sin publicar',
      detail: 'Publica una version cuando el mapa este listo para balances trazables.',
      path: '/mapa',
    })
  }

  if (balances.length === 0) {
    alerts.push({
      id: 'missing-balance',
      severity: 'warning',
      module: 'balances',
      title: 'Balance no ejecutado',
      detail: 'Ejecuta o registra el balance del periodo para ver perdidas y no explicado.',
      path: '/balances',
    })
  } else if ((worstUnaccountedPercent || 0) > 10) {
    alerts.push({
      id: 'high-unaccounted',
      severity: 'critical',
      module: 'balances',
      title: 'No explicado alto',
      detail: `El peor balance reporta ${worstUnaccountedPercent?.toFixed(1)}% sin explicar.`,
      path: '/balances',
    })
  }

  if (enpis.length === 0) {
    alerts.push({
      id: 'missing-enpis',
      severity: 'info',
      module: 'desempeno',
      title: 'EnPI pendiente',
      detail: 'Define indicadores para conectar consumo con desempeno operacional.',
      path: '/desempeno',
    })
  }

  const deviated = performance.filter((item) => Number(item.deviation_percent || 0) > 0)
  if (deviated.length > 0) {
    alerts.push({
      id: 'enpi-deviation',
      severity: 'warning',
      module: 'desempeno',
      title: 'EnPI en desviacion',
      detail: `${deviated.length} indicador(es) por arriba de su baseline.`,
      path: '/desempeno',
    })
  }

  const overdue = improvements.filter((item) => {
    if (!item.planned_finish) return false
    return new Date(item.planned_finish).getTime() < Date.now()
  })
  if (overdue.length > 0) {
    alerts.push({
      id: 'overdue-actions',
      severity: 'warning',
      module: 'acciones',
      title: 'Acciones atrasadas',
      detail: `${overdue.length} accion(es) o proyecto(s) superaron su fecha planificada.`,
      path: '/acciones',
    })
  }

  return alerts.slice(0, 8)
}

function calculateHealthScore({
  measurementCoverage,
  worstUnaccountedPercent,
  deviatedEnpiCount,
  alertCount,
  openActionCount,
}: {
  measurementCoverage: number
  worstUnaccountedPercent: number | null
  deviatedEnpiCount: number
  alertCount: number
  openActionCount: number
}) {
  let score = 100
  score -= Math.max(0, 100 - measurementCoverage) * 0.35
  score -= Math.min(Number(worstUnaccountedPercent || 0), 30) * 1.2
  score -= deviatedEnpiCount * 6
  score -= alertCount * 4
  score += Math.min(openActionCount, 5) * 1.5

  return Math.max(0, Math.min(100, Math.round(score)))
}

function mapImprovement(item: ImprovementRow): CockpitAction {
  return {
    id: item.id,
    title: item.title,
    workType: item.work_type,
    status: item.status,
    priority: item.priority,
    utility: item.utility,
    estimatedCostSavings: Number(item.estimated_cost_savings || 0),
    estimatedEnergySavings: Number(item.estimated_energy_savings || 0),
    savingsUnit: item.savings_unit,
    plannedFinish: item.planned_finish,
  }
}

function buildTrend(
  points: MeasurementPointRow[],
  readings: ReadingRow[],
  accumulatorPointIds: string[],
) {
  const periods = new Map<string, number>()

  for (const point of points) {
    if (!accumulatorPointIds.includes(point.id)) continue
    const pointReadings = readings
      .filter((reading) => reading.measurement_point_id === point.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    for (let index = 1; index < pointReadings.length; index += 1) {
      const current = pointReadings[index]
      const previous = pointReadings[index - 1]
      const delta = Number(current.value) - Number(previous.value)
      if (delta <= 0) continue

      const period = current.timestamp.slice(0, 7)
      periods.set(period, (periods.get(period) || 0) + delta)
    }
  }

  return [...periods.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([period, value]) => ({ period, value }))
}
