import type { MeasurementPoint, UtilityGraph } from '@/services/topology-engine/graphTypes'
import { convertUnits, getConversion } from '@/services/topology-engine/unitConversion'
import { getBoundaryMeterScopes, getMeterScopesByMeasurementPoint } from '@/services/topology-engine/meterBinding'
import { convertToKwh } from './conversionFactors'

export interface BalanceNodeResult {
  nodeId: string
  tag: string
  label: string
  utility: string
  type: string
  input: number
  output: number
  consumption: number
  coverage: 'measured' | 'estimated' | 'calculated' | 'unmetered'
  measurementPointIds?: string[]
  measuredBy?: string[]
  isBoundary?: boolean
  deviation?: number
}

export interface EquipmentEfficiency {
  nodeId: string
  tag: string
  label: string
  inputUtility: string
  outputUtility: string
  inputValue: number
  inputUnit: string
  inputValueKwh?: number
  outputValue: number
  outputUnit: string
  outputValueKwh?: number
  efficiencyPercent?: number
  period: { from: Date; to: Date }
}

export interface BalanceResult {
  utility: string
  period: { from: Date; to: Date }
  diagramVersionId: string
  totalInput: number
  measuredConsumption: number
  calculatedConsumption: number
  estimatedConsumption: number
  technicalLosses: number
  estimatedLeaks: number
  returns: number
  unaccountedFor: number
  unaccountedForPercent: number
  measurementCoverage: number
  unit: string
  nodeResults: BalanceNodeResult[]
  equipmentEfficiencies: EquipmentEfficiency[]
}

interface ReadingData {
  measurement_point_id: string
  timestamp: string
  value: number
  unit: string
}

const BALANCE_QUANTITIES = new Set(['energy', 'volume', 'mass'])
const BALANCE_MEASUREMENT_TYPES = new Set(['accumulator', 'counter', 'calculated'])

function isBalanceMeasurement(mp: MeasurementPoint | null | undefined): boolean {
  if (!mp) return false
  return BALANCE_QUANTITIES.has(mp.quantity) && BALANCE_MEASUREMENT_TYPES.has(mp.measurement_type)
}

function canConvertUnit(fromUnit: string | null, toUnit: string, utility: string): boolean {
  if (!toUnit || !fromUnit || fromUnit === toUnit) return true
  return Boolean(getConversion(fromUnit, toUnit, utility))
}

function measurementPointsById(graph: UtilityGraph): Map<string, MeasurementPoint> {
  const map = new Map<string, MeasurementPoint>()
  for (const node of graph.nodes) {
    for (const mp of node.measurementPoints) map.set(mp.id, mp)
  }
  for (const edge of graph.edges) {
    for (const mp of edge.measurementPoints) map.set(mp.id, mp)
  }
  return map
}

function upstreamNodeId(currentNodeId: string, edge: UtilityGraph['edges'][number]): string | null {
  if (edge.flowDirection === 'target_to_source') {
    return edge.source === currentNodeId ? edge.target : null
  }
  if (edge.flowDirection === 'bidirectional') {
    if (edge.source === currentNodeId) return edge.target
    if (edge.target === currentNodeId) return edge.source
    return null
  }
  return edge.target === currentNodeId ? edge.source : null
}

function edgeFlowSourceId(edge: UtilityGraph['edges'][number]): string {
  return edge.flowDirection === 'target_to_source' ? edge.target : edge.source
}

function latestBefore(readings: ReadingData[], before: Date): ReadingData | null {
  const ts = before.getTime()
  return readings
    .filter((reading) => new Date(reading.timestamp).getTime() < ts)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] || null
}

