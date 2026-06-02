import { useState, useEffect } from 'react'
import { X, Tag, Zap, ArrowRight, Gauge, Plus, ExternalLink } from 'lucide-react'
import { useDiagramStore } from '../canvas/hooks/useDiagramStore'
import { supabase } from '@/services/supabase'
import { useUIStore } from '@/store/uiStore'
import type { Node, Edge } from '@xyflow/react'
import type { DiagramNodeData, DiagramEdgeData } from '@/services/topology-engine/graphTypes'

interface LinkedMP {
  id: string
  tag: string
  name: string
  utility: string
  measurement_type: string
  unit: string
  meter_equipment_id: string | null
  last_calibration_date: string | null
  calibration_due_date: string | null
}

export function InspectorPanel() {
  const selectedElement = useDiagramStore((s) => s.selectedElement)
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const selectElement = useDiagramStore((s) => s.selectElement)
  const updateNode = useDiagramStore((s) => s.updateNode)
  const removeNode = useDiagramStore((s) => s.removeNode)
  const updateEdge = useDiagramStore((s) => s.updateEdge)
  const removeEdge = useDiagramStore((s) => s.removeEdge)

  if (!selectedElement) return null

  if (selectedElement.type === 'node') {
    const node = nodes.find((n) => n.id === selectedElement.id)
    if (!node) return null
    return (
      <div className="w-64 bg-surface border-l border-border h-full overflow-y-auto shrink-0">
        <Header onClose={() => selectElement(null)} />
        <NodeInspector node={node} onUpdate={updateNode} onRemove={() => removeNode(selectedElement.id)} />
      </div>
    )
  }

  const edge = edges.find((e) => e.id === selectedElement.id)
  if (!edge) return null
  return (
    <div className="w-64 bg-surface border-l border-border h-full overflow-y-auto shrink-0">
      <Header onClose={() => selectElement(null)} />
      <EdgeInspector edge={edge} onUpdate={updateEdge} onRemove={() => removeEdge(selectedElement.id)} />
    </div>
  )
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 border-b border-border sticky top-0 bg-surface z-10">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Inspector</p>
      <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer">
        <X size={14} />
      </button>
    </div>
  )
}

