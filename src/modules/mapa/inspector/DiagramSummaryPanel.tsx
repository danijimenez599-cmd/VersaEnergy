import { useMemo } from 'react'
import { BarChart2, CheckCircle, AlertTriangle, XCircle, Zap, ShieldCheck } from 'lucide-react'
import { useDiagramStore } from '../canvas/hooks/useDiagramStore'
import { useDiagramReadings } from '../canvas/hooks/useDiagramReadings'
import { getUtilityLabel } from '@/shared/OperationalContext'

// ── Utility colors ────────────────────────────────────────────────────────────

const UTILITY_BADGE_COLORS: Record<string, string> = {
  electricity:     'bg-blue-100 text-blue-700 border-blue-200',
  natural_gas:     'bg-orange-100 text-orange-700 border-orange-200',
  steam:           'bg-purple-100 text-purple-700 border-purple-200',
  compressed_air:  'bg-teal-100 text-teal-700 border-teal-200',
  chilled_water:   'bg-cyan-100 text-cyan-700 border-cyan-200',
  hot_water:       'bg-rose-100 text-rose-700 border-rose-200',
  industrial_water:'bg-sky-100 text-sky-700 border-sky-200',
  diesel:          'bg-yellow-100 text-yellow-700 border-yellow-200',
  lpg:             'bg-amber-100 text-amber-700 border-amber-200',
  solar_generation:'bg-lime-100 text-lime-700 border-lime-200',
  battery_storage: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

// ── Measurement families (nodes that should have a MP) ────────────────────────

const EQUIPMENT_FAMILIES = new Set([
  'boiler','pump','compressor','chiller','cooling_tower','tank','transformer',
  'panel','generator','heat_exchanger','motor','consumer','custom_equipment',
])

interface DiagramSummaryPanelProps {
  onValidate?: () => void
  validationIssueCount?: number
  errorCount?: number
  warnCount?: number
}

export function DiagramSummaryPanel({
  onValidate,
  validationIssueCount = 0,
  errorCount = 0,
  warnCount = 0,
}: DiagramSummaryPanelProps) {
  const diagramName = useDiagramStore((s) => s.diagramName)
  const diagramStatus = useDiagramStore((s) => s.diagramStatus)
  const diagramUtility = useDiagramStore((s) => s.diagramUtility)
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const readings = useDiagramReadings((s) => s.readings)

  const stats = useMemo(() => {
    const totalNodes = nodes.length
    const totalEdges = edges.length
    const nodesWithoutTag = nodes.filter((n) => !n.data.tag).length
    const edgesWithoutUtility = edges.filter((e) => !e.data?.utility).length

    // Utilities present
    const utilitiesSet = new Set<string>()
    nodes.forEach((n) => { if (n.data.utility) utilitiesSet.add(n.data.utility as string) })
    edges.forEach((e) => { if (e.data?.utility) utilitiesSet.add(e.data.utility) })

    // Measurement coverage: equipment nodes with at least 1 reading
    const equipmentNodes = nodes.filter((n) => EQUIPMENT_FAMILIES.has(n.data.nodeType as string))
    const coveredNodes = equipmentNodes.filter((n) => readings.has(n.id))
    const coveragePct = equipmentNodes.length > 0
      ? Math.round((coveredNodes.length / equipmentNodes.length) * 100)
      : null

    return {
      totalNodes, totalEdges, nodesWithoutTag, edgesWithoutUtility,
      utilities: Array.from(utilitiesSet),
      coveragePct, coveredCount: coveredNodes.length, equipmentCount: equipmentNodes.length,
    }
  }, [nodes, edges, readings])

  const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    draft:     { label: 'Borrador', color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
    published: { label: 'Publicado', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400' },
    archived:  { label: 'Archivado', color: 'text-gray-500 bg-gray-50 border-gray-200', dot: 'bg-gray-400' },
  }
  const stCfg = statusConfig[diagramStatus] || statusConfig.draft

  return (
    <div className="p-4 space-y-4">
      {/* Diagram name + status */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${stCfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dot}`} />
            {stCfg.label}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-gray-800 leading-tight">{diagramName || 'Sin nombre'}</h3>
        {diagramUtility && (
          <p className="text-[11px] text-gray-400 mt-0.5">{getUtilityLabel(diagramUtility)}</p>
        )}
      </div>

      {/* Measurement coverage */}
      {stats.coveragePct !== null && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">
              <BarChart2 size={11} /> Cobertura de medición
            </span>
            <span className={`text-[11px] font-bold ${stats.coveragePct >= 80 ? 'text-emerald-600' : stats.coveragePct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {stats.coveragePct}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${stats.coveragePct >= 80 ? 'bg-emerald-400' : stats.coveragePct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${stats.coveragePct}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {stats.coveredCount} de {stats.equipmentCount} equipos con medidor activo
          </p>
        </div>
      )}

      {/* Node + Edge counts */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-lg px-2.5 py-2">
          <p className="text-[10px] text-gray-400">Nodos</p>
          <p className="text-lg font-bold text-gray-800 leading-none mt-0.5">{stats.totalNodes}</p>
          {stats.nodesWithoutTag > 0 && (
            <p className="text-[10px] text-amber-600 mt-0.5">{stats.nodesWithoutTag} sin TAG</p>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg px-2.5 py-2">
          <p className="text-[10px] text-gray-400">Conexiones</p>
          <p className="text-lg font-bold text-gray-800 leading-none mt-0.5">{stats.totalEdges}</p>
          {stats.edgesWithoutUtility > 0 && (
            <p className="text-[10px] text-amber-600 mt-0.5">{stats.edgesWithoutUtility} sin utility</p>
          )}
        </div>
      </div>

      {/* Utilities present */}
      {stats.utilities.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Utilities presentes
          </p>
          <div className="flex flex-wrap gap-1">
            {stats.utilities.map((u) => (
              <span
                key={u}
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${UTILITY_BADGE_COLORS[u] || 'bg-gray-100 text-gray-600 border-gray-200'}`}
              >
                {getUtilityLabel(u)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Validation summary */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <ShieldCheck size={10} /> Validación
        </p>
        {validationIssueCount === 0 ? (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
            <CheckCircle size={13} />
            Sin problemas detectados
          </div>
        ) : (
          <div className="space-y-1">
            {errorCount > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-red-600">
                <XCircle size={12} /> {errorCount} error{errorCount !== 1 ? 'es' : ''}
              </div>
            )}
            {warnCount > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-600">
                <AlertTriangle size={12} /> {warnCount} advertencia{warnCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
        {onValidate && (
          <button
            onClick={onValidate}
            className="mt-2 w-full text-[11px] px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-[#1B6FF8]/30 hover:text-[#1B6FF8] transition-colors cursor-pointer"
          >
            Validar diagrama →
          </button>
        )}
      </div>

      {/* Empty state hint */}
      {stats.totalNodes === 0 && (
        <div className="bg-[#F0F6FF] rounded-xl p-3 text-center">
          <Zap size={20} className="text-[#1B6FF8] mx-auto mb-1.5" />
          <p className="text-[11px] font-semibold text-[#1B6FF8]">Diagrama vacío</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Arrastra elementos desde la paleta izquierda para comenzar.</p>
        </div>
      )}
    </div>
  )
}
