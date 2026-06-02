import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { Card } from '@/shared/Card'
import { Button } from '@/shared/Button'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import { SgenStatusBadge } from '../components/SgenStatusBadge'
import { Plus, Save, Pencil, Crosshair } from 'lucide-react'

interface Scope {
  id: string; name: string; description: string; boundaries: string;
  included_utilities: string[]; excluded_utilities: string[];
  exclusions_rationale: string; version: number; status: string;
}

interface Props { siteId: string }

export function ScopeView({ siteId }: Props) {
  const [scopes, setScopes] = useState<Scope[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Scope | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', boundaries: '',
    included_utilities: 'electricity, steam, compressed_air',
    excluded_utilities: '', exclusions_rationale: '',
  })

  useEffect(() => {
    supabase.from('sgen_scopes').select('*').eq('site_id', siteId).order('version', { ascending: false })
      .then(({ data }) => { setScopes(data || []); setLoading(false) })
  }, [siteId])

  function openCreate() {
    setForm({ name: '', description: '', boundaries: '', included_utilities: 'electricity, steam, compressed_air', excluded_utilities: '', exclusions_rationale: '' })
    setEditing(null); setShowForm(true)
  }

  function openEdit(scope: Scope) {
    setForm({
      name: scope.name, description: scope.description || '', boundaries: scope.boundaries || '',
      included_utilities: (scope.included_utilities || []).join(', '),
      excluded_utilities: (scope.excluded_utilities || []).join(', '),
      exclusions_rationale: scope.exclusions_rationale || '',
    })
    setEditing(scope); setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      site_id: siteId, name: form.name,
      description: form.description, boundaries: form.boundaries,
      included_utilities: form.included_utilities.split(',').map((s) => s.trim()).filter(Boolean),
      excluded_utilities: form.excluded_utilities.split(',').map((s) => s.trim()).filter(Boolean),
      exclusions_rationale: form.exclusions_rationale,
      updated_at: new Date().toISOString(),
    }
    if (editing) {
      await supabase.from('sgen_scopes').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('sgen_scopes').insert({ ...payload, version: 1 })
    }
    setSaving(false); setShowForm(false)
    const { data } = await supabase.from('sgen_scopes').select('*').eq('site_id', siteId).order('version', { ascending: false })
    setScopes(data || [])
  }

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{scopes.length} versiones</p>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Nuevo alcance</Button>
      </div>

      {scopes.length === 0 ? (
        <EmptyState icon={<Crosshair size={40} />} title="Sin alcance definido"
          description="Define el alcance energetico del SGEn para este sitio." />
      ) : (
        <div className="space-y-3">
          {scopes.map((scope) => (
            <Card key={scope.id} padding="md">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-800">{scope.name || 'Alcance v' + scope.version}</h3>
                    <SgenStatusBadge status={scope.status} />
                    <span className="text-xs text-gray-400">v{scope.version}</span>
                  </div>
                  {scope.description && <p className="text-xs text-gray-500 mt-1">{scope.description}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-600">
                      <span className="text-gray-400">Incluye: </span>
                      {(scope.included_utilities || []).join(', ') || '—'}
                    </span>
                    {scope.excluded_utilities?.length > 0 && (
                      <span className="text-xs text-gray-500">
                        <span className="text-gray-400">Excluye: </span>
                        {scope.excluded_utilities.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => openEdit(scope)}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer shrink-0">
                  <Pencil size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar alcance' : 'Nuevo alcance'} size="md">
        <div className="space-y-3">
          <div><label className="block text-xs text-gray-500 mb-1">Nombre</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Alcance SGEn Planta A" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Límites físicos / organizacionales</label>
            <textarea value={form.boundaries} onChange={(e) => setForm({ ...form, boundaries: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" rows={2}
              placeholder="Ej: Planta A, incluyendo utilities centrales y areas de produccion. Excluye edificio administrativo." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">Utilities incluidas (separadas por coma)</label>
              <input value={form.included_utilities} onChange={(e) => setForm({ ...form, included_utilities: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Utilities excluidas</label>
              <input value={form.excluded_utilities} onChange={(e) => setForm({ ...form, excluded_utilities: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div><label className="block text-xs text-gray-500 mb-1">Justificación de exclusiones</label>
            <textarea value={form.exclusions_rationale} onChange={(e) => setForm({ ...form, exclusions_rationale: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} loading={saving} rightIcon={<Save size={14} />}>
              {editing ? 'Guardar' : 'Crear alcance'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
