import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'

const utilityStyles: Record<string, { color: string; dash?: string }> = {
  electricity: { color: '#1e40af' },
  natural_gas: { color: '#ea580c', dash: '6,4' },
  lpg: { color: '#ea580c', dash: '3,3' },
  diesel: { color: '#f97316', dash: '8,4' },
  steam: { color: '#7c3aed', dash: '12,6' },
  condensate: { color: '#a855f7', dash: '8,4' },
  compressed_air: { color: '#0d9488' },
  chilled_water: { color: '#06b6d4' },
  hot_water: { color: '#0891b2' },
  industrial_water: { color: '#0e7490' },
  potable_water: { color: '#0369a1' },
  process_water: { color: '#0284c7' },
  refrigeration: { color: '#06b6d4', dash: '4,4' },
  industrial_gas: { color: '#6366f1', dash: '6,4' },
  solar_generation: { color: '#22c55e' },
  battery_storage: { color: '#16a34a', dash: '8,8' },
}

const flowLabels: Record<string, string> = {
  source_to_target: '→',
  target_to_source: '←',
  bidirectional: '↔',
  unknown: '?',
}

const UtilityEdge = memo((props: EdgeProps) => {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
  } = props

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const utility = (data as Record<string, unknown>)?.utility as string | undefined
  const edgeType = (data as Record<string, unknown>)?.edgeType as string | undefined
  const flowDir = (data as Record<string, unknown>)?.flowDirection as string || 'source_to_target'
  const label = (data as Record<string, unknown>)?.label as string | undefined
  const tag = (data as Record<string, unknown>)?.tag as string | undefined

  const styleInfo = utility ? utilityStyles[utility] : undefined
  const color = styleInfo?.color || '#6b7280'
  const strokeWidth = edgeType === 'signal' ? 1.5 : edgeType === 'logical' ? 1.5 : 2.5
  const strokeDasharray = edgeType === 'logical' ? '4,4' : edgeType === 'signal' ? '2,2' : styleInfo?.dash

  const markerId = `arrow-${color.replace('#', '')}`
  const flowSymbol = flowLabels[flowDir] || '→'
  const displayLabel = (label || tag || `${utility || ''} ${flowSymbol}`) as string

  return (
    <>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="8" refY="5"
          markerWidth="6" markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth,
          strokeDasharray,
          filter: selected ? 'drop-shadow(0 0 4px rgba(59,130,246,0.5))' : undefined,
        }}
        markerEnd={`url(#${markerId})`}
      />
      <EdgeLabelRenderer>
        <div
          className="absolute pointer-events-none text-[10px] font-medium bg-white/80 px-1.5 py-0.5 rounded border border-gray-200 shadow-sm"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            color,
          }}
        >
          {displayLabel}
        </div>
      </EdgeLabelRenderer>
    </>
  )
})

UtilityEdge.displayName = 'UtilityEdge'

export const edgeTypes = { utility: UtilityEdge }
export { utilityStyles }
