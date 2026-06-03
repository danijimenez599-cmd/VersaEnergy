import { useState, useEffect, useMemo } from 'react'
import { EnergyUtilitiesCanvas } from './canvas/EnergyUtilitiesCanvas'
import { NodePalette } from './palette/NodePalette'
import { InspectorPanel } from './inspector/InspectorPanel'
import { ValidationPanel } from './inspector/ValidationPanel'
import { VersionHistoryPanel } from './inspector/VersionHistoryPanel'
import { MapLegend } from './canvas/MapLegend'
import { OverlayBar, type OverlayMode } from './canvas/OverlayBar'
import { useDiagramPersistence } from './canvas/hooks/useDiagramPersistence'
import { useDiagramStore } from './canvas/hooks/useDiagramStore'
import { validate } from '@/services/topology-engine/validators'
import { compileFromRows } from '@/services/topology-engine/compiler'
import { Button } from '@/shared/Button'
import { EmptyState } from '@/shared/EmptyState'
import { ConfirmDialog } from '@/shared/ConfirmDialog'
import { Toast } from '@/shared/Toast'
import type { ToastPayload } from '@/shared/Toast'
import { useUIStore } from '@/store/uiStore'
import { getUtilityLabel } from '@/shared/OperationalContext'
import { getTemplatesForUtility, instantiateTemplate } from './DiagramTemplates'
import type { DiagramTemplate } from './DiagramTemplates'
import { supabase } from '@/services/supabase'
import {
  ArrowRight, Save, Plus, Trash2, Network, ShieldCheck, Globe,
  CheckCircle, ChevronLeft, MoreHorizontal, Filter, History, Pencil,
} from 'lucide-react'
import type { ValidationIssue } from '@/services/topology-engine/graphTypes'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConfirmState {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  danger: boolean
  onConfirm: () => void
}

type NewDiagStep = 'utility' | 'template'

