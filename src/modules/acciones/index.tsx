import { useState } from 'react'
import { Button } from '@/shared/Button'
import { EmptyState } from '@/shared/EmptyState'
import { useUIStore } from '@/store/uiStore'
import { Inbox, Columns, FolderKanban, Plus } from 'lucide-react'
import { ImprovementInbox } from './views/ImprovementInbox'
import { QuickActionKanban } from './views/QuickActionKanban'
import { ImprovementPortfolio } from './views/ImprovementPortfolio'
import { ImprovementForm } from './views/ImprovementForm'
import { ImprovementProjectWorkspace } from './views/ImprovementProjectWorkspace'
import type { EnergyImprovement } from './types'

const tabs = [
  { id: 'inbox', label: 'Oportunidades', icon: Inbox },
  { id: 'kanban', label: 'Acciones rápidas', icon: Columns },
  { id: 'portfolio', label: 'Proyectos', icon: FolderKanban },
]

export default function AccionesPage() {
  const [activeTab, setActiveTab] = useState('inbox')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<EnergyImprovement | null>(null)
  const [workspaceItem, setWorkspaceItem] = useState<EnergyImprovement | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { selectedSiteId } = useUIStore()

  function handleSelect(item: EnergyImprovement) {
    if (item.work_type === 'project') {
      setWorkspaceItem(item)
    } else {
      setEditingItem(item)
      setShowForm(true)
    }
  }

  function onSave() {
    setShowForm(false)
    setEditingItem(null)
    setRefreshKey((k) => k + 1)
  }

  if (workspaceItem) {
    return <ImprovementProjectWorkspace item={workspaceItem} onBack={() => setWorkspaceItem(null)} />
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-bold text-[--color-tx-2]">Acciones y proyectos de mejora</h2>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditingItem(null); setShowForm(true) }} disabled={!selectedSiteId}>
          Nueva oportunidad
        </Button>
      </div>

      <div className="border-b border-border mb-4">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ' +
                (activeTab === t.id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </nav>
      </div>

      {!selectedSiteId && (
        <EmptyState
          title="Selecciona un sitio"
          description="Las oportunidades, acciones rapidas y proyectos se gestionan contra el sitio global."
        />
      )}

      {selectedSiteId && activeTab === 'inbox' && <ImprovementInbox siteId={selectedSiteId} key={refreshKey + '-inbox'} onSelect={handleSelect} />}
      {selectedSiteId && activeTab === 'kanban' && <QuickActionKanban siteId={selectedSiteId} key={refreshKey + '-kanban'} onSelect={(item) => { setEditingItem(item); setShowForm(true) }} />}
      {selectedSiteId && activeTab === 'portfolio' && <ImprovementPortfolio siteId={selectedSiteId} key={refreshKey + '-portfolio'} onSelect={handleSelect} />}

      {showForm && selectedSiteId && (
        <ImprovementForm siteId={selectedSiteId} item={editingItem} onClose={() => setShowForm(false)} onSave={onSave} />
      )}
    </div>
  )
}
