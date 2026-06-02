import type { Node } from '@xyflow/react'
import type { DiagramNodeData } from '@/services/topology-engine/graphTypes'
import type { LastReading, ReadingQuality } from '@/services/measurement-engine/lastReadings'

// ── Coverage overlay ──────────────────────────────────────────────────────────
// Colors nodes based on presence/quality of linked MeasurementPoints

export type CoverageStatus = 'good' | 'delayed' | 'missing' | 'uncovered' | 'exempt'

export interface CoverageNodeStyle {
  nodeId: string
  status: CoverageStatus
  borderColor: string
  bgColor: string
  dotColor: string
  label: string
}

// Node types that should be measured (equipment family)
const MEASURABLE_NODE_TYPES = new Set([
  'boiler', 'pump', 'compressor', 'chiller', 'cooling_tower', 'tank',
  'transformer', 'panel', 'generator', 'heat_exchanger', 'motor', 'consumer',
  'custom_equipment',
])

// Node types that are exempt (organizational, connectors, special)
const EXEMPT_NODE_TYPES = new Set([
  'connector_pipe', 'connector_duct', 'connector_cable', 'connector_busbar',
  'header', 'manifold', 'branch', 'junction',
  'valve', 'damper', 'breaker', 'disconnect', 'control_valve', 'regulator', 'check_valve',
  'area_node', 'process_node', 'production_line', 'area', 'process', 'site', 'cost_center',
  'annotation', 'group',
  'iot_device', 'gateway', 'plc', 'rtu', 'edge_device', 'virtual_point', 'api_source',
  'manual_reading_source',
])

const COVERAGE_STYLES: Record<CoverageStatus, Omit<CoverageNodeStyle, 'nodeId' | 'status'>> = {
  good:     { borderColor: '#15803d', bgColor: '#f0fdf4', dotColor: '#15803d', label: 'Medido — actualizado' },
  delayed:  { borderColor: '#b45309', bgColor: '#fffbeb', dotColor: '#b45309', label: 'Medido — con retraso' },
  missing:  { borderColor: '#b91c1c', bgColor: '#fef2f2', dotColor: '#b91c1c', label: 'Sin datos recientes' },
  uncovered:{ borderColor: '#6b7280', bgColor: '#f9fafb', dotColor: '#6b7280', label: 'Sin medidor vinculado' },
  exempt:   { borderColor: 'transparent', bgColor: 'transparent', dotColor: 'transparent', label: 'Exento' },
}

export function computeCoverageStyles(
  nodes: Node<DiagramNodeData>[],
  readings: Map<string, LastReading>,
): Map<string, CoverageNodeStyle> {
  const result = new Map<string, CoverageNodeStyle>()

  for (const node of nodes) {
    const nt = node.data.nodeType as string

    // Measurement nodes always show their own quality
    const isMeasurementNode = [
      'flow_meter', 'energy_meter', 'power_meter', 'pressure_sensor',
      'temperature_sensor', 'level_sensor', 'current_transformer',
      'gas_meter', 'water_meter', 'steam_meter', 'custom_meter',
    ].includes(nt)

    if (EXEMPT_NODE_TYPES.has(nt) && !isMeasurementNode) {
      result.set(node.id, { nodeId: node.id, status: 'exempt', ...COVERAGE_STYLES.exempt })
      continue
    }

    const reading = readings.get(node.id)
    let status: CoverageStatus

    if (!reading) {
      // utility_source nodes are treated specially
      if (nt === 'utility_source') {
        status = 'exempt'
      } else if (isMeasurementNode || MEASURABLE_NODE_TYPES.has(nt)) {
        status = 'uncovered'
      } else {
        status = 'exempt'
      }
    } else {
      const q = reading.quality as ReadingQuality
      status = q === 'none' ? 'uncovered' : (q as CoverageStatus)
    }

    result.set(node.id, { nodeId: node.id, status, ...COVERAGE_STYLES[status] })
  }

  return result
}

/** Summary stats for the coverage overlay */
export interface CoverageSummary {
  total: number
  good: number
  delayed: number
  missing: number
  uncovered: number
  coveragePct: number
}

export function computeCoverageSummary(styles: Map<string, CoverageNodeStyle>): CoverageSummary {
  let good = 0, delayed = 0, missing = 0, uncovered = 0, total = 0

  for (const s of styles.values()) {
    if (s.status === 'exempt') continue
    total++
    if (s.status === 'good')      good++
    else if (s.status === 'delayed')  delayed++
    else if (s.status === 'missing')  missing++
    else if (s.status === 'uncovered') uncovered++
  }

  const coveragePct = total > 0 ? Math.round(((good + delayed) / total) * 100) : 0
  return { total, good, delayed, missing, uncovered, coveragePct }
}