interface DiagramMeta {
  id: string
  name: string
  utility_type: string | null
  status: string
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  draft:     { label: 'Borrador', color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  published: { label: 'Publicado', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400' },
  archived:  { label: 'Archivado', color: 'text-gray-500 bg-gray-50 border-gray-200', dot: 'bg-gray-400' },
}

// ── Utility badge colors for diagram list ─────────────────────────────────────

const UTILITY_BADGE: Record<string, string> = {
  electricity:      'bg-blue-100 text-blue-700 border-blue-200',
  natural_gas:      'bg-orange-100 text-orange-700 border-orange-200',
  steam:            'bg-purple-100 text-purple-700 border-purple-200',
  compressed_air:   'bg-teal-100 text-teal-700 border-teal-200',
  chilled_water:    'bg-cyan-100 text-cyan-700 border-cyan-200',
  hot_water:        'bg-rose-100 text-rose-700 border-rose-200',
  industrial_water: 'bg-sky-100 text-sky-700 border-sky-200',
  diesel:           'bg-yellow-100 text-yellow-700 border-yellow-200',
  lpg:              'bg-amber-100 text-amber-700 border-amber-200',
  solar_generation: 'bg-lime-100 text-lime-700 border-lime-200',
  battery_storage:  'bg-indigo-100 text-indigo-700 border-indigo-200',
}

// ── Utility gradient colors for card preview zone ─────────────────────────────

const UTILITY_COLOR: Record<string, { from: string; to: string }> = {
  electricity:      { from: '#1B6FF8', to: '#1453c0' },
  natural_gas:      { from: '#ea580c', to: '#c44a09' },
  steam:            { from: '#7c3aed', to: '#6225cc' },
  compressed_air:   { from: '#0d9488', to: '#0a7a72' },
  chilled_water:    { from: '#0891b2', to: '#0670a0' },
  hot_water:        { from: '#e11d48', to: '#be1239' },
  industrial_water: { from: '#0ea5e9', to: '#0b88c3' },
  diesel:           { from: '#ca8a04', to: '#a37003' },
  lpg:              { from: '#d97706', to: '#b45309' },
  solar_generation: { from: '#65a30d', to: '#4d7a0a' },
  battery_storage:  { from: '#4f46e5', to: '#3730a3' },
}

// ── Diagram card with preview zone ───────────────────────────────────────────

function DiagramCard({
  name, utilityType, utilityLabel, utilityBadge, utilityColor, statusCfg, onOpen, onDelete,
}: {
  name: string
  utilityType: string | null
  utilityLabel: string | null
  utilityBadge: string
  utilityColor: { from: string; to: string }
  statusCfg: { label: string; color: string; dot: string }
  onOpen: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      onClick={onOpen}
    >
      {/* Preview zone */}
      <div
        className="relative h-32 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${utilityColor.from}, ${utilityColor.to})` }}
      >
        {/* Abstract network SVG */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 280 128"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {/* Background dot grid */}
          {[0, 1, 2, 3, 4, 5].map((row) =>
            [0, 1, 2, 3, 4, 5, 6, 7, 8].map((col) => (
              <circle key={`${row}-${col}`} cx={col * 32 + 8} cy={row * 22 + 8} r={1.2} fill="white" opacity={0.15} />
            ))
          )}
          {/* Network edges */}
          <line x1="55" y1="90" x2="110" y2="55" stroke="white" strokeWidth={1.5} opacity={0.45} />
          <line x1="110" y1="55" x2="175" y2="72" stroke="white" strokeWidth={1.5} opacity={0.45} />
          <line x1="175" y1="72" x2="220" y2="45" stroke="white" strokeWidth={1.5} opacity={0.45} />
          <line x1="110" y1="55" x2="145" y2="100" stroke="white" strokeWidth={1} opacity={0.3} />
          <line x1="175" y1="72" x2="155" y2="108" stroke="white" strokeWidth={1} opacity={0.3} />
          {/* Network nodes — outer glow */}
          <circle cx="55" cy="90" r="11" fill="white" opacity={0.15} />
          <circle cx="110" cy="55" r="14" fill="white" opacity={0.15} />
          <circle cx="175" cy="72" r="11" fill="white" opacity={0.15} />
          <circle cx="220" cy="45" r="10" fill="white" opacity={0.15} />
          <circle cx="145" cy="100" r="8" fill="white" opacity={0.15} />
          {/* Network nodes — inner */}
          <circle cx="55" cy="90" r="5.5" fill="white" opacity={0.7} />
          <circle cx="110" cy="55" r="7" fill="white" opacity={0.8} />
          <circle cx="175" cy="72" r="5.5" fill="white" opacity={0.7} />
          <circle cx="220" cy="45" r="5" fill="white" opacity={0.65} />
          <circle cx="145" cy="100" r="4" fill="white" opacity={0.6} />
          <circle cx="155" cy="108" r="3.5" fill="white" opacity={0.5} />
        </svg>

        {/* Status badge */}
        <div className="absolute right-3 top-3">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm ${statusCfg.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>
        </div>

        {/* Delete button — appears on hover */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="absolute left-3 top-3 grid h-7 w-7 cursor-pointer place-items-center rounded-lg bg-black/20 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-red-500 group-hover:opacity-100"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Card body */}
      <div className="p-4">
        <h3 className="mb-3 text-sm font-bold leading-snug text-slate-900 line-clamp-2">{name}</h3>

        <div className="flex flex-wrap items-center gap-1.5">
          {utilityType && utilityLabel && (
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${utilityBadge}`}>
              {utilityLabel}
            </span>
          )}
        </div>

        {/* "Abrir" hint — appears on hover */}
        <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-brand-blue opacity-0 transition-opacity group-hover:opacity-100">
          Abrir diagrama <ArrowRight size={11} />
        </div>
      </div>
    </div>
  )
}

// ── Page component ────────────────────────────────────────────────────────────

export default function MapaPage() {
  const [diagrams, setDiagrams] = useState<DiagramMeta[]>([])
  const [showNewDiag, setShowNewDiag] = useState(false)
  const [newDiagStep, setNewDiagStep] = useState<NewDiagStep>('utility')
  const [newDiagName, setNewDiagName] = useState('')
  const [newDiagUtility, setNewDiagUtility] = useState('electricity')
  const [selectedTemplate, setSelectedTemplate] = useState<DiagramTemplate | null>(null)
  const [showValidation, setShowValidation] = useState(false)
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([])
  const [publishing, setPublishing] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [activeOverlay, setActiveOverlay] = useState<OverlayMode>('none')
  const [toast, setToast] = useState<ToastPayload | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false, title: '', description: '', confirmLabel: 'Confirmar', danger: false, onConfirm: () => {},
  })

  function openConfirm(cfg: Omit<ConfirmState, 'open'>) {
    setConfirmState({ open: true, ...cfg })
  }
  function closeConfirm() {
    setConfirmState((s) => ({ ...s, open: false }))
  }

  async function handleSave() {
    await saveDiagram()
    setHistoryRefreshKey((k) => k + 1)
    setToast({ type: 'success', title: 'Guardado', message: 'Se registró una nueva versión en el historial.' })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleRestore(versionId: string, versionNumber: number) {
    openConfirm({
      title: `Restaurar versión v${versionNumber}`,
      description: 'Se cargará ese estado al lienzo. Podrás revisarlo y, al guardar, quedará registrado como una nueva versión.',
      confirmLabel: 'Restaurar',
      danger: false,
      onConfirm: async () => {
        closeConfirm()
        const ok = await restoreVersion(versionId)
        setToast(ok
          ? { type: 'success', title: `Versión v${versionNumber} restaurada`, message: 'Revisa y guarda para confirmar.' }
          : { type: 'error', title: 'No se pudo restaurar la versión' })
        setTimeout(() => setToast(null), 3500)
      },
    })
  }

  const { selectedSiteId, selectedUtilityType } = useUIStore()
  const { diagramId, diagramName, isDirty, diagramStatus, nodes, edges } = useDiagramStore()
  const { loadDiagrams, loadDiagram, createDiagram, saveDiagram, deleteDiagram, publishDiagram, restoreVersion } = useDiagramPersistence()

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
    setToast({ type: ok ? 'success' : 'error', title: msg })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSelectDiagram(diag: DiagramMeta) {
    await loadDiagram(diag.id)
    setValidationIssues([])
    setShowValidation(false)
  }

  async function handleCreateDiagram() {
    if (!selectedSiteId || !newDiagName) return
    const diag = await createDiagram(selectedSiteId, newDiagName, newDiagUtility)
    if (diag) {
      setDiagrams((prev) => [...prev, { id: diag.id, name: diag.name, utility_type: diag.utility_type, status: 'draft' }])
      // Apply template if selected
      if (selectedTemplate && selectedTemplate.id !== 'blank') {
        const { nodes: tNodes, edges: tEdges } = instantiateTemplate(selectedTemplate)
        useDiagramStore.getState().setNodes(tNodes as never)
        useDiagramStore.getState().setEdges(tEdges as never)
      }
    }
    setShowNewDiag(false)
    setNewDiagName('')
    setNewDiagStep('utility')
    setSelectedTemplate(null)
  }

  function handleDeleteDiagram(diagId: string) {
    openConfirm({
      title: 'Eliminar diagrama',
      description: 'Se eliminarán el diagrama y todos sus nodos. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
      onConfirm: async () => {
        closeConfirm()
        await deleteDiagram(diagId)
        setDiagrams((prev) => prev.filter((d) => d.id !== diagId))
      },
    })
  }

  // ── Validate ──────────────────────────────────────────────────────────────

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

  // ── Publish ───────────────────────────────────────────────────────────────

  async function handlePublish() {
    const issues = runValidation()
    const errors = issues.filter((i) => i.severity === 'error')
    if (errors.length > 0) {
      setValidationIssues(issues)
      setShowValidation(true)
      showToast(`No se puede publicar: ${errors.length} error(es) crítico(s).`, false)
      return
    }
    setShowActionsMenu(false)
    openConfirm({
      title: 'Publicar diagrama',
      description: 'El diagrama quedará congelado. Para editarlo de nuevo deberás presionar el botón "Editar" para volverlo a estado borrador. El estado actual quedará guardado en el historial de versiones.',
      confirmLabel: 'Publicar',
      danger: false,
      onConfirm: async () => { closeConfirm(); await doPublish() },
    })
  }

  async function doPublish() {
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

  async function handleUnlockForEdit() {
    if (!diagramId) return
    setShowActionsMenu(false)
    openConfirm({
      title: 'Editar diagrama publicado',
      description: 'El diagrama volverá a estado borrador (draft). Podrás realizar modificaciones, guardar y volver a publicar. La versión anterior se conservará en el historial.',
      confirmLabel: 'Editar',
      danger: false,
      onConfirm: async () => {
        closeConfirm()
        const { error } = await supabase
          .from('energy_diagrams')
          .update({ status: 'draft', updated_at: new Date().toISOString() })
          .eq('id', diagramId)

        if (error) {
          showToast('Error al habilitar la edición: ' + error.message, false)
        } else {
          useDiagramStore.getState().setStatus('draft')
          setDiagrams((prev) => prev.map((d) => d.id === diagramId ? { ...d, status: 'draft' } : d))
          showToast('Edición habilitada. Ahora puedes modificar y guardar este diagrama.', true)
        }
      }
    })
  }



  // ── Derived ───────────────────────────────────────────────────────────────

  const presentUtilities = useMemo(() => {
    const set = new Set<string>()
    nodes.forEach((n) => { if (n.data.utility) set.add(n.data.utility as string) })
    edges.forEach((e) => { if (e.data?.utility) set.add(e.data.utility) })
    return Array.from(set)
  }, [nodes, edges])

  const errorCount = validationIssues.filter((i) => i.severity === 'error').length
  const warnCount = validationIssues.filter((i) => i.severity === 'warning').length

  const visibleDiagrams = selectedUtilityType
    ? diagrams.filter((d) => d.utility_type === selectedUtilityType || !d.utility_type)
    : diagrams

  // ── Diagram list view ─────────────────────────────────────────────────────

  if (!diagramId) {
    const filteredDiagrams = (selectedUtilityType
      ? visibleDiagrams.filter((d) => d.utility_type === selectedUtilityType || !d.utility_type)
      : visibleDiagrams
    ).filter((d) => filterStatus === 'all' || d.status === filterStatus)

    return (
      <div className="flex h-full flex-col space-y-4 overflow-y-auto p-5">

        {/* ── Compact header ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Red energética</p>
            <h1 className="text-lg font-black text-slate-950">Mapas de utilities</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Status filter pills */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
              {(['all', 'draft', 'published', 'archived'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={[
                    'rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer',
                    filterStatus === s ? 'bg-brand-blue text-white' : 'text-slate-400 hover:text-slate-700',
                  ].join(' ')}
                >
                  {s === 'all' ? 'Todos' : STATUS_CONFIG[s]?.label || s}
                </button>
              ))}
            </div>
            {selectedUtilityType && (
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                <Filter size={11} /> {getUtilityLabel(selectedUtilityType)}
              </span>
            )}
            <Button
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => { setShowNewDiag(true); setNewDiagStep('utility') }}
              disabled={!selectedSiteId}
            >
              Nuevo diagrama
            </Button>
          </div>
        </div>

        {/* ── Diagram grid ── */}
        {filteredDiagrams.length === 0 ? (
          <EmptyState
            icon={<Network size={48} strokeWidth={1.5} />}
            title="Sin diagramas"
            description={
              selectedUtilityType
                ? 'No hay diagramas para el utility seleccionado.'
                : selectedSiteId
                  ? 'Crea tu primer diagrama de red de utilities para este sitio.'
                  : 'Selecciona una planta en el panel superior para ver sus diagramas.'
            }
            action={selectedSiteId
              ? <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowNewDiag(true)}>Nuevo diagrama</Button>
              : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredDiagrams.map((d) => {
              const stCfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.draft
              const utilityBadge = d.utility_type
                ? (UTILITY_BADGE[d.utility_type] || 'bg-slate-100 text-slate-600 border-slate-200')
                : ''
              const utilityColor = UTILITY_COLOR[d.utility_type || ''] || { from: '#64748b', to: '#475569' }
              return (
                <DiagramCard
                  key={d.id}
                  name={d.name}
                  utilityType={d.utility_type}
                  utilityLabel={d.utility_type ? getUtilityLabel(d.utility_type) : null}
                  utilityBadge={utilityBadge}
                  utilityColor={utilityColor}
                  statusCfg={stCfg}
                  onOpen={() => handleSelectDiagram(d)}
                  onDelete={() => handleDeleteDiagram(d.id)}
                />
              )
            })}
          </div>
        )}

        {/* ── New diagram modal — 2 steps ── */}
        {showNewDiag && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              {newDiagStep === 'utility' && (
                <div className="p-6">
                  <div className="mb-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paso 1 de 2</p>
                    <h3 className="text-base font-black text-slate-950">Nuevo diagrama</h3>
                  </div>
                  <div className="space-y-4">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-bold text-slate-500">Nombre del diagrama</span>
                      <input
                        value={newDiagName}
                        onChange={(e) => setNewDiagName(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                        placeholder="Ej. Red eléctrica principal, Vapor proceso A"
                        autoFocus
                      />
                    </label>
                    <div>
                      <span className="mb-2 block text-[11px] font-bold text-slate-500">Utility principal</span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          ['electricity', 'Electricidad', '#1B6FF8'],
                          ['natural_gas', 'Gas natural', '#ea580c'],
                          ['steam', 'Vapor', '#7c3aed'],
                          ['compressed_air', 'Aire comp.', '#0d9488'],
                          ['chilled_water', 'Agua helada', '#06b6d4'],
                          ['hot_water', 'Agua caliente', '#dc2626'],
                          ['industrial_water', 'Agua industrial', '#0891b2'],
                          ['diesel', 'Diésel', '#ca8a04'],
                          ['lpg', 'GLP', '#b45309'],
                        ].map(([v, l, color]) => (
                          <button
                            key={v}
                            onClick={() => setNewDiagUtility(v)}
                            className={[
                              'flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all cursor-pointer',
                              newDiagUtility === v
                                ? 'border-brand-blue bg-brand-blue/8 text-brand-blue'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300',
                            ].join(' ')}
                          >
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                      <Button variant="secondary" size="sm" onClick={() => setShowNewDiag(false)}>Cancelar</Button>
                      <Button size="sm" disabled={!newDiagName} onClick={() => setNewDiagStep('template')}>
                        Siguiente →
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {newDiagStep === 'template' && (
                <div className="p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <button
                      onClick={() => setNewDiagStep('utility')}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      ← Atrás
                    </button>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paso 2 de 2</p>
                      <h3 className="text-base font-black text-slate-950">Selecciona una plantilla</h3>
                    </div>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {getTemplatesForUtility(newDiagUtility).map((tmpl) => (
                      <button
                        key={tmpl.id}
                        onClick={() => setSelectedTemplate(selectedTemplate?.id === tmpl.id ? null : tmpl)}
                        className={[
                          'flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all cursor-pointer',
                          selectedTemplate?.id === tmpl.id
                            ? 'border-brand-blue bg-brand-blue/5'
                            : 'border-slate-200 bg-white hover:border-slate-300',
                        ].join(' ')}
                      >
                        <span className="mt-0.5 shrink-0 text-xl">{tmpl.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900">{tmpl.name}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{tmpl.description}</p>
                          <p className="mt-1 text-[10px] text-slate-400">{tmpl.nodeCount} nodo{tmpl.nodeCount !== 1 ? 's' : ''} de partida</p>
                        </div>
                        {selectedTemplate?.id === tmpl.id && (
                          <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-blue" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <Button variant="secondary" size="sm" onClick={() => setShowNewDiag(false)}>Cancelar</Button>
                    <Button size="sm" onClick={handleCreateDiagram}>
                      {selectedTemplate ? 'Crear con plantilla' : 'Crear en blanco'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        <ConfirmDialog
          open={confirmState.open} title={confirmState.title} description={confirmState.description}
          confirmLabel={confirmState.confirmLabel} danger={confirmState.danger}
          onConfirm={confirmState.onConfirm} onCancel={closeConfirm}
        />
      </div>
    )
  }

  // ── Canvas view ───────────────────────────────────────────────────────────

  const stCfg = STATUS_CONFIG[diagramStatus] || STATUS_CONFIG.draft
  const isDraft = diagramStatus === 'draft'
  const isPublished = diagramStatus === 'published'

  return (
    <div className="h-full flex flex-col bg-[#F4F7FB]">

      {/* ── Toolbar ── */}
      <div className="flex items-center px-4 py-2.5 border-b border-gray-200 bg-white shrink-0 gap-4 shadow-[0_1px_0_0_#e5e7eb]">

        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => useDiagramStore.getState().resetDiagram()}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#1B6FF8] cursor-pointer transition-colors shrink-0"
          >
            <ChevronLeft size={16} />
            Diagramas
          </button>
          <span className="text-gray-200">/</span>
          <span className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{diagramName}</span>

          {/* Status + unsaved */}
          <span className={`hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${stCfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dot}`} />
            {stCfg.label}
          </span>
          {isDirty && (
            <span className="hidden sm:inline text-[10px] text-amber-600 shrink-0">• Sin guardar</span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Validate */}
          <button
            onClick={handleValidate}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
              validationIssues.length === 0
                ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                : errorCount > 0
                  ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100'
                  : 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <ShieldCheck size={13} />
            Validar
            {validationIssues.length > 0 && (
              <span className={`text-[10px] font-bold ${errorCount > 0 ? 'text-red-700' : 'text-amber-700'}`}>
                {errorCount > 0 ? `${errorCount}E` : `${warnCount}W`}
              </span>
            )}
          </button>

          {/* History */}
          <button
            onClick={() => { setShowHistory((v) => !v); setShowValidation(false) }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
              showHistory ? 'border-brand/30 bg-brand/5 text-brand' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            title="Historial de versiones"
          >
            <History size={13} />
            Historial
          </button>

          {/* Three-dot dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium cursor-pointer transition-colors"
            >
              <MoreHorizontal size={14} />
            </button>
            {showActionsMenu && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  {isDraft && (
                    <button
                      onClick={handlePublish}
                      disabled={publishing}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Globe size={14} />
                      {publishing ? 'Publicando…' : 'Publicar'}
                    </button>
                  )}
                  {isPublished && (
                    <button
                      onClick={handleUnlockForEdit}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-purple-700 hover:bg-purple-50 cursor-pointer transition-colors"
                    >
                      <Pencil size={14} />
                      Editar diagrama
                    </button>
                  )}
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors opacity-50 cursor-not-allowed"
                    disabled
                    title="Próximamente"
                  >
                    <Network size={14} />
                    Exportar JSON
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Save (draft only) */}
          {isDraft && (
            <Button size="sm" leftIcon={<Save size={13} />} onClick={handleSave} disabled={!isDirty}>
              Guardar
            </Button>
          )}

          {/* Frozen badge & Editar button (published) */}
          {isPublished && (
            <>
              <div className="flex items-center gap-1 text-xs text-emerald-600 border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                <CheckCircle size={12} />
                <span>Congelado</span>
              </div>
              <Button size="sm" leftIcon={<Pencil size={13} />} onClick={handleUnlockForEdit}>
                Editar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Published banner */}
      {isPublished && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border-b border-emerald-100 text-xs text-emerald-700 shrink-0">
          <CheckCircle size={12} />
          Diagrama publicado y congelado. Para realizar cambios, presiona el botón <strong className="mx-0.5">Editar</strong> en la barra superior.
        </div>
      )}

      {/* Canvas area */}
      <div className="flex-1 flex min-h-0 relative">
        {isDraft && <NodePalette />}
        <div className="flex-1 relative">
          <EnergyUtilitiesCanvas />
          <MapLegend presentUtilities={presentUtilities} showCoverage={false} onToggleCoverage={() => {}} />
          <OverlayBar activeOverlay={activeOverlay} onOverlayChange={setActiveOverlay} />
        </div>

        {/* Validation panel as overlay */}
        {showValidation && (
          <ValidationPanel issues={validationIssues} onClose={() => setShowValidation(false)} />
        )}

        {/* Version history panel */}
        {showHistory && diagramId && (
          <VersionHistoryPanel
            diagramId={diagramId}
            refreshKey={historyRefreshKey}
            onClose={() => setShowHistory(false)}
            onRestore={handleRestore}
          />
        )}

        {/* Permanent 320px inspector — always visible */}
        <InspectorPanel
          onValidate={handleValidate}
          validationIssueCount={validationIssues.length}
          errorCount={errorCount}
          warnCount={warnCount}
          onConfirmDelete={(cfg) => openConfirm({
            title: cfg.title,
            description: cfg.description,
            confirmLabel: 'Eliminar',
            danger: true,
            onConfirm: cfg.onConfirm,
          })}
        />
      </div>

      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        danger={confirmState.danger}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  )
}
