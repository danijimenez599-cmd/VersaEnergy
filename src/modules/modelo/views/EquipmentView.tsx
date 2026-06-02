import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/shared/Card'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import { supabase } from '@/services/supabase'
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react'

interface Equipment {
  id: string
  tag: string
  name: string
  equipment_type: string
  utility_type: string
  area_id: string | null
  status: string
  properties: Record<string, unknown>
}

interface Props { siteId: string; utilityType: string | null }

export function EquipmentView({ siteId, utilityType }: Props) {
  const [items, setItems] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Equipment | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ tag: '', name: '', equipment_type: 'consumer', utility_type: utilityType || 'electricity', area_id: '', status: 'active' })

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('energy_equipment').select('*').eq('site_id', siteId).order('tag')
    if (utilityType) q = q.eq('utility_type', utilityType)
    const { data, error: err } = await q
    if (err) setError(err.message)
    else setItems(data || [])
    setLoading(false)
  }, [siteId, utilityType])

  useEffect(() => { load() }, [load])

  function openCreate() { setForm({ tag: '', name: '', equipment_type: 'consumer', utility_type: utilityType || 'electricity', area_id: '', status: 'active' }); setEditing(null); setShowForm(true) }
  function openEdit(eq: Equipment) { setForm({ tag: eq.tag, name: eq.name, equipment_type: eq.equipment_type, utility_type: eq.utility_type, area_id: eq.area_id || '', status: eq.status }); setEditing(eq); setShowForm(true) }

  async function handleSave() {
    setSaving(true)
    const payload = { tag: form.tag, name: form.name, equipment_type: form.equipment_type, utility_type: form.utility_type, area_id: form.area_id || null, status: form.status, updated_at: new Date().toISOString() }
    if (editing) {
      await supabase.from('energy_equipment').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('energy_equipment').insert({ ...payload, site_id: siteId })
    }
    setSaving(false); setShowForm(false); load()
  }

  async function handleDelete(id: string) { await supabase.from('energy_equipment').delete().eq('id', id); load() }

  const statusColors: Record<string, 'green' | 'gray' | 'orange' | 'red'> = { active: 'green', inactive: 'gray', planned: 'orange', retired: 'red' }
  const statusLabels: Record<string, string> = { active: 'Activo', inactive: 'Inactivo', planned: 'Planificado', retired: 'Retirado' }

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando equipos...</div>
  if (error) return <div className="py-12 text-center text-sm text-red-500">{error}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{items.length} equipos</p>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Nuevo equipo</Button>
      </div>
      {items.length === 0 ? (
        <Card><EmptyState title="Sin equipos" description="Crea tu primer equipo en este sitio." /></Card>
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tag</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Utility</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-24">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((eq) => (
                <tr key={eq.id} className="border-b border-border/50 hover:bg-gray-50/30">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-brand-blue">{eq.tag}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{eq.name}</td>
                  <td className="px-4 py-3 text-gray-500">{eq.equipment_type}</td>
                  <td className="px-4 py-3 text-gray-500">{eq.utility_type}</td>
                  <td className="px-4 py-3"><Badge color={statusColors[eq.status] || 'gray'} size="sm">{statusLabels[eq.status] || eq.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(eq)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(eq.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar equipo' : 'Nuevo equipo'} size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tag *</label>
            <input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20" placeholder="Ej: T-01" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" placeholder="Ej: Transformador Principal" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select value={form.equipment_type} onChange={(e) => setForm({ ...form, equipment_type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-surface cursor-pointer">
                <option value="boiler">Caldera</option><option value="pump">Bomba</option>
                <option value="compressor">Compresor</option><option value="chiller">Chiller</option>
                <option value="cooling_tower">Torre enfriamiento</option><option value="tank">Tanque</option>
                <option value="transformer">Transformador</option><option value="panel">Tablero</option>
                <option value="generator">Generador</option><option value="heat_exchanger">Intercambiador</option>
                <option value="motor">Motor</option><option value="consumer">Consumidor</option>
                <option value="custom_equipment">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Utility</label>
              <select value={form.utility_type} onChange={(e) => setForm({ ...form, utility_type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-surface cursor-pointer">
                <option value="electricity">Electricidad</option><option value="natural_gas">Gas natural</option>
                <option value="steam">Vapor</option><option value="compressed_air">Aire comprimido</option>
                <option value="chilled_water">Agua helada</option><option value="hot_water">Agua caliente</option>
                <option value="industrial_water">Agua industrial</option><option value="diesel">Diésel</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-surface cursor-pointer">
              <option value="active">Activo</option><option value="inactive">Inactivo</option>
              <option value="planned">Planificado</option><option value="retired">Retirado</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)} rightIcon={<X size={14} />}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} loading={saving} rightIcon={<Save size={14} />}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
