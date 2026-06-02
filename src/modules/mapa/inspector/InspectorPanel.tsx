import { X, Tag, Zap, ArrowRight, Gauge } from 'lucide-react'
import { useDiagramStore } from '../canvas/hooks/useDiagramStore'
import type { Node, Edge } from '@xyflow/react'
import type { DiagramNodeData, DiagramEdgeData } from '@/services/topology-engine/graphTypes'

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
  return (
    <div className="p-3 space-y-3">
      <Section title="Identificación" icon={<Tag size={12} />}>
        <Field label="Tag" value={d.tag} onChange={(v) => onUpdate(node.id, { tag: v })} />
        <Field label="Label" value={d.label} onChange={(v) => onUpdate(node.id, { label: v })} />
      </Section>
      <Section title="Utility" icon={<Zap size={12} />}>
        <SelectField label="Utility" value={(d.utility as string) || ''}
          onChange={(v) => onUpdate(node.id, { utility: v || undefined })}
          options={['','electricity','natural_gas','steam','compressed_air','chilled_water','hot_water','industrial_water','diesel','lpg']} />
      </Section>
      <Section title="Propiedades" icon={<ArrowRight size={12} />}>
        <p className="text-xs text-gray-400">Tipo: {String(d.nodeType)}</p>
      </Section>
      <div className="pt-2 border-t border-border">
        <button onClick={onRemove} className="w-full text-xs text-red-500 hover:bg-red-50 py-1.5 rounded cursor-pointer transition-colors">
          Eliminar nodo
        </button>
      </div>
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
          options={['','electricity','natural_gas','steam','compressed_air','chilled_water','hot_water','industrial_water','diesel','lpg']} />
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