function latestInside(readings: ReadingData[], period: { from: Date; to: Date }): ReadingData | null {
  const from = period.from.getTime()
  const to = period.to.getTime()
  return readings
    .filter((reading) => {
      const ts = new Date(reading.timestamp).getTime()
      return ts >= from && ts < to
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] || null
}

function sumInside(readings: ReadingData[], period: { from: Date; to: Date }): { value: number; unit: string | null } {
  const from = period.from.getTime()
  const to = period.to.getTime()
  let unit: string | null = null
  const value = readings.reduce((total, reading) => {
    const ts = new Date(reading.timestamp).getTime()
    if (ts < from || ts >= to) return total
    unit ||= reading.unit
    return total + Number(reading.value || 0)
  }, 0)
  return { value, unit }
}

function calculateReadingValue(
  readings: ReadingData[],
  measurementPoint: MeasurementPoint | null,
  period: { from: Date; to: Date },
): { value: number; unit: string | null } {
  if (measurementPoint?.measurement_type === 'accumulator') {
    const current = latestInside(readings, period)
    if (!current) return { value: 0, unit: measurementPoint.unit || readings[0]?.unit || null }
    const previous = latestBefore(readings, period.from)
    if (!previous) return { value: Number(current.value || 0), unit: current.unit }
    const delta = Number(current.value || 0) - Number(previous.value || 0)
    return { value: Math.max(0, delta), unit: current.unit }
  }
  return sumInside(readings, period)
}

export function calculateBalance(
  graph: UtilityGraph,
  readings: ReadingData[],
  period: { from: Date; to: Date },
): BalanceResult {
  const meterScopesByMp = getMeterScopesByMeasurementPoint(graph)
  const boundaryScopes = getBoundaryMeterScopes(graph)
  const mpById = measurementPointsById(graph)
  const readingsByMp = new Map<string, ReadingData[]>()
  for (const reading of readings) {
    const list = readingsByMp.get(reading.measurement_point_id) || []
    list.push(reading)
    readingsByMp.set(reading.measurement_point_id, list)
  }

  const boundaryMpIds = new Set(boundaryScopes.map((scope) => scope.measurementPointId).filter(Boolean) as string[])
  const firstBoundaryReading = boundaryScopes
    .filter((scope) => isBalanceMeasurement(scope.measurementPoint))
    .map((scope) => scope.measurementPointId ? latestInside(readingsByMp.get(scope.measurementPointId) || [], period) : null)
    .find(Boolean)
  const firstBalanceReading = readings.find((reading) => isBalanceMeasurement(mpById.get(reading.measurement_point_id)))
  const unit = firstBoundaryReading?.unit || firstBalanceReading?.unit || readings[0]?.unit || ''

  const consumptionByNode = new Map<string, number>()
  const measurementPointIdsByNode = new Map<string, string[]>()
  const measuredByByNode = new Map<string, string[]>()
  const boundaryNodes = new Set<string>()
  const measuredMpIds = new Set<string>()
  let totalInput = 0

  let measuredConsumption = 0
  let estimatedConsumption = 0
  let calculatedConsumption = 0

  const nonBoundaryScopes = [...meterScopesByMp.entries()]
    .filter(([measurementPointId, scope]) => !boundaryMpIds.has(measurementPointId) && isBalanceMeasurement(scope.measurementPoint))
  const nestedMpIds = new Set<string>()
  for (const [measurementPointId, scope] of nonBoundaryScopes) {
    const isNested = nonBoundaryScopes.some(([otherMeasurementPointId, otherScope]) => (
      otherMeasurementPointId !== measurementPointId &&
      otherScope.downstreamNodeIds.includes(scope.measuredNodeId)
    ))
    if (isNested) nestedMpIds.add(measurementPointId)
  }

  for (const [measurementPointId, scope] of meterScopesByMp) {
    if (!isBalanceMeasurement(scope.measurementPoint)) continue
    const mpReadings = readingsByMp.get(measurementPointId) || []
    const readingValue = calculateReadingValue(mpReadings, scope.measurementPoint, period)
    if (!canConvertUnit(readingValue.unit, unit, graph.nodes[0]?.utility || scope.measurementPoint?.utility || '')) continue
    const value = unit && readingValue.unit
      ? convertUnits(readingValue.value, readingValue.unit, unit, graph.nodes[0]?.utility).result
      : readingValue.value
    if (value <= 0) continue
    measuredMpIds.add(measurementPointId)

    if (boundaryMpIds.has(measurementPointId)) {
      totalInput += value
      for (const nodeId of scope.downstreamNodeIds) boundaryNodes.add(nodeId)
      continue
    }

    const measuredNodeIds = [scope.measuredNodeId]
    for (const nodeId of measuredNodeIds) {
      consumptionByNode.set(nodeId, (consumptionByNode.get(nodeId) || 0) + value)
      const ids = measurementPointIdsByNode.get(nodeId) || []
      ids.push(measurementPointId)
      measurementPointIdsByNode.set(nodeId, [...new Set(ids)])
      const tags = measuredByByNode.get(nodeId) || []
      if (scope.measurementPoint?.tag) tags.push(scope.measurementPoint.tag)
      measuredByByNode.set(nodeId, [...new Set(tags)])
    }
    if (!nestedMpIds.has(measurementPointId)) {
      if (scope.measurementPoint?.measurement_type === 'calculated') calculatedConsumption += value
      else measuredConsumption += value
    }
  }

  // Fallback for legacy MeasurementPoints that are bound directly to nodes/edges
  // without a visible meter node on the diagram.
  for (const measurementScope of graph.measurementScopes) {
    if (measuredMpIds.has(measurementScope.measurementPointId)) continue
    const measurementPoint = mpById.get(measurementScope.measurementPointId) || null
    if (!isBalanceMeasurement(measurementPoint)) continue
    const mpReadings = readingsByMp.get(measurementScope.measurementPointId) || []
    const readingValue = calculateReadingValue(mpReadings, measurementPoint, period)
    if (!canConvertUnit(readingValue.unit, unit, graph.nodes[0]?.utility || measurementPoint?.utility || '')) continue
    const value = unit && readingValue.unit
      ? convertUnits(readingValue.value, readingValue.unit, unit, graph.nodes[0]?.utility).result
      : readingValue.value
    if (value <= 0) continue
    for (const target of measurementScope.targets) {
      if (target.type !== 'node') continue
      consumptionByNode.set(target.id, (consumptionByNode.get(target.id) || 0) + value)
      measuredConsumption += value
    }
  }

  if (totalInput === 0) {
    totalInput = measuredConsumption + calculatedConsumption
  }

  const nodeResults: BalanceNodeResult[] = graph.nodes.map((node) => {
    const consumption = consumptionByNode.get(node.id) || 0
    const incomingEdges = node.incoming
      .map((edgeId) => graph.edges.find((edge) => edge.id === edgeId))
      .filter((edge): edge is UtilityGraph['edges'][number] => Boolean(edge && !edge.isAnnotation))

    const input = node.incoming.length > 0
      ? incomingEdges.reduce((sum, e) => {
          const upstreamId = upstreamNodeId(node.id, e)
          return sum + (upstreamId ? (consumptionByNode.get(upstreamId) || 0) * (1 - (e.lossFactor || 0)) : 0)
        }, 0)
      : 0

    let coverage: BalanceNodeResult['coverage'] = 'unmetered'
    const measurementPointIds = measurementPointIdsByNode.get(node.id) || []
    if (measurementPointIds.length > 0) {
      coverage = 'measured'
    } else if (consumption > 0) {
      coverage = 'estimated'
    }

    if (coverage === 'estimated') estimatedConsumption += consumption

    return {
      nodeId: node.id,
      tag: node.tag,
      label: node.label,
      utility: node.utility,
      type: node.type,
      input,
      output: input - consumption,
      consumption,
      coverage,
      measurementPointIds,
      measuredBy: measuredByByNode.get(node.id) || [],
      isBoundary: boundaryNodes.has(node.id),
    }
  })

  const technicalLosses = graph.edges.reduce(
    (sum, e) => e.isAnnotation ? sum : sum + (e.lossFactor || 0) * (consumptionByNode.get(edgeFlowSourceId(e)) || 0),
    0,
  )

  const estimatedLeaks = graph.edges.reduce(
    (sum, e) => e.isAnnotation ? sum : sum + (e.leakFactor || 0) * (consumptionByNode.get(edgeFlowSourceId(e)) || 0),
    0,
  )

  const returns = graph.nodes
    .filter((n) => (n.type as string) === 'condensate_return')
    .reduce((sum, n) => sum + (consumptionByNode.get(n.id) || 0), 0)

  const rawUnaccountedFor = totalInput - measuredConsumption - calculatedConsumption - estimatedConsumption - technicalLosses - estimatedLeaks - returns
  const unaccountedFor = Math.max(0, rawUnaccountedFor)

  const measurementCoverage = totalInput > 0
    ? Math.min(100, ((measuredConsumption + calculatedConsumption) / totalInput) * 100)
    : 0

  return {
    utility: graph.nodes[0]?.utility || 'unknown',
    period,
    diagramVersionId: graph.versionId,
    totalInput,
    measuredConsumption,
    calculatedConsumption,
    estimatedConsumption,
    technicalLosses,
    estimatedLeaks,
    returns,
    unaccountedFor,
    unaccountedForPercent: totalInput > 0 ? (unaccountedFor / totalInput) * 100 : 0,
    measurementCoverage,
    unit,
    nodeResults,
    equipmentEfficiencies: calculateEquipmentEfficiencies(graph, readings, period),
  }
}

// ── Equipment Efficiency Calculation ──────────────────────────────────────────

export function calculateEquipmentEfficiencies(
  graph: UtilityGraph,
  readings: ReadingData[],
  period: { from: Date; to: Date }
): EquipmentEfficiency[] {
  const efficiencies: EquipmentEfficiency[] = []
  const mpById = measurementPointsById(graph)

  // Map readings by MP ID
  const readingsByMp = new Map<string, ReadingData[]>()
  for (const r of readings) {
    const list = readingsByMp.get(r.measurement_point_id) || []
    list.push(r)
    readingsByMp.set(r.measurement_point_id, list)
  }

  // Iterate over all nodes in the graph
  for (const node of graph.nodes) {
    // 1. Encontrar todos los MPs que miden este nodo
    // (Pueden estar definidos por target=node)
    const nodeMpScopes = graph.measurementScopes.filter(s => 
      s.targets.some(t => t.type === 'node' && t.id === node.id)
    )

    if (nodeMpScopes.length === 0) continue

    // Agrupar MPs por utility
    const mpsByUtility = new Map<string, typeof nodeMpScopes>()
    for (const scope of nodeMpScopes) {
      const mp = mpById.get(scope.measurementPointId)
      if (!mp) continue
      const utility = mp.utility || 'unknown'
      const list = mpsByUtility.get(utility) || []
      list.push(scope)
      mpsByUtility.set(utility, list)
    }

    // Si tiene menos de 2 utilities distintas, no es un nodo de conversión multi-utility
    if (mpsByUtility.size < 2) continue

    // 2. Identificar input utility vs output utility usando el grafo (edges)
    const incomingUtilities = new Set<string>()
    for (const edgeId of node.incoming) {
      const edge = graph.edges.find(e => e.id === edgeId)
      if (edge && edge.utility) incomingUtilities.add(edge.utility)
    }

    const outgoingUtilities = new Set<string>()
    for (const edgeId of node.outgoing) {
      const edge = graph.edges.find(e => e.id === edgeId)
      if (edge && edge.utility) outgoingUtilities.add(edge.utility)
    }

    // Identificar pares de conversión (input -> output)
    const pairs: { inUtility: string; outUtility: string }[] = []

    // Caso 1: Podemos deducirlo por la dirección del flujo
    for (const inUtil of incomingUtilities) {
      for (const outUtil of outgoingUtilities) {
        if (inUtil !== outUtil && mpsByUtility.has(inUtil) && mpsByUtility.has(outUtil)) {
          pairs.push({ inUtility: inUtil, outUtility: outUtil })
        }
      }
    }

    // Caso 2: Fallback simple si los edges no tienen utilities explícitas pero el nodo tiene exactamente 2 utilities
    if (pairs.length === 0 && mpsByUtility.size === 2) {
      const utils = Array.from(mpsByUtility.keys())
      // Asumimos orden alfabético inverso (ej. natural_gas in, steam out) como fallback si no hay flujo
      // Lo ideal es que el usuario conecte los edges correctamente
      pairs.push({ inUtility: utils[0], outUtility: utils[1] })
    }

    // 3. Calcular la eficiencia para cada par
    for (const pair of pairs) {
      const inScopes = mpsByUtility.get(pair.inUtility) || []
      const outScopes = mpsByUtility.get(pair.outUtility) || []

      let inTotal = 0
      let inUnit = ''
      for (const scope of inScopes) {
        const mp = mpById.get(scope.measurementPointId)
        if (!mp || !isBalanceMeasurement(mp)) continue
        const mpReadings = readingsByMp.get(mp.id) || []
        const valueObj = calculateReadingValue(mpReadings, mp, period)
        if (valueObj.value > 0) {
          inTotal += valueObj.value
          if (!inUnit) inUnit = valueObj.unit || mp.unit
        }
      }

      let outTotal = 0
      let outUnit = ''
      for (const scope of outScopes) {
        const mp = mpById.get(scope.measurementPointId)
        if (!mp || !isBalanceMeasurement(mp)) continue
        const mpReadings = readingsByMp.get(mp.id) || []
        const valueObj = calculateReadingValue(mpReadings, mp, period)
        if (valueObj.value > 0) {
          outTotal += valueObj.value
          if (!outUnit) outUnit = valueObj.unit || mp.unit
        }
      }

      if (inTotal > 0 && outTotal >= 0) {
        const inKwh = convertToKwh(inTotal, pair.inUtility, inUnit)
        const outKwh = convertToKwh(outTotal, pair.outUtility, outUnit)

        let eff = undefined
        if (inKwh != null && inKwh > 0 && outKwh != null) {
          eff = (outKwh / inKwh) * 100
        }

        efficiencies.push({
          nodeId: node.id,
          tag: node.tag,
          label: node.label,
          inputUtility: pair.inUtility,
          outputUtility: pair.outUtility,
          inputValue: inTotal,
          inputUnit: inUnit,
          inputValueKwh: inKwh ?? undefined,
          outputValue: outTotal,
          outputUnit: outUnit,
          outputValueKwh: outKwh ?? undefined,
          efficiencyPercent: eff,
          period,
        })
      }
    }
  }

  return efficiencies
}
