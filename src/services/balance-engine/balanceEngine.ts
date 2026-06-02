import type { UtilityGraph } from '@/services/topology-engine/graphTypes'

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
  deviation?: number
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
  nodeResults: BalanceNodeResult[]
}

interface ReadingData {
  measurement_point_id: string
  timestamp: string
  value: number
  unit: string
}

export function calculateBalance(
  graph: UtilityGraph,
  readings: ReadingData[],
  period: { from: Date; to: Date },
): BalanceResult {
  const consumptionByNode = new Map<string, number>()

  for (const reading of readings) {
    const rt = new Date(reading.timestamp)
    if (rt < period.from || rt > period.to) continue
    const mp = graph.measurementScopes.find(
      (s) => s.measurementPointId === reading.measurement_point_id,
    )
    if (!mp) continue
    for (const t of mp.targets) {
      if (t.type === 'node') {
        const prev = consumptionByNode.get(t.id) || 0
        consumptionByNode.set(t.id, prev + Number(reading.value))
      }
    }
  }

  const sourceNodes = graph.nodes.filter(
    (n) => n.type === 'utility_source' || (n.incoming.length === 0 && n.outgoing.length > 0),
  )

  let totalInput = 0
  for (const source of sourceNodes) {
    totalInput += consumptionByNode.get(source.id) || 0
  }

  let measuredConsumption = 0
  let estimatedConsumption = 0
  let calculatedConsumption = 0

  const nodeResults: BalanceNodeResult[] = graph.nodes.map((node) => {
    const consumption = consumptionByNode.get(node.id) || 0
    const incomingEdges = graph.edges.filter((e) => e.target === node.id)

    const input = node.incoming.length > 0
      ? incomingEdges.reduce((sum, e) => sum + (consumptionByNode.get(e.source) || 0) * (1 - (e.lossFactor || 0)), 0)
      : 0

    let coverage: BalanceNodeResult['coverage'] = 'unmetered'
    if (node.measurementPoints.length > 0) {
      const hasAccumulator = node.measurementPoints.some((mp) => mp.measurement_type === 'accumulator')
      coverage = hasAccumulator ? 'measured' : 'measured'
    } else if (consumption > 0) {
      coverage = 'estimated'
    }

    if (coverage === 'measured') measuredConsumption += consumption
    else if (coverage === 'estimated') estimatedConsumption += consumption

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
    }
  })

  const technicalLosses = graph.edges.reduce(
    (sum, e) => sum + (e.lossFactor || 0) * (consumptionByNode.get(e.source) || 0),
    0,
  )

  const estimatedLeaks = graph.edges.reduce(
    (sum, e) => sum + (e.leakFactor || 0) * (consumptionByNode.get(e.source) || 0),
    0,
  )

  const returns = graph.nodes
    .filter((n) => (n.type as string) === 'condensate_return')
    .reduce((sum, n) => sum + (consumptionByNode.get(n.id) || 0), 0)

  const unaccountedFor = totalInput - measuredConsumption - calculatedConsumption - estimatedConsumption - technicalLosses - estimatedLeaks - returns

  const measurementCoverage = totalInput > 0
    ? (measuredConsumption / totalInput) * 100
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
    nodeResults,
  }
}