function NodeInspector({ node, onUpdate, onRemove }: {
  node: Node<DiagramNodeData>
  onUpdate: (id: string, data: Partial<DiagramNodeData>) => void
  onRemove: () => void
}) {
  const d = node.data
  const { selectedSiteId } = useUIStore()
  const [linkedMPs, setLinkedMPs] = useState<LinkedMP[]>([])
  const [availableMPs, setAvailableMPs] = useState<LinkedMP[]>([])
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [loadingMPs, setLoadingMPs] = useState(false)

  // Load MPs linked to this specific node
  useEffect(() => {
    async function load() {
      setLoadingMPs(true)
      const { data } = await supabase
        .from('measurement_points')
        .select('id, tag, name, utility, measurement_type, unit, meter_equipment_id, last_calibration_date, calibration_due_date')
        .eq('target_type', 'node')
        .eq('target_id', node.id)
      setLinkedMPs(data || [])
      setLoadingMPs(false)
    }
    load()
  }, [node.id])

  // Load available MPs (system/area type, same utility, not already linked to another node)
  async function openLinkModal() {
    if (!selectedSiteId) return
    const { data } = await supabase
      .from('measurement_points')
      .select('id, tag, name, utility, measurement_type, unit, meter_equipment_id, last_calibration_date, calibration_due_date')
      .eq('site_id', selectedSiteId)
      .neq('target_type', 'node') // show MPs not yet linked to a canvas node
    setAvailableMPs(data || [])
    setShowLinkModal(true)
  }

  async function handleLink(mpId: string) {
    // Update the MP to point to this node
    await supabase.from('measurement_points').update({
      target_type: 'node',
      target_id: node.id,
      updated_at: new Date().toISOString(),
    }).eq('id', mpId)
    // Refresh
    const { data } = await supabase
      .from('measurement_points')
      .select('id, tag, name, utility, measurement_type, unit, meter_equipment_id, last_calibration_date, calibration_due_date')
      .eq('target_type', 'node')
      .eq('target_id', node.id)
    setLinkedMPs(data || [])
    setShowLinkModal(false)
  }

  async function handleUnlink(mpId: string) {
    const current = linkedMPs.find((mp) => mp.id === mpId)
    if (!current?.meter_equipment_id) return
    await supabase.from('measurement_points').update({
      target_type: 'equipment',
      target_id: current.meter_equipment_id,
      updated_at: new Date().toISOString(),
    }).eq('id', mpId)
    setLinkedMPs((prev) => prev.filter((m) => m.id !== mpId))
  }

  return (
    <div className="p-3 space-y-3">
      <Section title="Identificación" icon={<Tag size={12} />}>
        <Field label="Tag" value={d.tag} onChange={(v) => onUpdate(node.id, { tag: v })} />
        <Field label="Label" value={d.label} onChange={(v) => onUpdate(node.id, { label: v })} />
      </Section>

      <Section title="Utility" icon={<Zap size={12} />}>
        <SelectField label="Utility" value={(d.utility as string) || ''}
          onChange={(v) => onUpdate(node.id, { utility: v || undefined })}
          options={['','electricity','natural_gas','steam','compressed_air','chilled_water','hot_water','industrial_water','diesel','lpg','solar_generation','battery_storage']} />
      </Section>

      <Section title="Propiedades" icon={<ArrowRight size={12} />}>
        <p className="text-xs text-gray-400">Tipo: {String(d.nodeType)}</p>
      </Section>

      {/* Medidores vinculados */}
      <Section title="Medidores vinculados" icon={<Gauge size={12} />}>
        {loadingMPs ? (
          <p className="text-[11px] text-gray-400">Cargando...</p>
        ) : linkedMPs.length === 0 ? (
          <div className="py-2 text-center">
            <p className="text-[11px] text-gray-400 mb-1.5">Sin medidores en este nodo</p>
            <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100">
              Sin cobertura
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {linkedMPs.map((mp) => (
              <div key={mp.id} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1">
                <Gauge size={10} className="text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono font-semibold text-emerald-700 truncate">{mp.tag}</p>
                  <p className="text-[10px] text-gray-400 truncate">{mp.unit} · {mp.measurement_type}</p>
                  {mp.calibration_due_date && (
                    <p className="text-[10px] text-emerald-700 truncate">Calibra: {mp.calibration_due_date}</p>
                  )}
                </div>
                <button
                  onClick={() => handleUnlink(mp.id)}
                  className="text-[10px] text-gray-400 hover:text-red-500 cursor-pointer shrink-0"
                  title="Desvincular"
                >×</button>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={openLinkModal}
          className="mt-1.5 flex items-center gap-1 text-[11px] text-brand-blue hover:underline cursor-pointer"
        >
          <Plus size={10} /> Vincular medidor
        </button>
      </Section>

      <div className="pt-2 border-t border-border">
        <button onClick={onRemove} className="w-full text-xs text-red-500 hover:bg-red-50 py-1.5 rounded cursor-pointer transition-colors">
          Eliminar nodo
        </button>
      </div>

      {/* Link modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowLinkModal(false)}>
          <div className="bg-surface border border-border rounded-xl shadow-xl p-4 w-80 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">Vincular medidor a este nodo</p>
              <button onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={14} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-3">Selecciona un MeasurementPoint existente para vincularlo a <span className="font-mono font-semibold text-brand-blue">{d.tag}</span>.</p>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {availableMPs.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No hay puntos disponibles para vincular.</p>
              ) : (
                availableMPs.map((mp) => (
                  <button
                    key={mp.id}
                    onClick={() => handleLink(mp.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-border hover:border-brand-blue hover:bg-brand-blue/5 text-left cursor-pointer transition-colors"
                  >
                    <Gauge size={14} className="text-brand-blue shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-semibold text-brand-blue">{mp.tag}</p>
                      <p className="text-xs text-gray-400 truncate">{mp.name} · {mp.utility} · {mp.unit}</p>
                    </div>
                    <ExternalLink size={12} className="text-gray-300 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EdgeInspector({ edge, onUpdate, onRemove }: {
  edge: Edge<DiagramEdgeData>
  onUpdate: (id: string, data: Partial<DiagramEdgeData>) => void
  onRemove: () => void
}) {
  const d = edge.data || {} as DiagramEdgeData
  return (
    <div className="p-3 space-y-3">
      <Section title="Conexión" icon={<Gauge size={12} />}>
        <SelectField label="Tipo de línea" value={String(d.edgeType || 'pipe')}
          onChange={(v) => onUpdate(edge.id, { edgeType: v as DiagramEdgeData['edgeType'] })}
          options={['pipe','cable','duct','busbar','signal','logical']} />
        <SelectField label="Utility" value={String(d.utility || '')}
          onChange={(v) => onUpdate(edge.id, { utility: v })}
          options={['','electricity','natural_gas','steam','compressed_air','chilled_water','hot_water','industrial_water','diesel','lpg','solar_generation','battery_storage']} />
        <SelectField label="Dirección" value={String(d.flowDirection || 'source_to_target')}
          onChange={(v) => onUpdate(edge.id, { flowDirection: v as DiagramEdgeData['flowDirection'] })}
          options={['source_to_target','target_to_source','bidirectional','unknown']} />
      </Section>
      <Section title="Etiquetas" icon={<Tag size={12} />}>
        <Field label="Tag" value={String(d.tag || '')} onChange={(v) => onUpdate(edge.id, { tag: v || undefined })} />
        <Field label="Label" value={String(d.label || '')} onChange={(v) => onUpdate(edge.id, { label: v || undefined })} />
      </Section>
      <Section title="Parámetros" icon={<ArrowRight size={12} />}>
        <Field label="Factor pérdida" value={d.lossFactor != null ? String(d.lossFactor) : ''}
          onChange={(v) => onUpdate(edge.id, { lossFactor: v ? Number(v) : undefined })} type="number" />
        <Field label="Factor fuga" value={d.leakFactor != null ? String(d.leakFactor) : ''}
          onChange={(v) => onUpdate(edge.id, { leakFactor: v ? Number(v) : undefined })} type="number" />
      </Section>
      <div className="pt-2 border-t border-border">
        <button onClick={onRemove} className="w-full text-xs text-red-500 hover:bg-red-50 py-1.5 rounded cursor-pointer transition-colors">
          Eliminar conexión
        </button>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{icon}{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 block mb-0.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue/30 bg-white" />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 block mb-0.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue/30 bg-white cursor-pointer">
        {options.map((opt) => <option key={opt} value={opt}>{opt === '' ? 'Seleccionar...' : opt}</option>)}
      </select>
    </div>
  )
}
