import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { PageHeader } from '@/shared/PageHeader'
import { Button } from '@/shared/Button'
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
  const [siteId, setSiteId] = useState<string | null>(null)
  const [sites, setSites] = useState<{ id: string; name: string }[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<EnergyImprovement | null>(null)
  const [workspaceItem, setWorkspaceItem] = useState<EnergyImprovement | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    supabase.from('sites').select('id, name').order('name').then(({ data }) => {
      setSites(data || [])
      if (data && data.length > 0) setSiteId(data[0].id)
    })
  }, [])

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
      <PageHeader title="Acciones y Proyectos de Mejora"
        description="Gestiona oportunidades de ahorro energético y proyectos de mejora"
        actions={
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditingItem(null); setShowForm(true) }}>
            Nueva oportunidad
          </Button>
        } />

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-600">Sitio:</label>
        <select value={siteId || ''} onChange={(e) => setSiteId(e.target.value)}
          className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface cursor-pointer">
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
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

      {activeTab === 'inbox' && <ImprovementInbox siteId={siteId!} key={refreshKey + '-inbox'} onSelect={handleSelect} />}
      {activeTab === 'kanban' && <QuickActionKanban siteId={siteId!} key={refreshKey + '-kanban'} onSelect={(item) => { setEditingItem(item); setShowForm(true) }} />}
      {activeTab === 'portfolio' && <ImprovementPortfolio siteId={siteId!} key={refreshKey + '-portfolio'} onSelect={handleSelect} />}

      {showForm && (
        <ImprovementForm siteId={siteId!} item={editingItem} onClose={() => setShowForm(false)} onSave={onSave} />
      )}
    </div>
  )
}
