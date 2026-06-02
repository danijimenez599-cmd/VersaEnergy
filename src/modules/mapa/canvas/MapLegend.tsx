import { useState } from 'react'
import { Layers, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'

interface UtilityEntry {
  id: string
  label: string
  color: string
  dash?: string
  width: number
}

const UTILITY_STYLES: UtilityEntry[] = [
  { id: 'electricity',     label: 'Electricidad',      color: '#1e40af', width: 2 },
  { id: 'natural_gas',     label: 'Gas natural',        color: '#ea580c', width: 3, dash: '2 4' },
  { id: 'steam',           label: 'Vapor',              color: '#7c3aed', width: 4, dash: '8 4' },
  { id: 'compressed_air',  label: 'Aire comprimido',    color: '#0d9488', width: 3 },
  { id: 'chilled_water',   label: 'Agua helada',        color: '#06b6d4', width: 3 },
  { id: 'hot_water',       label: 'Agua caliente',      color: '#dc2626', width: 3, dash: '4 2' },
  { id: 'industrial_water',label: 'Agua industrial',    color: '#0891b2', width: 3 },
  { id: 'potable_water',   label: 'Agua potable',       color: '#0ea5e9', width: 2 },
  { id: 'diesel',          label: 'Diésel',             color: '#92400e', width: 3, dash: '6 3' },
  { id: 'lpg',             label: 'GLP',                color: '#f59e0b', width: 3, dash: '3 3' },
  { id: 'solar_generation',label: 'Solar',              color: '#eab308', width: 2 },
  { id: 'battery_storage', label: 'Batería',            color: '#4ade80', width: 2 },
]

interface Props {
  presentUtilities: string[]
  showCoverage: boolean
  onToggleCoverage: (v: boolean) => void
}

export function MapLegend({ presentUtilities, showCoverage, onToggleCoverage }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const visibleUtils = expanded
    ? UTILITY_STYLES.filter((u) => presentUtilities.includes(u.id))
    : UTILITY_STYLES.filter((u) => presentUtilities.includes(u.id)).slice(0, 5)

  const allPresent = UTILITY_STYLES.filter((u) => presentUtilities.includes(u.id))
  const hasMore = allPresent.length > 5

  if (collapsed) {
    return (
      <div className="absolute bottom-4 left-4 z-10">
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border rounded-lg shadow-md text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
        >
          <Layers size={13} /> Leyenda
        </button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-surface border border-border rounded-xl shadow-lg w-52 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-gray-50/60">
        <div className="flex items-center gap-1.5">
          <Layers size={12} className="text-gray-500" />
          <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Leyenda</span>
        </div>
        <button onClick={() => setCollapsed(true)} className="p-0.5 rounded hover:bg-gray-200 cursor-pointer">
          <ChevronDown size={12} className="text-gray-400" />
        </button>
      </div>

      {/* Utility lines */}
      <div className="px-3 py-2 space-y-1.5">
        {allPresent.length === 0 ? (
          <p className="text-[11px] text-gray-400">Sin utilities en el diagrama</p>
        ) : (
          <>
            {visibleUtils.map((u) => (
              <div key={u.id} className="flex items-center gap-2">
                <LineSample color={u.color} dash={u.dash} width={u.width} />
                <span className="text-[11px] text-gray-600 leading-none">{u.label}</span>
              </div>
            ))}
            {hasMore && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[11px] text-brand-blue hover:underline cursor-pointer mt-0.5"
              >
                {expanded ? <><ChevronUp size={10} /> Menos</> : <><ChevronDown size={10} /> +{allPresent.length - 5} más</>}
              </button>
            )}
          </>
        )}
      </div>

      {/* Line type legend */}
      <div className="px-3 py-2 border-t border-border space-y-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Tipo de línea</p>
        <div className="flex items-center gap-2">
          <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="#6b7280" strokeWidth="2" /></svg>
          <span className="text-[11px] text-gray-500">Física</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="#6b7280" strokeWidth="2" strokeDasharray="4 3" /></svg>
          <span className="text-[11px] text-gray-500">Estimada / Lógica</span>
        </div>
      </div>

      {/* Overlays */}
      <div className="px-3 py-2 border-t border-border">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Overlays</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => onToggleCoverage(!showCoverage)}
            className={`w-7 h-4 rounded-full transition-colors flex items-center cursor-pointer ${showCoverage ? 'bg-brand-blue' : 'bg-gray-300'}`}
          >
            <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform mx-0.5 ${showCoverage ? 'translate-x-3' : 'translate-x-0'}`} />
          </div>
          <span className="text-[11px] text-gray-600">Cobertura de medición</span>
          {showCoverage ? <Eye size={11} className="text-brand-blue" /> : <EyeOff size={11} className="text-gray-400" />}
        </label>
      </div>
    </div>
  )
}

function LineSample({ color, dash, width }: { color: string; dash?: string; width: number }) {
  return (
    <svg width="28" height="8" className="shrink-0">
      <line
        x1="0" y1="4" x2="28" y2="4"
        stroke={color}
        strokeWidth={Math.min(width, 3)}
        strokeDasharray={dash}
      />
    </svg>
  )
}
