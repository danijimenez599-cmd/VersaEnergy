import { X, AlertTriangle, Info, ChevronRight, ShieldCheck } from 'lucide-react'
import type { ValidationIssue } from '@/services/topology-engine/graphTypes'
import { useDiagramStore } from '../canvas/hooks/useDiagramStore'

interface Props {
  issues: ValidationIssue[]
  onClose: () => void
}

const SEV_CONFIG = {
  error:   { color: 'text-red-600', bg: 'bg-red-50 border-red-100', badge: 'bg-red-100 text-red-700', Icon: AlertTriangle },
  warning: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', badge: 'bg-amber-100 text-amber-700', Icon: AlertTriangle },
  info:    { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', badge: 'bg-blue-100 text-blue-700', Icon: Info },
}

export function ValidationPanel({ issues, onClose }: Props) {
  const selectElement = useDiagramStore((s) => s.selectElement)

  const errors   = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity === 'warning')
  const infos    = issues.filter((i) => i.severity === 'info')

  function handleGoToElement(issue: ValidationIssue) {
    if (issue.targetId && (issue.targetType === 'node' || issue.targetType === 'edge')) {
      selectElement({ type: issue.targetType as 'node' | 'edge', id: issue.targetId })
    }
  }

  return (
    <div className="w-72 bg-surface border-l border-border h-full flex flex-col shrink-0 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-surface z-10">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-gray-500" />
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Validación</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 cursor-pointer">
          <X size={14} />
        </button>
      </div>

      {/* Summary badges */}
      <div className="flex gap-2 px-4 py-3 border-b border-border">
        <SummaryBadge count={errors.length} label="Errores" color="bg-red-100 text-red-700" />
        <SummaryBadge count={warnings.length} label="Advertencias" color="bg-amber-100 text-amber-700" />
        <SummaryBadge count={infos.length} label="Info" color="bg-blue-100 text-blue-700" />
      </div>

      {/* Issues list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {issues.length === 0 && (
          <div className="py-12 text-center">
            <ShieldCheck size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-600">Sin problemas detectados</p>
            <p className="text-xs text-gray-400 mt-1">El diagrama puede publicarse.</p>
          </div>
        )}

        {errors.length > 0 && <GroupLabel label="Errores críticos" count={errors.length} color="text-red-600" />}
        {errors.map((issue) => <IssueCard key={issue.id} issue={issue} onGoTo={handleGoToElement} />)}

        {warnings.length > 0 && <GroupLabel label="Advertencias" count={warnings.length} color="text-amber-600" />}
        {warnings.map((issue) => <IssueCard key={issue.id} issue={issue} onGoTo={handleGoToElement} />)}

        {infos.length > 0 && <GroupLabel label="Información" count={infos.length} color="text-blue-600" />}
        {infos.map((issue) => <IssueCard key={issue.id} issue={issue} onGoTo={handleGoToElement} />)}
      </div>
    </div>
  )
}

function SummaryBadge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className={`flex-1 rounded-lg px-2 py-1.5 text-center ${color}`}>
      <p className="text-base font-bold leading-none">{count}</p>
      <p className="text-[10px] font-medium mt-0.5">{label}</p>
    </div>
  )
}

function GroupLabel({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${color} mt-2`}>
      {label} <span className="font-normal">({count})</span>
    </div>
  )
}

function IssueCard({ issue, onGoTo }: { issue: ValidationIssue; onGoTo: (i: ValidationIssue) => void }) {
  const cfg = SEV_CONFIG[issue.severity] || SEV_CONFIG.info
  const { Icon, bg, color } = cfg
  const canNavigate = Boolean(issue.targetId) && (issue.targetType === 'node' || issue.targetType === 'edge')

  return (
    <div className={`rounded-lg border p-2.5 ${bg}`}>
      <div className="flex items-start gap-2">
        <Icon size={13} className={`${color} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold font-mono text-gray-500">{issue.ruleId}</span>
            {issue.targetType && (
              <span className="text-[10px] text-gray-400">{issue.targetType}</span>
            )}
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">{issue.message}</p>
          {canNavigate && (
            <button
              onClick={() => onGoTo(issue)}
              className={`mt-1.5 flex items-center gap-1 text-[11px] font-medium ${color} cursor-pointer hover:underline`}
            >
              Ir al elemento <ChevronRight size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
