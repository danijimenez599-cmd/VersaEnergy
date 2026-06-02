import { useState, useEffect, useMemo } from 'react'
import { EnergyUtilitiesCanvas } from './canvas/EnergyUtilitiesCanvas'
import { NodePalette } from './palette/NodePalette'
import { InspectorPanel } from './inspector/InspectorPanel'
import { ValidationPanel } from './inspector/ValidationPanel'
import { MapLegend } from './canvas/MapLegend'
import { useDiagramPersistence } from './canvas/hooks/useDiagramPersistence'
import { useDiagramStore } from './canvas/hooks/useDiagramStore'
import { validate } from '@/services/topology-engine/validators'
import { compileFromRows } from '@/services/topology-engine/compiler'
import { Button } from '@/shared/Button'
import { EmptyState } from '@/shared/EmptyState'
import { useUIStore } from '@/store/uiStore'
import {
  OperationalContextBanner,
  OperationalContextSummary,
  getUtilityLabel,
} from '@/shared/OperationalContext'
import {
  Save, Plus, Trash2, Network, ShieldCheck, Globe,
  Copy, AlertTriangle, CheckCircle, ChevronDown,
} from 'lucide-react'
import type { ValidationIssue } from '@/services/topology-engine/graphTypes'

interface DiagramMeta {
  id: string
  name: string
  utility_type: string | null
  status: string
}

// ─── Status display ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  draft:     { label: 'Borrador', color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  published: { label: 'Publicado', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  archived:  { label: 'Archivado', color: 'text-gray-500 bg-gray-50 border-gray-200', dot: 'bg-gray-400' },
}

