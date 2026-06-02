import { useState } from 'react'
import { PageHeader } from '@/shared/PageHeader'
import { EmptyState } from '@/shared/EmptyState'
import { useUIStore } from '@/store/uiStore'
import { SourcesView } from './views/SourcesView'
import { UtilityDefinitionsView } from './views/UtilityDefinitionsView'
import { PlantAssetTreeView } from './views/PlantAssetTreeView'
import { OperationalContextBanner, OperationalContextSummary } from '@/shared/OperationalContext'
import { GitBranch, Power, BookOpen } from 'lucide-react'
import type { ReactNode } from 'react'

const tabs = [
  { id: 'asset-tree', label: 'Árbol planta', icon: GitBranch },
  { id: 'utility-defs', label: 'Utilities', icon: BookOpen },
  { id: 'sources', label: 'Fuentes', icon: Power },
]

export default function ModeloPage() {
  const [activeTab, setActiveTab] = useState('asset-tree')
  const { selectedSiteId, selectedUtilityType } = useUIStore()

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
