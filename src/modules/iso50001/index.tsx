import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { PageHeader } from '@/shared/PageHeader'
import { Card } from '@/shared/Card'
import { Button } from '@/shared/Button'
import { EmptyState } from '@/shared/EmptyState'
import { OperationalContextBanner, OperationalContextSummary } from '@/shared/OperationalContext'
import { SgenStatusBadge } from './components/SgenStatusBadge'
import { LegalSettingsView } from './views/LegalSettingsView'
import { ScopeView } from './views/ScopeView'
import { LEGAL_NOTICE, ACCEPTED_LANGUAGE } from '@/services/sgen-engine'
import { useUIStore } from '@/store/uiStore'
import {
  Shield, Crosshair, Zap, Target, FolderKanban, FileSearch, Scale, Camera
} from 'lucide-react'

const tabs = [
  { id: 'dashboard', label: 'Centro SGEn', icon: Shield },
  { id: 'scope', label: 'Alcance', icon: Crosshair },
  { id: 'legal', label: 'Legal', icon: Scale },
]

export default function Iso50001Page() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [coverage, setCoverage] = useState({ scope: 0, seus: 0, objectives: 0, actions: 0, evidence: 0 })
  const [loading, setLoading] = useState(true)
  const { selectedSiteId } = useUIStore()

  useEffect(() => {
    if (!selectedSiteId) {
      setLoading(false)
      setCoverage({ scope: 0, seus: 0, objectives: 0, actions: 0, evidence: 0 })
      return
    }

    async function load() {
      const [{ count: scopeCount }, { count: seusCount }, { count: objCount }, { count: impCount }, { count: evdCount }] = await Promise.all([
        supabase.from('sgen_scopes').select('*', { count: 'exact', head: true }).eq('site_id', selectedSiteId).eq('status', 'approved'),
        supabase.from('sgen_significant_uses').select('*', { count: 'exact', head: true }).eq('site_id', selectedSiteId),
        supabase.from('sgen_objectives').select('*', { count: 'exact', head: true }).eq('site_id', selectedSiteId),
        supabase.from('energy_improvements').select('*', { count: 'exact', head: true }).eq('site_id', selectedSiteId).neq('status', 'cancelled'),
        supabase.from('sgen_evidence').select('*', { count: 'exact', head: true }).eq('site_id', selectedSiteId),
      ])
      setCoverage({
        scope: scopeCount || 0, seus: seusCount || 0,
        objectives: objCount || 0, actions: impCount || 0, evidence: evdCount || 0,
      })
      setLoading(false)
    }
    load()
  }, [selectedSiteId])

  return (
    <div>
      <PageHeader title="SGEn" description={ACCEPTED_LANGUAGE.certification + ' — ' + ACCEPTED_LANGUAGE.compliance} />

      <OperationalContextSummary />
      <OperationalContextBanner />

      <div className="border-b border-border mb-4">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ' +
                (activeTab === t.id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </nav>
      </div>

      {!selectedSiteId && activeTab !== 'legal' && (
        <EmptyState
          icon={<Shield size={48} strokeWidth={1.5} />}
          title="Selecciona un sitio"
          description="El workspace SGEn necesita un sitio para mantener alcance, usos significativos, objetivos y evidencia trazables."
        />
      )}

      {selectedSiteId && loading ? <div className="py-12 text-center text-sm text-gray-400">Cargando...</div> : selectedSiteId && activeTab === 'dashboard' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex-1">
              {LEGAL_NOTICE.body.slice(0, 200)}...
            </div>
            <Button size="sm" variant="secondary" leftIcon={<Camera size={14} />}>
              Recolectar Evidencia (Snapshot)
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Alcance', value: coverage.scope, icon: Crosshair, color: 'blue' },
              { label: 'Usos significativos', value: coverage.seus, icon: Zap, color: 'purple' },
              { label: 'Objetivos', value: coverage.objectives, icon: Target, color: 'teal' },
              { label: 'Acciones / Proyectos', value: coverage.actions, icon: FolderKanban, color: 'orange' },
              { label: 'Evidencias', value: coverage.evidence, icon: FileSearch, color: 'cyan' },
            ].map((m) => (
              <Card key={m.label} padding="md" className="text-center">
                <m.icon size={20} className={'mx-auto mb-1 text-brand-' + m.color} />
                <p className="text-2xl font-semibold text-gray-800">{m.value}</p>
                <p className="text-xs text-gray-500">{m.label}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card padding="md">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Dominios del SGEn</h3>
              <div className="space-y-2">
                {[
                  { label: 'Alcance y politica', done: coverage.scope > 0 },
                  { label: 'Revision energetica', done: false },
                  { label: 'Usos significativos (SEUs)', done: coverage.seus > 0 },
                  { label: 'Objetivos y EnPI', done: coverage.objectives > 0 },
                  { label: 'Acciones y proyectos', done: coverage.actions > 0 },
                  { label: 'Evidencia documental', done: coverage.evidence > 0 },
                  { label: 'Auditorias internas', done: false },
                  { label: 'Revision gerencial', done: false },
                ].map((d) => (
                  <div key={d.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{d.label}</span>
                    <SgenStatusBadge status={d.done ? 'completed' : 'draft'} />
                  </div>
                ))}
              </div>
            </Card>

            <Card padding="md">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Proximos pasos</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>1. Define el alcance energetico del SGEn</p>
                <p>2. Realiza la revision energetica inicial</p>
                <p>3. Identifica usos significativos de energia</p>
                <p>4. Establece objetivos y EnPI</p>
                <p>5. Vincula acciones y proyectos</p>
                <p className="text-xs text-amber-600 mt-3">
                  Este checklist es original de VersaEnergy. No reproduce la estructura ni contenido de ninguna norma.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'scope' && selectedSiteId && <ScopeView siteId={selectedSiteId} />}
      {activeTab === 'legal' && <LegalSettingsView />}
    </div>
  )
}