export default function MapaPage() {
  const [diagrams, setDiagrams] = useState<DiagramMeta[]>([])
  const [showNewDiag, setShowNewDiag] = useState(false)
  const [newDiagName, setNewDiagName] = useState('')
  const [newDiagUtility, setNewDiagUtility] = useState('electricity')
  const [showValidation, setShowValidation] = useState(false)
  const [showCoverage, setShowCoverage] = useState(false)
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([])
  const [publishing, setPublishing] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const { selectedSiteId, selectedUtilityType } = useUIStore()
  const { diagramId, diagramName, isDirty, diagramStatus, nodes, edges } = useDiagramStore()
  const { loadDiagrams, loadDiagram, createDiagram, saveDiagram, deleteDiagram, publishDiagram, cloneDiagram } = useDiagramPersistence()

  useEffect(() => {
    async function load() {
      if (!selectedSiteId) { setDiagrams([]); useDiagramStore.getState().resetDiagram(); return }
      const diags = await loadDiagrams(selectedSiteId)
      setDiagrams(diags)
    }
    load()
  }, [loadDiagrams, selectedSiteId])

  useEffect(() => {
    setNewDiagUtility(selectedUtilityType || 'electricity')
  }, [selectedUtilityType])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSelectDiagram(diag: DiagramMeta) {
    await loadDiagram(diag.id)
    setValidationIssues([])
    setShowValidation(false)
  }

  async function handleCreateDiagram() {
    if (!selectedSiteId || !newDiagName) return
    const diag = await createDiagram(selectedSiteId, newDiagName, newDiagUtility)
    if (diag) setDiagrams((prev) => [...prev, { id: diag.id, name: diag.name, utility_type: diag.utility_type, status: 'draft' }])
    setShowNewDiag(false)
    setNewDiagName('')
  }

  async function handleDeleteDiagram(diagId: string) {
    if (!confirm('¿Eliminar este diagrama y todos sus nodos?')) return
    await deleteDiagram(diagId)
    setDiagrams((prev) => prev.filter((d) => d.id !== diagId))
  }

  // ── Validate ─────────────────────────────────────────────────────────────────
  function runValidation(): ValidationIssue[] {
    try {
      const nodeRows = nodes.map((n) => ({
        id: n.id, node_type: String(n.data.nodeType), tag: n.data.tag,
        label: n.data.label, utility: (n.data.utility as string) || null,
        position_x: n.position.x, position_y: n.position.y,
        properties: n.data.properties || {},
      }))
      const edgeRows = edges.map((e) => ({
        id: e.id, source_node_id: e.source, target_node_id: e.target,
        edge_type: String(e.data?.edgeType || 'pipe'),
        utility: e.data?.utility || null,
        flow_direction: String(e.data?.flowDirection || 'source_to_target'),
        label: e.data?.label, loss_factor: e.data?.lossFactor,
        leak_factor: e.data?.leakFactor, properties: e.data?.properties || {},
      }))
      const graph = compileFromRows(diagramId || '', '', nodeRows, edgeRows, [])
      return validate({ nodes: graph.nodes, edges: graph.edges, measurementPoints: [], utilityGraph: graph })
    } catch {
      return []
    }
  }

  function handleValidate() {
    const issues = runValidation()
    setValidationIssues(issues)
    setShowValidation(true)
  }

  // ── Publish ───────────────────────────────────────────────────────────────────
  async function handlePublish() {
    // Validate first
    const issues = runValidation()
    const errors = issues.filter((i) => i.severity === 'error')
    if (errors.length > 0) {
      setValidationIssues(issues)
      setShowValidation(true)
      showToast(`No se puede publicar: ${errors.length} error(es) crítico(s).`, false)
      return
    }

    if (!confirm('¿Publicar este diagrama? Quedará congelado. Para editarlo deberás clonarlo.')) return

    setPublishing(true)
    const result = await publishDiagram()
    setPublishing(false)

    if (result.success) {
      setDiagrams((prev) => prev.map((d) => d.id === diagramId ? { ...d, status: 'published' } : d))
      showToast(result.message, true)
    } else {
      showToast(result.message, false)
    }
  }

  // ── Clone ─────────────────────────────────────────────────────────────────────
  async function handleClone() {
    if (!diagramId || !selectedSiteId) return
    if (!confirm('¿Clonar este diagrama como nuevo borrador?')) return

    setCloning(true)
    const result = await cloneDiagram(diagramId, selectedSiteId)
    setCloning(false)

    if (result.success && result.newId) {
      showToast('Diagrama clonado como nuevo borrador.', true)
      const diags = await loadDiagrams(selectedSiteId)
      setDiagrams(diags)
      await loadDiagram(result.newId)
    } else {
      showToast('Error al clonar el diagrama.', false)
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────────
  const presentUtilities = useMemo(() => {
    const set = new Set<string>()
    nodes.forEach((n) => { if (n.data.utility) set.add(n.data.utility as string) })
    edges.forEach((e) => { if (e.data?.utility) set.add(e.data.utility) })
    return Array.from(set)
  }, [nodes, edges])

  const errorCount = validationIssues.filter((i) => i.severity === 'error').length
  const warnCount = validationIssues.filter((i) => i.severity === 'warning').length

  const visibleDiagrams = selectedUtilityType
    ? diagrams.filter((diagram) => diagram.utility_type === selectedUtilityType || !diagram.utility_type)
    : diagrams

  // ── Diagram list view ─────────────────────────────────────────────────────────
  if (!diagramId) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Mapa Energy & Utilities</h1>
          <p className="text-sm text-gray-500 mt-1">Canvas para diagramas de redes de utilities</p>
        </div>

        <OperationalContextSummary />
        <OperationalContextBanner />

        <div className="flex items-center gap-3 mb-4">
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowNewDiag(true)} disabled={!selectedSiteId}>
            Nuevo diagrama
          </Button>
          {selectedUtilityType && (
            <span className="text-xs text-gray-400">
              Mostrando diagramas de {getUtilityLabel(selectedUtilityType)}
            </span>
          )}
        </div>

        {visibleDiagrams.length === 0 ? (
          <EmptyState
            icon={<Network size={48} strokeWidth={1.5} />}
            title="Sin diagramas"
            description={selectedUtilityType ? 'No hay diagramas para el utility seleccionado.' : 'Crea tu primer diagrama de utilities para este sitio.'}
            action={selectedSiteId && <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowNewDiag(true)}>Nuevo diagrama</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleDiagrams.map((d) => {
              const stCfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.draft
              return (
                <div
                  key={d.id}
                  className="bg-surface border border-border rounded-(--radius-card) shadow-card p-4 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => handleSelectDiagram(d)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Network size={18} className="text-brand-blue" />
                      <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteDiagram(d.id) }}
                      className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {d.utility_type && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-brand-blue border border-blue-200">
                        {d.utility_type}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${stCfg.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dot}`} />
                      {stCfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* New diagram modal */}
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
                    placeholder="Ej: Diagrama eléctrico principal"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Utility principal</label>
                  <select
                    value={newDiagUtility}
                    onChange={(e) => setNewDiagUtility(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-surface cursor-pointer"
                  >
                    {[
                      ['electricity','Electricidad'],['natural_gas','Gas natural'],['steam','Vapor'],
                      ['compressed_air','Aire comprimido'],['chilled_water','Agua helada'],
                      ['hot_water','Agua caliente'],['industrial_water','Agua industrial'],
                      ['diesel','Diésel'],['lpg','GLP'],['solar_generation','Solar'],
                    ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowNewDiag(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleCreateDiagram} disabled={!newDiagName}>Crear</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Canvas view ───────────────────────────────────────────────────────────────
  const stCfg = STATUS_CONFIG[diagramStatus] || STATUS_CONFIG.draft
  const isDraft = diagramStatus === 'draft'
  const isPublished = diagramStatus === 'published'

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface shrink-0 gap-3">
        {/* Left: Back + name + status */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => useDiagramStore.getState().resetDiagram()}
            className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer flex items-center gap-1 shrink-0"
          >
            ← Diagramas
          </button>
          <span className="text-xs text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700 truncate max-w-[160px]">{diagramName}</span>
          {isDirty && <span className="text-[10px] text-amber-600 shrink-0">• Sin guardar</span>}
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${stCfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dot}`} />
            {stCfg.label}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Validation button */}
          <button
            onClick={handleValidate}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <ShieldCheck size={13} />
            Validar
            {validationIssues.length > 0 && (
              <span className={`text-[10px] px-1 rounded font-bold ${errorCount > 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {errorCount > 0 ? `${errorCount} err` : `${warnCount} warn`}
              </span>
            )}
            {showValidation ? null : validationIssues.length === 0 && (
              <span className="text-[10px] text-gray-400">
                <ChevronDown size={10} className="inline" />
              </span>
            )}
          </button>

          {/* Publish — only for drafts */}
          {isDraft && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 hover:bg-emerald-100 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Globe size={13} />
              {publishing ? 'Publicando…' : 'Publicar'}
            </button>
          )}

          {/* Clone — only for published */}
          {isPublished && (
            <button
              onClick={handleClone}
              disabled={cloning}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-xs font-medium text-purple-700 hover:bg-purple-100 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Copy size={13} />
              {cloning ? 'Clonando…' : 'Clonar'}
            </button>
          )}

          {/* Save — only for drafts */}
          {isDraft && (
            <Button size="sm" leftIcon={<Save size={13} />} onClick={saveDiagram} disabled={!isDirty}>
              Guardar
            </Button>
          )}

          {isPublished && (
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle size={13} />
              <span>Congelado</span>
            </div>
          )}
        </div>
      </div>

      {/* Published banner */}
      {isPublished && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border-b border-emerald-100 text-xs text-emerald-700">
          <CheckCircle size={12} />
          Este diagrama está publicado y congelado. Para editarlo, usa <strong>Clonar</strong> para crear un nuevo borrador.
        </div>
      )}

      {/* Canvas area */}
      <div className="flex-1 flex min-h-0 relative">
        {isDraft && <NodePalette />}
        <div className="flex-1 relative">
          <EnergyUtilitiesCanvas />
          <MapLegend
            presentUtilities={presentUtilities}
            showCoverage={showCoverage}
            onToggleCoverage={setShowCoverage}
          />
        </div>
        {showValidation ? (
          <ValidationPanel issues={validationIssues} onClose={() => setShowValidation(false)} />
        ) : (
          <InspectorPanel />
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-sm font-medium transition-all ${
          toast.ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.ok ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
