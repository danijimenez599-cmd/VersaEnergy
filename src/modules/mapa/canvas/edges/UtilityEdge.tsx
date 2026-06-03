import { memo, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useReactFlow, type EdgeProps } from '@xyflow/react'
import { useDiagramStore } from '../hooks/useDiagramStore'
import { getMeterNodesAnchoredToEdge, getSelectedMeterScope } from '../meterScopePreview'

const utilityStyles: Record<string, { color: string; dash?: string }> = {
  electricity: { color: '#1d4ed8' },
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

interface LabelOffset { dx: number; dy: number }

// Etiqueta de arista arrastrable — el usuario puede reposicionarla para evitar
// traslapes. El offset se guarda en edge.data.labelOffset.
function DraggableEdgeLabel({
  id, x, y, color, text, offset,
}: { id: string; x: number; y: number; color: string; text: string; offset: LabelOffset }) {
  const updateEdge = useDiagramStore((s) => s.updateEdge)
  const { getZoom } = useReactFlow()
  const [local, setLocal] = useState<LabelOffset>(offset)
  const drag = useRef<{ sx: number; sy: number; bdx: number; bdy: number } | null>(null)

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { sx: e.clientX, sy: e.clientY, bdx: local.dx, bdy: local.dy }
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    const z = getZoom() || 1
    setLocal({
      dx: drag.current.bdx + (e.clientX - drag.current.sx) / z,
      dy: drag.current.bdy + (e.clientY - drag.current.sy) / z,
    })
  }
  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    drag.current = null
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    updateEdge(id, { labelOffset: local })
  }

  return (
    <div
      className="nodrag nopan absolute text-[10px] font-semibold bg-white px-1.5 py-0.5 rounded-md border shadow-sm cursor-move select-none"
      style={{
        transform: `translate(-50%, -50%) translate(${x + local.dx}px, ${y + local.dy}px)`,
        color,
        borderColor: color + '40',
        pointerEvents: 'all',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      title="Arrastra para reposicionar la etiqueta"
    >
      {text}
    </div>
  )
}

const UtilityEdge = memo((props: EdgeProps) => {
  const {
    id,
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    data, selected,
  } = props

  // Orthogonal routing (90° elbows, rounded corners) — much easier to read
  // than bezier curves for technical one-line / utility diagrams.
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 8,
  })

  const utility = (data as Record<string, unknown>)?.utility as string | undefined
  const edgeType = (data as Record<string, unknown>)?.edgeType as string | undefined
  const label = (data as Record<string, unknown>)?.label as string | undefined
  const tag = (data as Record<string, unknown>)?.tag as string | undefined
  const labelOffset = ((data as Record<string, unknown>)?.labelOffset as LabelOffset) || { dx: 0, dy: 0 }

  const styleInfo = utility ? utilityStyles[utility] : undefined
  const color = styleInfo?.color || '#6b7280'
  const strokeWidth = edgeType === 'signal' || edgeType === 'logical' ? 1.5 : 2.5
  const strokeDasharray = edgeType === 'logical' ? '4,4' : edgeType === 'signal' ? '2,2' : styleInfo?.dash
  const allNodes = useDiagramStore((s) => s.nodes)
  const allEdges = useDiagramStore((s) => s.edges)
  const selectedElement = useDiagramStore((s) => s.selectedElement)
  const selectElement = useDiagramStore((s) => s.selectElement)
  const selectedMeterScope = useMemo(
    () => getSelectedMeterScope(allNodes, allEdges, selectedElement),
    [allNodes, allEdges, selectedElement],
  )
  const anchoredMeters = useMemo(
    () => getMeterNodesAnchoredToEdge(allNodes, id),
    [allNodes, id],
  )
  const modelEdge = allEdges.find((edge) => edge.id === id)
  const isInSelectedMeterScope = Boolean(
    selectedMeterScope &&
    modelEdge &&
    edgeType !== 'signal' &&
    edgeType !== 'logical' &&
    (
      selectedMeterScope.downstreamNodeIds.includes(modelEdge.source) ||
      selectedMeterScope.downstreamNodeIds.includes(modelEdge.target)
    ),
  )

  const markerId = `arrow-${color.replace('#', '')}`

  // Only show a label chip when there is a meaningful label/tag — avoids the
  // noise of "electricity →" on every edge.
  const displayLabel = label || tag || null

  return (
    <>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="8" refY="5"
          markerWidth="7" markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected || isInSelectedMeterScope ? strokeWidth + 1.5 : strokeWidth,
          strokeDasharray,
          filter: selected || isInSelectedMeterScope ? `drop-shadow(0 0 5px ${color}80)` : undefined,
        }}
        markerEnd={`url(#${markerId})`}
      />
      {displayLabel && (
        <EdgeLabelRenderer>
          <DraggableEdgeLabel
            id={id}
            x={labelX}
            y={labelY}
            color={color}
            text={displayLabel}
            offset={labelOffset}
          />
        </EdgeLabelRenderer>
      )}
      {anchoredMeters.length > 0 && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute flex items-center gap-1"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 24}px)`,
              pointerEvents: 'all',
            }}
          >
            {anchoredMeters.map((meter, index) => {
              const isSelected = selectedElement?.type === 'node' && selectedElement.id === meter.id
              return (
                <button
                  key={meter.id}
                  onClick={(event) => {
                    event.stopPropagation()
                    selectElement({ type: 'node', id: meter.id })
                  }}
                  className="relative flex items-center gap-1 rounded-full border bg-white px-1.5 py-0.5 text-[9px] font-mono font-bold shadow-sm transition-transform hover:scale-105"
                  style={{
                    borderColor: isSelected ? color : color + '55',
                    color,
                    transform: `translateX(${(index - (anchoredMeters.length - 1) / 2) * 4}px)`,
                    boxShadow: isSelected ? `0 0 0 3px ${color}24` : undefined,
                  }}
                  title={`Medidor anclado a esta linea: ${meter.data.tag}`}
                >
                  <span className="absolute left-1/2 top-full h-4 border-l border-dashed" style={{ borderColor: color }} />
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {meter.data.tag}
                </button>
              )
            })}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})

UtilityEdge.displayName = 'UtilityEdge'

export const edgeTypes = { utility: UtilityEdge }
export { utilityStyles }
