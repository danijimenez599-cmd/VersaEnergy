import { useState, useMemo } from 'react'
import { Layers, Activity, BarChart2, X, ChevronDown, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDiagramStore } from './hooks/useDiagramStore'
import { useDiagramReadings } from './hooks/useDiagramReadings'
import { computeCoverageSummary, computeCoverageStyles } from './overlays/coverage'
import { hasBalanceData, computeBalanceStyles } from './overlays/balance'

// ── Types ─────────────────────────────────────────────────────────────────────

export type OverlayMode = 'none' | 'coverage' | 'balance'

interface OverlayBarProps {
  activeOverlay: OverlayMode
  onOverlayChange: (mode: OverlayMode) => void
}

// ── Overlay Bar ───────────────────────────────────────────────────────────────

export function OverlayBar({ activeOverlay, onOverlayChange }: OverlayBarProps) {
  const [expanded, setExpanded] = useState(false)
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const readings = useDiagramReadings((s) => s.readings)

  // Coverage summary
  const coverageStyles = useMemo(
    () => computeCoverageStyles(nodes as never, readings),
    [nodes, readings],
  )
  const summary = useMemo(() => computeCoverageSummary(coverageStyles), [coverageStyles])

  // Balance data check
  const balanceStyles = useMemo(() => computeBalanceStyles(edges as never), [edges])
  const hasBalance = useMemo(() => hasBalanceData(balanceStyles), [balanceStyles])

  function toggle(mode: OverlayMode) {
    onOverlayChange(activeOverlay === mode ? 'none' : mode)
  }

  const overlayConfig = [
    {
      mode: 'coverage' as OverlayMode,
      icon: Activity,
      label: 'Cobertura',
      description: 'Colorea nodos según presencia y calidad de medidor',
      active: activeOverlay === 'coverage',
      badge: summary.total > 0
        ? `${summary.coveragePct}%`
        : null,
      badgeColor: summary.coveragePct >= 80 ? 'bg-emerald-500'
                : summary.coveragePct >= 50 ? 'bg-amber-500'
                : 'bg-red-500',
      available: true,
    },
    {
      mode: 'balance' as OverlayMode,
      icon: BarChart2,
      label: 'Balance',
      description: 'Colorea conexiones según % de flujo total (requiere balance ejecutado)',
      active: activeOverlay === 'balance',
      badge: hasBalance ? 'datos' : null,
      badgeColor: 'bg-teal-500',
      available: hasBalance,
    },
  ]

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">

      {/* Expanded info panel */}
      <AnimatePresence>
        {expanded && activeOverlay === 'coverage' && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-4 w-72"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-800">Cobertura de medición</p>
              <button onClick={() => setExpanded(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={12} /></button>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>Cobertura total</span>
                <span className="font-bold">{summary.coveragePct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    summary.coveragePct >= 80 ? 'bg-emerald-500' :
                    summary.coveragePct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${summary.coveragePct}%` }}
                />
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { color: '#15803d', label: 'Actualizado', count: summary.good },
                { color: '#b45309', label: 'Con retraso', count: summary.delayed },
                { color: '#b91c1c', label: 'Sin datos',   count: summary.missing },
                { color: '#6b7280', label: 'Sin medidor', count: summary.uncovered },
              ].map(({ color, label, count }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-gray-600">{label}</span>
                  <span className="text-[10px] font-bold text-gray-800 ml-auto">{count}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {expanded && activeOverlay === 'balance' && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-floating p-4 w-60"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-800">Overlay de Balance</p>
              <button onClick={() => setExpanded(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={12} /></button>
            </div>
            <div className="space-y-1.5">
              {[
                { color: '#059669', label: '≥ 85% del total' },
                { color: '#10b981', label: '60–85%' },
                { color: '#34d399', label: '30–60%' },
                { color: '#fbbf24', label: '10–30%' },
                { color: '#9ca3af', label: '< 10%' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="h-1.5 w-7 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main pill bar */}
      <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] px-2 py-1.5">
        {/* Label */}
        <div className="flex items-center gap-1.5 px-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          <Layers size={11} />
          Overlays
        </div>

        <div className="w-px h-4 bg-gray-200" />

        {/* Overlay buttons */}
        {overlayConfig.map(({ mode, icon: Icon, label, description, active, badge, badgeColor, available }) => (
          <button
            key={mode}
            onClick={() => available ? toggle(mode) : undefined}
            title={description}
            className={[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all duration-150 cursor-pointer',
              active
                ? 'bg-[#1B6FF8] text-white shadow-sm'
                : available
                  ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  : 'text-gray-300 cursor-not-allowed',
            ].join(' ')}
          >
            <Icon size={12} />
            {label}
            {badge && (
              <span className={`text-[9px] font-bold text-white px-1 py-0.5 rounded-full ${active ? 'bg-white/20' : badgeColor}`}>
                {badge}
              </span>
            )}
          </button>
        ))}

        {/* Expand info button (visible when overlay is active) */}
        {activeOverlay !== 'none' && (
          <>
            <div className="w-px h-4 bg-gray-200" />
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <Info size={11} />
              <ChevronDown size={10} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
