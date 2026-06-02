import type { Edge } from '@xyflow/react'
import type { DiagramEdgeData } from '@/services/topology-engine/graphTypes'

// ── Balance overlay ───────────────────────────────────────────────────────────
// Colors edges based on % contribution to total flow/energy in the diagram.
// When a balance has been run, edges can carry computed flow values from the
// balance-engine. This overlay reads those values from edge.data.properties.

export interface BalanceEdgeStyle {
  edgeId: string
  flowValue: number | null   // computed or measured value (in diagram unit)
  pct: number | null         // % of max flow in diagram (0–100)
  strokeColor: string
  strokeWidth: number
  label: string | null
  hasData: boolean
}

// Heatmap: low % → gray, medium → amber, high → teal/green
function pctToColor(pct: number): string {
  if (pct < 10) return '#9ca3af'   // gray
  if (pct < 30) return '#fbbf24'   // amber
  if (pct < 60) return '#34d399'   // emerald
  if (pct < 85) return '#10b981'   // green
  return '#059669'                  // dark green (max flow)
}

function pctToWidth(pct: number): number {
  if (pct < 10) return 2
  if (pct < 30) return 3
  if (pct < 60) return 4
  if (pct < 85) return 5
  return 6
}

export function computeBalanceStyles(
  edges: Edge<DiagramEdgeData>[],
): Map<string, BalanceEdgeStyle> {
  const result = new Map<string, BalanceEdgeStyle>()

  // Extract flow values from edge properties (set by balance-engine or manual)
  const edgesWithValues: Array<{ edge: Edge<DiagramEdgeData>; value: number }> = []

  for (const edge of edges) {
    const props = edge.data?.properties as Record<string, unknown> | undefined
    const flow = props?.computed_flow ?? props?.measured_flow ?? props?.flow_value
    if (typeof flow === 'number' && flow >= 0) {
      edgesWithValues.push({ edge, value: flow })
    }
  }

  const maxFlow = edgesWithValues.length > 0
    ? Math.max(...edgesWithValues.map((e) => e.value))
    : 0

  for (const edge of edges) {
    const props = edge.data?.properties as Record<string, unknown> | undefined
    const flow = props?.computed_flow ?? props?.measured_flow ?? props?.flow_value
    const hasData = typeof flow === 'number'

    if (!hasData || maxFlow === 0) {
      result.set(edge.id, {
        edgeId: edge.id,
        flowValue: null,
        pct: null,
        strokeColor: '#d1d5db',  // no-data: light gray
        strokeWidth: 2,
        label: null,
        hasData: false,
      })
      continue
    }

    const value = flow as number
    const pct = maxFlow > 0 ? (value / maxFlow) * 100 : 0

    result.set(edge.id, {
      edgeId: edge.id,
      flowValue: value,
      pct: Math.round(pct),
      strokeColor: pctToColor(pct),
      strokeWidth: pctToWidth(pct),
      label: `${pct.toFixed(0)}%`,
      hasData: true,
    })
  }

  return result
}

/** Returns true if at least one edge has balance data */
export function hasBalanceData(styles: Map<string, BalanceEdgeStyle>): boolean {
  for (const s of styles.values()) {
    if (s.hasData) return true
  }
  return false
}
