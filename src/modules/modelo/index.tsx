import { useState, useEffect } from 'react'
import { PageHeader } from '@/shared/PageHeader'
import { EmptyState } from '@/shared/EmptyState'
import { supabase } from '@/services/supabase'
import { useUIStore } from '@/store/uiStore'
import { AreasView } from './views/AreasView'
import { UtilitySystemsView } from './views/UtilitySystemsView'
import { EquipmentView } from './views/EquipmentView'
import { SourcesView } from './views/SourcesView'
import { MeasurementPointsView } from './views/MeasurementPointsView'
import { UtilityDefinitionsView } from './views/UtilityDefinitionsView'
import { MapPin, Network, Wrench, Power, Gauge, BookOpen } from 'lucide-react'
import type { ReactNode } from 'react'

const tabs = [
  { id: 'utility-defs', label: 'Utilities', icon: BookOpen },
  { id: 'areas', label: 'Áreas', icon: MapPin },
  { id: 'systems', label: 'Sistemas', icon: Network },
  { id: 'equipment', label: 'Equipos', icon: Wrench },
  { id: 'sources', label: 'Fuentes', icon: Power },
  { id: 'measurement', label: 'Medición', icon: Gauge },
]

export default function ModeloPage() {
  const [activeTab, setActiveTab] = useState('utility-defs')
  const [siteId, setSiteId] = useState<string | null>(null)
  const [sites, setSites] = useState<{ id: string; name: string }[]>([])
  const [sitesLoading, setSitesLoading] = useState(true)
  const { selectedUtilityType } = useUIStore()

  useEffect(() => {
    async function loadSites() {
      const { data } = await supabase.from('sites').select('id, name').order('name')
      setSites(data || [])
      if (data && data.length > 0) setSiteId(data[0].id)
      setSitesLoading(false)
    }
    loadSites()
  }, [])

  function renderTab() {
    if (!siteId && activeTab !== 'utility-defs') {
      return (
        <EmptyState
          title="Selecciona un sitio"
          description="Crea o selecciona un sitio para gestionar sus catálogos."
        />
      )
    }

    const filter = { siteId: siteId!, utilityType: selectedUtilityType }
    switch (activeTab) {
      case 'utility-defs':
        return <UtilityDefinitionsView />
      case 'areas':
        return <AreasView {...filter} />
      case 'systems':
        return <UtilitySystemsView {...filter} />
      case 'equipment':
        return <EquipmentView {...filter} />
      case 'sources':
        return <SourcesView {...filter} />
      case 'measurement':
        return <MeasurementPointsView {...filter} />
      default:
        return null
    }
  }

  return (
    <div>
      <PageHeader
        title="Modelo Energy & Utilities"
        description="Catálogos de áreas, sistemas de utility, equipos, fuentes y puntos de medición"
      />

      {/* Site selector */}
      {activeTab !== 'utility-defs' && (
        <div className="mb-4 flex items-center gap-3">
          <label className="text-xs font-medium text-gray-500">Sitio:</label>
          <select
            value={siteId || ''}
            onChange={(e) => setSiteId(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 cursor-pointer"
            disabled={sitesLoading}
          >
            {sites.length === 0 && !sitesLoading && (
              <option value="">Sin sitios</option>
            )}
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {sites.length === 0 && !sitesLoading && (
            <span className="text-xs text-amber-600">
              Crea un sitio en Administración primero.
            </span>
          )}
        </div>
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
          ? 'border-brand-blue text-brand-blue'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
