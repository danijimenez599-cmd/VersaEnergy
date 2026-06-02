import { useEffect, useState } from 'react'
import { PageHeader } from '@/shared/PageHeader'
import { EmptyState } from '@/shared/EmptyState'
import { useUIStore } from '@/store/uiStore'
import { SourcesView } from './views/SourcesView'
import { UtilityDefinitionsView } from './views/UtilityDefinitionsView'
import { PlantAssetTreeView } from './views/PlantAssetTreeView'
import { OperationalContextBanner, OperationalContextSummary } from '@/shared/OperationalContext'
import { supabase } from '@/services/supabase'
import { GitBranch, Power, BookOpen, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'

interface CmmsStats {
  total: number
  withCode: number
  withSpecs: number
  withMeters: number
}

async function loadCmmsStats(siteId: string): Promise<CmmsStats> {
  const { data: eq } = await supabase
    .from('energy_equipment')
    .select('tag, properties')
    .eq('site_id', siteId)
    .neq('equipment_type', 'meter')

  if (!eq) return { total: 0, withCode: 0, withSpecs: 0, withMeters: 0 }

  const { data: mps } = await supabase
    .from('measurement_points')
    .select('target_id')
    .eq('site_id', siteId)

  const equippedIds = new Set((mps || []).map((m) => m.target_id))

  return {
    total: eq.length,
    withCode: eq.filter((e) => e.tag && e.tag.length > 0).length,
    withSpecs: eq.filter((e) => Object.keys((e.properties?.specs || {})).length > 0).length,
    withMeters: eq.filter((e) => equippedIds.has(e.tag)).length,
  }
}

const tabs = [
  { id: 'asset-tree', label: 'Árbol planta', icon: GitBranch },
  { id: 'utility-defs', label: 'Utilities', icon: BookOpen },
  { id: 'sources', label: 'Fuentes', icon: Power },
]

export default function ModeloPage() {
  const [activeTab, setActiveTab] = useState('asset-tree')
  const [cmmsStats, setCmmsStats] = useState<CmmsStats | null>(null)
  const { selectedSiteId, selectedUtilityType } = useUIStore()

  useEffect(() => {
    if (!selectedSiteId) { setCmmsStats(null); return }
    loadCmmsStats(selectedSiteId).then(setCmmsStats)
  }, [selectedSiteId])

  function renderTab() {
    if (!selectedSiteId && activeTab !== 'utility-defs') {
      return (
        <EmptyState
          title="Selecciona un sitio"
          description="Equipos usa el sitio global de la barra superior para filtrar el arbol, fuentes y utilities."
        />
      )
    }

    const filter = { siteId: selectedSiteId!, utilityType: selectedUtilityType }
    switch (activeTab) {
      case 'asset-tree':
        return <PlantAssetTreeView {...filter} />
      case 'utility-defs':
        return <UtilityDefinitionsView />
      case 'sources':
        return <SourcesView {...filter} />
      default:
        return null
    }
  }

  return (
    <div>
      <PageHeader
        title="Equipos y activos"
        description="Árbol de activos, ficha técnica, medidores y compatibilidad VersaMaint"
      />

      <OperationalContextSummary />
      {activeTab !== 'utility-defs' && <OperationalContextBanner />}

      {/* CMMS Readiness banner */}
      {cmmsStats && cmmsStats.total > 0 && (
        <CmmsReadinessBanner stats={cmmsStats} />
      )}

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              icon={<tab.icon size={16} />}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </TabButton>
          ))}
        </nav>
      </div>

      {/* Content */}
      {renderTab()}
    </div>
  )
}

function TabButton({
  active,
  icon,
  children,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
        active
          ? 'border-brand text-brand'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function CmmsReadinessBanner({ stats }: { stats: CmmsStats }) {
  const score = Math.round(
    ((stats.withCode + stats.withSpecs + stats.withMeters) / (stats.total * 3)) * 100,
  )
  const color =
    score >= 80 ? 'bg-[--color-ok-bg] border-[--color-ok-border]' :
    score >= 50 ? 'bg-[--color-warn-bg] border-[--color-warn-border]' :
                  'bg-[--color-info-bg] border-[--color-info-border]'
  const barColor =
    score >= 80 ? 'bg-[--color-ok]' :
    score >= 50 ? 'bg-[--color-warn]' : 'bg-brand'

  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-[--radius-lg] border px-4 py-3 mb-5 ${color}`}>
      <ShieldCheck size={16} className="shrink-0 text-gray-500" />
      <div className="flex-1 min-w-[160px]">
        <p className="text-xs font-bold text-gray-700">Preparación para VersaMaint</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
          </div>
          <span className="text-xs font-black text-gray-700 w-9 text-right">{score}%</span>
        </div>
      </div>
      <div className="flex gap-4 text-[11px] text-gray-500">
        <span><strong className="text-gray-700">{stats.withCode}</strong>/{stats.total} con código</span>
        <span><strong className="text-gray-700">{stats.withSpecs}</strong>/{stats.total} con specs</span>
        <span><strong className="text-gray-700">{stats.withMeters}</strong>/{stats.total} con medidores</span>
      </div>
    </div>
  )
}
