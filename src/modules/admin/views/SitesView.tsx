import { useEffect, useState } from 'react'
import { Card } from '@/shared/Card'
import { Building2, Plus, CheckCircle2, AlertCircle, Loader2, X, Save, Edit3 } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/app/AuthProvider'
import { Modal } from '@/shared/Modal'
import { FormField } from '@/shared/FormField'
import { Button } from '@/shared/Button'

interface Site {
  id: string
  name: string
  code: string | null
  address: string | null
  timezone: string
  is_active: boolean
}

export function SitesView() {
  const { profile } = useAuth()
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  
  // Form states
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [address, setAddress] = useState('')
  const [timezone, setTimezone] = useState('America/Mexico_City')
  const [isActive, setIsActive] = useState(true)
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadSites() {
    setLoading(true)
    try {
      const { data } = await supabase.from('sites').select('id, name, code, address, timezone, is_active').order('name')
      if (data) {
        setSites(data)
      }
    } catch (err) {
      console.error('Error loading sites:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSites()
  }, [])

  function openCreateModal() {
    setEditingSite(null)
    setName('')
    setCode('')
    setAddress('')
    setTimezone('America/Mexico_City')
    setIsActive(true)
    setError(null)
    setModalOpen(true)
  }

  function openEditModal(site: Site) {
    setEditingSite(site)
    setName(site.name)
    setCode(site.code || '')
    setAddress(site.address || '')
    setTimezone(site.timezone || 'America/Mexico_City')
    setIsActive(site.is_active)
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('El nombre del sitio es obligatorio.')
      return
    }
    if (!code.trim()) {
      setError('El código del sitio es obligatorio.')
      return
    }
    if (!profile?.company_id) {
      setError('No se pudo determinar la compañía del usuario actual.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (editingSite) {
        // Edit existing site
        const { error: err } = await supabase
          .from('sites')
          .update({
            name,
            code,
            address: address || null,
            timezone,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingSite.id)

        if (err) throw err
      } else {
        // Create new site
        const { error: err } = await supabase
          .from('sites')
          .insert({
            company_id: profile.company_id,
            name,
            code,
            address: address || null,
            timezone,
            is_active: isActive,
          })

        if (err) throw err
      }

      setModalOpen(false)
      await loadSites()
    } catch (err: any) {
      console.error('Error saving site:', err)
      setError(err.message || 'Error al guardar el sitio.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Sitios y Organización</h2>
          <p className="text-sm text-gray-500">Configura los sitios físicos y su vinculación con el CMMS.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-brand-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus size={16} />
          <span>Nuevo Sitio</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sites.map(site => (
            <Card key={site.id} className="p-5 hover:border-slate-300 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm tracking-tight">{site.name}</h3>
                    <p className="text-xs text-slate-500">{site.address || 'Sin dirección registrada'}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-mono font-bold rounded-md border border-slate-200">
                  {site.code || 'S/C'}
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {site.is_active ? (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-teal-600" />
                    <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">Listo para operar</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle size={16} className="text-amber-500" />
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-wide">Inactivo / Config. Pendiente</span>
                  </div>
                )}
                <button
                  onClick={() => openEditModal(site)}
                  className="flex items-center gap-1 text-xs font-bold text-brand-blue hover:text-blue-700 cursor-pointer"
                >
                  <Edit3 size={12} />
                  <span>Editar</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Site Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-white shadow-md shadow-slate-900/10">
              <Building2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900">
                {editingSite ? 'Editar Sitio' : 'Nuevo Sitio'}
              </h3>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {editingSite ? 'Actualiza los parámetros del sitio' : 'Registra un nuevo sitio en la compañía'}
              </p>
            </div>
          </div>
        }
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} rightIcon={<X size={13} />} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving} rightIcon={<Save size={13} />}>
              {editingSite ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <FormField label="Nombre del Sitio" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
              placeholder="Ej. Planta de Demostración"
              autoFocus
            />
          </FormField>

          <FormField label="Código Único (Tag)" required>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
              placeholder="Ej. PLT001"
            />
          </FormField>

          <FormField label="Dirección / Ubicación">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
              placeholder="Ej. Av. Energia 123, Ciudad Industrial"
            />
          </FormField>

          <FormField label="Zona Horaria">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="select-custom w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
            >
              <option value="UTC">UTC (Tiempo Universal Coordinado)</option>
              <option value="America/Mexico_City">America/Mexico_City (Ciudad de México)</option>
              <option value="America/Monterrey">America/Monterrey (Monterrey)</option>
              <option value="America/Bogota">America/Bogota (Bogotá)</option>
              <option value="America/Santiago">America/Santiago (Santiago)</option>
              <option value="America/Lima">America/Lima (Lima)</option>
              <option value="America/New_York">America/New_York (Nueva York)</option>
            </select>
          </FormField>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveSite"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue h-4 w-4 cursor-pointer"
            />
            <label htmlFor="isActiveSite" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
              Sitio activo (Habilita la operación y balances)
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
