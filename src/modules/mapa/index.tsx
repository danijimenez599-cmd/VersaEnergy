import { useState, useEffect } from 'react'
import { EnergyUtilitiesCanvas } from './canvas/EnergyUtilitiesCanvas'
import { NodePalette } from './palette/NodePalette'
import { InspectorPanel } from './inspector/InspectorPanel'
import { useDiagramPersistence } from './canvas/hooks/useDiagramPersistence'
import { useDiagramStore } from './canvas/hooks/useDiagramStore'
import { Button } from '@/shared/Button'
import { EmptyState } from '@/shared/EmptyState'
import { supabase } from '@/services/supabase'
import { Save, Plus, Trash2, Network, FileText } from 'lucide-react'

interface DiagramMeta { id: string; name: string; utility_type: string | null }

export default function MapaPage() {
  const [siteId, setSiteId] = useState<string | null>(null)
  const [sites, setSites] = useState<{ id: string; name: string }[]>([])
  const [diagrams, setDiagrams] = useState<DiagramMeta[]>([])
  const [showNewDiag, setShowNewDiag] = useState(false)
  const [newDiagName, setNewDiagName] = useState('')
  const [newDiagUtility, setNewDiagUtility] = useState('electricity')

  const { diagramId, diagramName, isDirty } = useDiagramStore()
  const { loadDiagrams, loadDiagram, createDiagram, saveDiagram, deleteDiagram } = useDiagramPersistence()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sites').select('id, name').order('name')
      setSites(data || [])
      if (data && data.length > 0) {
        const firstId = data[0].id
        setSiteId(firstId)
        const diags = await loadDiagrams(firstId)
        setDiagrams(diags)
      }
    }
    load()
  }, [loadDiagrams])

  async function handleSelectSite(siteId: string) {
    setSiteId(siteId)
    const diags = await loadDiagrams(siteId)
    setDiagrams(diags)
  }

  async function handleSelectDiagram(diag: DiagramMeta) {
    await loadDiagram(diag.id)
  }

  async function handleCreateDiagram() {
    if (!siteId || !newDiagName) return
    const diag = await createDiagram(siteId, newDiagName, newDiagUtility)
    if (diag) {
      setDiagrams((prev) => [...prev, { id: diag.id, name: diag.name, utility_type: diag.utility_type }])
    }
    setShowNewDiag(false)
    setNewDiagName('')
  }

  async function handleDeleteDiagram(diagId: string) {
    await deleteDiagram(diagId)
    setDiagrams((prev) => prev.filter((d) => d.id !== diagId))
  }

  if (!diagramId) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Mapa Energy & Utilities</h1>
          <p className="text-sm text-gray-500 mt-1">Canvas para diagramas de redes de utilities</p>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-gray-600">Sitio:</label>
          <select
            value={siteId || ''}
            onChange={(e) => handleSelectSite(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface cursor-pointer"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowNewDiag(true)}>
            Nuevo diagrama
          </Button>
        </div>

        {diagrams.length === 0 ? (
          <EmptyState
            icon={<Network size={48} strokeWidth={1.5} />}
            title="Sin diagramas"
            description="Crea tu primer diagrama de utilities para este sitio."
            action={<Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowNewDiag(true)}>Nuevo diagrama</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {diagrams.map((d) => (
              <div
                key={d.id}
                className="bg-surface border border-border rounded-(--radius-card) shadow-card p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleSelectDiagram(d)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Network size={18} className="text-brand-blue" />
                  <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                </div>
                <div className="flex items-center justify-between">
                  {d.utility_type && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-brand-blue border border-blue-200">
                      {d.utility_type}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteDiagram(d.id) }}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer ml-auto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New diagram modal (inline) */}
        {showNewDiag && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-(--radius-modal) shadow-modal p-6 w-full max-w-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Nuevo diagrama</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                  <input
                    value={newDiagName}
                    onChange={(e) => setNewDiagName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                    placeholder="Ej: Diagrama eléctrico"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Utility principal</label>
                  <select
                    value={newDiagUtility}
                    onChange={(e) => setNewDiagUtility(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-surface cursor-pointer"
                  >
                    <option value="electricity">Electricidad</option>
                    <option value="natural_gas">Gas natural</option>
                    <option value="steam">Vapor</option>
                    <option value="compressed_air">Aire comprimido</option>
                    <option value="chilled_water">Agua helada</option>
                    <option value="hot_water">Agua caliente</option>
                    <option value="industrial_water">Agua industrial</option>
                    <option value="diesel">Diésel</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowNewDiag(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleCreateDiagram}>Crear</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => useDiagramStore.getState().resetDiagram()}
            className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer flex items-center gap-1"
          >
            ← Diagramas
          </button>
          <span className="text-xs text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{diagramName}</span>
          {isDirty && <span className="text-[10px] text-amber-600">• Sin guardar</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" leftIcon={<FileText size={14} />}>
            Leyenda
          </Button>
          <Button size="sm" leftIcon={<Save size={14} />} onClick={saveDiagram} disabled={!isDirty}>
            Guardar
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex min-h-0">
        <NodePalette />
        <EnergyUtilitiesCanvas />
        <InspectorPanel />
      </div>
    </div>
  )
}
