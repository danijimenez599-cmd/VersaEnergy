import { useState } from 'react'
import { PageHeader } from '@/shared/PageHeader'
import { SitesView } from './views/SitesView'
import { RatesView } from './views/RatesView'
import { UsersView } from './views/UsersView'
import { SettingsView } from './views/SettingsView'

type AdminTab = 'sites' | 'rates' | 'users' | 'settings'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('sites')

  const TABS: { id: AdminTab; label: string }[] = [
    { id: 'sites', label: 'Sitios y Organización' },
    { id: 'rates', label: 'Tarifas y Energía' },
    { id: 'users', label: 'Usuarios y Roles' },
    { id: 'settings', label: 'Parámetros del Sistema' }
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-border shrink-0">
        <PageHeader
          title="Administración"
          description="Configuración global de la plataforma VersaEnergy"
        />

        {/* Tabs */}
        <div className="px-8 mt-2">
          <nav className="flex gap-6">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'sites' && <SitesView />}
        {activeTab === 'rates' && <RatesView />}
        {activeTab === 'users' && <UsersView />}
        {activeTab === 'settings' && <SettingsView />}
      </div>
    </div>
  )
}
