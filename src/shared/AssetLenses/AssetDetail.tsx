import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Activity, Gauge, Scale, TrendingUp, Zap, Map, FileText, Wrench,
  Factory, Layers, Network, Settings,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { ASSET_TYPE_LABELS } from '@/shared/assetHelpers'

// ── Lens config ───────────────────────────────────────────────────────────────

const LENSES = [
  { id: 'resumen',       label: 'Resumen',       icon: Activity },
  { id: 'equipos',       label: 'Equipos',        icon: Settings },
  { id: 'medicion',      label: 'Medición',       icon: Gauge },
  { id: 'balances',      label: 'Balance',        icon: Scale },
  { id: 'desempeno',     label: 'Desempeño',      icon: TrendingUp },
  { id: 'acciones',      label: 'Acciones',       icon: Zap },
  { id: 'mapa',          label: 'Mapa',           icon: Map },
  { id: 'mantenimiento', label: 'Mantenimiento',  icon: Wrench },
  { id: 'docs',          label: 'Docs',           icon: FileText },
]

const TYPE_ICONS: Record<string, React.ElementType> = {
  plant:     Factory,
  area:      Layers,
  system:    Network,
  equipment: Settings,
}

// Lentes disponibles según el tipo de activo. Si no hay activo, mostrar todas.
function visibleLenses(type: string | null) {
  if (!type || type === 'plant') return LENSES
  if (type === 'area')      return LENSES.filter((l) => !['docs'].includes(l.id))
  if (type === 'system')    return LENSES.filter((l) => !['docs'].includes(l.id))
  if (type === 'equipment') return LENSES
  return LENSES
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AssetDetail() {
  const { selectedAssetSourceId, selectedAssetType, activeLens, setActiveLens } = useUIStore()
  const navigate = useNavigate()
  const location = useLocation()

  const TypeIcon = selectedAssetType ? (TYPE_ICONS[selectedAssetType] ?? Factory) : Factory
  const typeLabel = selectedAssetType
    ? (ASSET_TYPE_LABELS as Record<string, string>)[selectedAssetType] ?? selectedAssetType
    : null

  // Derive active lens from current route so navigation stays in sync
  const currentLens = LENSES.find((l) => location.pathname.endsWith(`/${l.id}`))?.id ?? activeLens

  const lenses = visibleLenses(selectedAssetType)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Asset header */}
      <div className="bg-white border-b border-[--color-border-strong] px-5 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[--color-brand]/10 flex items-center justify-center shrink-0">
            <TypeIcon size={16} className="text-[--color-brand]" />
          </div>
          <div className="min-w-0 flex-1">
            {typeLabel && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-[--color-tx-3] leading-none mb-0.5">
                {typeLabel}
              </p>
            )}
            {!selectedAssetSourceId && (
              <p className="text-sm text-[--color-tx-3]">Selecciona un activo en el árbol</p>
            )}
          </div>
        </div>
      </div>

      {/* Lenses bar */}
      <div className="bg-white border-b border-[--color-border-strong] shrink-0 px-4">
        <nav className="flex gap-0.5 overflow-x-auto">
          {lenses.map((lens) => {
            const Icon = lens.icon
            const isActive = currentLens === lens.id
            return (
              <button
                key={lens.id}
                onClick={() => {
                  setActiveLens(lens.id)
                  navigate(`/${lens.id}`)
                }}
                className={[
                  'flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'border-[--color-brand] text-[--color-brand]'
                    : 'border-transparent text-[--color-tx-3] hover:text-[--color-tx] hover:border-[--color-border-strong]',
                ].join(' ')}
              >
                <Icon size={14} />
                {lens.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Lens content */}
      <div className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </div>
    </div>
  )
}
