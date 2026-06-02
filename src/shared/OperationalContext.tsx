import { AlertTriangle, CalendarDays, Factory, Zap } from 'lucide-react'
import { Badge } from './Badge'
import { EmptyState } from './EmptyState'
import { useUIStore } from '@/store/uiStore'

export const utilityOptions = [
  { value: '', label: 'Todos los utilities' },
  { value: 'electricity', label: 'Electricidad' },
  { value: 'natural_gas', label: 'Gas natural' },
  { value: 'steam', label: 'Vapor' },
  { value: 'compressed_air', label: 'Aire comprimido' },
  { value: 'chilled_water', label: 'Agua helada' },
  { value: 'hot_water', label: 'Agua caliente' },
  { value: 'industrial_water', label: 'Agua industrial' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'lpg', label: 'GLP' },
]

export function getUtilityLabel(utility: string | null) {
  return utilityOptions.find((option) => option.value === (utility ?? ''))?.label ?? utility ?? 'Todos los utilities'
}

export function getEnergyPeriodRange(period: string) {
  const [year, month] = period.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  }
}

export function formatEnergyPeriod(period: string) {
  const { start } = getEnergyPeriodRange(period)
  return start.toLocaleDateString('es', { month: 'long', year: 'numeric' })
}

export function OperationalContextSummary() {
  const { availableSites, selectedSiteId, selectedUtilityType, selectedPeriod } = useUIStore()
  const site = availableSites.find((item) => item.id === selectedSiteId)

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-gray-600">
        <Factory size={13} />
        {site?.name ?? 'Sin sitio'}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-gray-600">
        <Zap size={13} />
        {getUtilityLabel(selectedUtilityType)}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-gray-600">
        <CalendarDays size={13} />
        {formatEnergyPeriod(selectedPeriod)}
      </span>
    </div>
  )
}

export function OperationalContextBanner({
  requiresSite = true,
  className = '',
}: {
  requiresSite?: boolean
  className?: string
}) {
  const { availableSites, selectedSiteId } = useUIStore()

  if (!requiresSite || selectedSiteId) return null

  if (availableSites.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          icon={<Factory size={48} strokeWidth={1.5} />}
          title="Crea el primer sitio"
          description="El contexto operacional necesita un sitio para filtrar modelo, mapa, medicion, balances y acciones."
        />
      </div>
    )
  }

  return (
    <div className={`mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 ${className}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <p>
          Selecciona un sitio en la barra superior para activar este modulo con
          el contexto operacional correcto.
        </p>
      </div>
    </div>
  )
}

export function OperationalStatusBadge() {
  const { selectedSiteId } = useUIStore()

  if (!selectedSiteId) {
    return (
      <Badge color="orange" size="sm">
        Contexto incompleto
      </Badge>
    )
  }

  return (
    <Badge color="green" size="sm">
      Contexto listo
    </Badge>
  )
}
