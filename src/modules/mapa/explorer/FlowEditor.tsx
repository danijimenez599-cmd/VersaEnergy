// FlowEditor — full-power editor for energy flow links.
//
// Opens as a right-side panel (same pattern as TrendPanel).
// Lets the engineer define WHERE energy comes from for each area:
//   · From another area in the system (internal distribution)
//   · From an external source (CFE, CENAGAS, etc.)
// Also shows (read-only) which areas receive energy FROM this area.

import { useEffect, useState } from 'react'
import {
  X, Plus, Trash2, Pencil, Check, ChevronRight,
  Zap, Flame, Wind, Droplets, Gauge, ArrowLeftRight,
  Loader2, Building2,
} from 'lucide-react'
import { getUtilityLabel } from '@/shared/OperationalContext'
import {
  createFlowLink, deleteFlowLink, updateFlowLinkNotes,
  loadAreaOptions,
  type FlowLink, type AreaOption,
} from '@/services/explorer-engine/flowLinks'

// ── Visual helpers ────────────────────────────────────────────────────────────
const UTILITY_META: Record<string, { color: string; soft: string; icon: typeof Zap }> = {
  electricity:      { color: '#1B6FF8', soft: '#EAF1FE', icon: Zap },
  natural_gas:      { color: '#ea580c', soft: '#FDEEE6', icon: Flame },
  lpg:              { color: '#b45309', soft: '#F7EEE2', icon: Flame },
  diesel:           { color: '#ca8a04', soft: '#F8F1DF', icon: Flame },
  steam:            { color: '#7c3aed', soft: '#F1EBFC', icon: Flame },
  compressed_air:   { color: '#0d9488', soft: '#E2F4F2', icon: Wind },
  chilled_water:    { color: '#0891b2', soft: '#E0F3F8', icon: Droplets },
  hot_water:        { color: '#dc2626', soft: '#FBE9E9', icon: Droplets },
  industrial_water: { color: '#0ea5e9', soft: '#E4F3FC', icon: Droplets },
}
function umeta(u: string) { return UTILITY_META[u] ?? { color: '#64748b', soft: '#EEF1F5', icon: Gauge } }

const ALL_UTILITIES = Object.keys(UTILITY_META)

const EXT_COLORS: Record<string, string> = {
  '#1B6FF8': 'Azul (eléctrica)',
  '#ea580c': 'Naranja (gas)',
  '#0ea5e9': 'Cielo (agua)',
  '#7c3aed': 'Morado (vapor)',
  '#0d9488': 'Teal (aire)',
  '#64748b': 'Gris (otro)',
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  siteId: string
  areaId: string
  areaName: string
  /** All flow links for this site (to compute "distribuye a") */
  allLinks: FlowLink[]
  onLinksChanged: (links: FlowLink[]) => void
  onFocusArea: (areaId: string) => void
  onClose: () => void
}

// ── Inline edit row ───────────────────────────────────────────────────────────
function LinkRow({ link, onDelete, onSaveNotes }: {
  link: FlowLink
  onDelete: (id: string) => void
  onSaveNotes: (id: string, notes: string) => void
}) {
  const m = umeta(link.utility)
  const Icon = m.icon
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(link.notes ?? '')
  const [deleting, setDeleting] = useState(false)

  const sourceName = link.fromType === 'external'
    ? `◉ ${link.fromName}`
    : `${link.fromAreaName}${link.fromAreaCode ? ` (${link.fromAreaCode})` : ''}`

  async function handleDelete() {
    setDeleting(true)
    await onDelete(link.id)
  }

  async function handleSaveNotes() {
    await onSaveNotes(link.id, notes)
    setEditingNotes(false)
  }

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-3 transition-shadow hover:shadow-sm">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
          style={{ background: m.soft, color: m.color }}>
          <Icon size={13} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-slate-900">{getUtilityLabel(link.utility)}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <ChevronRight size={9} className="text-slate-400" style={{ transform: 'rotate(180deg)' }} />
            <p className="text-[10px] font-semibold text-slate-600">{sourceName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => setEditingNotes(!editingNotes)}
            className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Editar notas">
            <Pencil size={11} />
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-40"
            title="Eliminar enlace">
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          </button>
        </div>
      </div>

      {/* Notes row */}
      {(link.notes || editingNotes) && (
        <div className="mt-2 ml-9">
          {editingNotes ? (
            <div className="flex items-center gap-2">
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Nota opcional (ej. Tablero LP-A, presión media...)"
                className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-brand-blue"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSaveNotes(); if (e.key === 'Escape') setEditingNotes(false) }}
              />
              <button onClick={handleSaveNotes}
                className="grid h-6 w-6 place-items-center rounded-md bg-brand-blue text-white hover:bg-blue-700">
                <Check size={11} />
              </button>
              <button onClick={() => { setNotes(link.notes ?? ''); setEditingNotes(false) }}
                className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50">
                <X size={11} />
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic">{link.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Distribuye a (read-only reverse lookup) ───────────────────────────────────
//
function DistributesToSectionFixed({ areaId, allLinks, onFocusArea, areaOptions }: {
  areaId: string; allLinks: FlowLink[]; onFocusArea: (id: string) => void; areaOptions: AreaOption[]
}) {
  const outgoing = allLinks.filter(l => l.fromAreaId === areaId)
  if (!outgoing.length) return (
    <p className="text-[11px] text-slate-400 italic px-1">
      Esta área no distribuye energía a ninguna otra (consumidor final o sin enlaces definidos).
    </p>
  )

  const byUtil: Record<string, FlowLink[]> = {}
  for (const l of outgoing) {
    if (!byUtil[l.utility]) byUtil[l.utility] = []
    byUtil[l.utility].push(l)
  }

  return (
    <div className="space-y-2">
      {Object.entries(byUtil).map(([util, links]) => {
        const m = umeta(util)
        const Icon = m.icon
        return (
          <div key={util} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
              style={{ background: m.soft, color: m.color }}>
              <Icon size={11} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-500 mb-1.5">{getUtilityLabel(util)}</p>
              <div className="flex flex-wrap gap-1">
                {links.map(l => {
                  const toArea = areaOptions.find(a => a.id === l.toAreaId)
                  return (
                    <button key={l.id} onClick={() => onFocusArea(l.toAreaId)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold text-white transition-opacity hover:opacity-80"
                      style={{ background: m.color }}>
                      <Building2 size={9} />
                      {toArea?.name ?? l.toAreaId}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Add form ──────────────────────────────────────────────────────────────────
interface AddFormProps {
  siteId: string; areaId: string; areaOptions: AreaOption[]
  existingLinks: FlowLink[]
  onAdded: (link: FlowLink) => void
  onCancel: () => void
}

function AddLinkForm({ siteId, areaId, areaOptions, existingLinks, onAdded, onCancel }: AddFormProps) {
  const [utility, setUtility] = useState('electricity')
  const [fromType, setFromType] = useState<'area' | 'external'>('area')
  const [fromAreaId, setFromAreaId] = useState('')
  const [fromName, setFromName] = useState('')
  const [fromColor, setFromColor] = useState('#1B6FF8')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Filter areas: exclude self + areas already linked with same utility
  const existingAreaIds = new Set(
    existingLinks.filter(l => l.utility === utility && l.fromType === 'area').map(l => l.fromAreaId)
  )
  const availableAreas = areaOptions.filter(a => a.id !== areaId && !existingAreaIds.has(a.id))

  const canSave = fromType === 'area' ? Boolean(fromAreaId) : Boolean(fromName.trim())

  async function handleSave() {
    if (!canSave) return
    setError('')
    setSaving(true)
    const result = await createFlowLink({
      siteId,
      fromType,
      fromAreaId: fromType === 'area' ? fromAreaId : null,
      fromName: fromType === 'external' ? fromName.trim() : null,
      fromColor: fromType === 'external' ? fromColor : null,
      toAreaId: areaId,
      utility,
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (!result) { setError('No se pudo guardar. ¿Ya existe este enlace?'); return }
    onAdded(result)
  }

  const m = umeta(utility)

  return (
    <div className="rounded-xl border-2 border-brand-blue/20 bg-blue-50/30 p-4 space-y-4">
      <p className="text-xs font-black text-slate-700">Nuevo enlace de energía</p>

      {/* Utility selector */}
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Utility</label>
        <div className="grid grid-cols-3 gap-1.5">
          {ALL_UTILITIES.map(u => {
            const um = umeta(u); const Icon = um.icon; const active = utility === u
            return (
              <button key={u} onClick={() => setUtility(u)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold transition-all ${
                  active ? 'border-current text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
                style={active ? { background: um.color, borderColor: um.color } : {}}>
                <Icon size={11} style={active ? {} : { color: um.color }} />
                {getUtilityLabel(u).split(' ')[0]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Source type */}
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Fuente</label>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setFromType('area')}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all ${
              fromType === 'area' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}>
            <Building2 size={13} className="shrink-0" />
            <div>
              <p className="text-xs font-black">Área del sistema</p>
              <p className={`text-[9px] leading-tight ${fromType === 'area' ? 'text-slate-300' : 'text-slate-400'}`}>
                Otra caja de esta planta
              </p>
            </div>
          </button>
          <button onClick={() => setFromType('external')}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all ${
              fromType === 'external' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}>
            <span className="shrink-0 text-sm font-black">◉</span>
            <div>
              <p className="text-xs font-black">Fuente externa</p>
              <p className={`text-[9px] leading-tight ${fromType === 'external' ? 'text-slate-300' : 'text-slate-400'}`}>
                CFE, CENAGAS, proveedor
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Area selector */}
      {fromType === 'area' && (
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
            Área que distribuye {getUtilityLabel(utility).toLowerCase()}
          </label>
          {availableAreas.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">
              No hay más áreas disponibles para este utility.
            </p>
          ) : (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {availableAreas.map(a => (
                <button key={a.id} onClick={() => setFromAreaId(a.id)}
                  className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                    fromAreaId === a.id ? 'border-brand-blue bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                  <Building2 size={12} className="text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800">{a.name}</p>
                    {a.parentName && <p className="text-[9px] text-slate-400">{a.parentName}</p>}
                  </div>
                  {a.code && <span className="text-[9px] font-mono font-bold text-slate-400 shrink-0">{a.code}</span>}
                  {fromAreaId === a.id && <Check size={12} className="text-brand-blue shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* External source */}
      {fromType === 'external' && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Nombre del proveedor / fuente
            </label>
            <input
              value={fromName}
              onChange={e => setFromName(e.target.value)}
              placeholder="Ej: CFE Red eléctrica, CENAGAS Gas natural..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Color del chip
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(EXT_COLORS).map(([hex, label]) => (
                <button key={hex} onClick={() => setFromColor(hex)}
                  title={label}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-all ${
                    fromColor === hex ? 'border-current' : 'border-slate-200'
                  }`}
                  style={{ color: hex, background: fromColor === hex ? `${hex}18` : '' }}>
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ background: hex }} />
                  {label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
          Nota técnica (opcional)
        </label>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Ej: Tablero LP-A, acometida 13.2 kV, manifold vapor..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-blue"
        />
      </div>

      {/* Validation chip preview */}
      {canSave && (
        <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2">
          <span className="text-[10px] text-slate-400">Vista previa:</span>
          <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black"
            style={{ background: m.soft, color: m.color }}>
            <m.icon size={9} />
            ← {fromType === 'external' ? fromName : availableAreas.find(a => a.id === fromAreaId)?.name}
          </span>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-600 font-semibold">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel}
          className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={!canSave || saving}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-brand-blue py-2 text-xs font-black text-white hover:bg-blue-700 transition-colors disabled:opacity-40">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Guardar enlace
        </button>
      </div>
    </div>
  )
}

// ── Main FlowEditor panel ─────────────────────────────────────────────────────
export function FlowEditor({ siteId, areaId, areaName, allLinks, onLinksChanged, onFocusArea, onClose }: Props) {
  const [areaOptions, setAreaOptions] = useState<AreaOption[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Links that flow INTO this area
  const linksIn = allLinks.filter(l => l.toAreaId === areaId)

  useEffect(() => {
    setLoading(true)
    loadAreaOptions(siteId).then(opts => { setAreaOptions(opts); setLoading(false) })
  }, [siteId])

  async function handleDelete(id: string) {
    const ok = await deleteFlowLink(id)
    if (ok) onLinksChanged(allLinks.filter(l => l.id !== id))
  }

  async function handleSaveNotes(id: string, notes: string) {
    const ok = await updateFlowLinkNotes(id, notes)
    if (ok) onLinksChanged(allLinks.map(l => l.id === id ? { ...l, notes } : l))
  }

  function handleAdded(link: FlowLink) {
    onLinksChanged([...allLinks, link])
    setShowAddForm(false)
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-slate-200 bg-white shadow-2xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ArrowLeftRight size={14} className="text-brand-blue" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Editor de flujos de energía</p>
          </div>
          <h3 className="text-sm font-black text-slate-900">{areaName}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Define de dónde llega cada utility a esta área</p>
        </div>
        <button onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X size={16} />
        </button>
      </div>

      {/* ── Body (scrollable) ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* Section: Recibe de */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-black text-slate-900">Recibe energía de</p>
              <p className="text-[10px] text-slate-400">Fuentes que alimentan esta área</p>
            </div>
            <button onClick={() => setShowAddForm(true)}
              disabled={showAddForm}
              className="flex items-center gap-1.5 rounded-xl bg-brand-blue px-3 py-1.5 text-[11px] font-black text-white hover:bg-blue-700 transition-colors disabled:opacity-40">
              <Plus size={11} /> Agregar
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={18} className="animate-spin text-slate-400" />
            </div>
          ) : linksIn.length === 0 && !showAddForm ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-bold text-slate-500">Sin fuentes definidas</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Define de dónde recibe electricidad, vapor, gas u otros utilities esta área.
              </p>
              <button onClick={() => setShowAddForm(true)}
                className="mt-3 text-xs font-bold text-brand-blue hover:underline">
                + Agregar primera fuente
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {linksIn.map(link => (
                <LinkRow key={link.id} link={link}
                  onDelete={handleDelete} onSaveNotes={handleSaveNotes} />
              ))}
            </div>
          )}

          {/* Add form inline */}
          {showAddForm && (
            <div className={linksIn.length > 0 ? 'mt-3' : ''}>
              <AddLinkForm
                siteId={siteId} areaId={areaId}
                areaOptions={areaOptions} existingLinks={linksIn}
                onAdded={handleAdded} onCancel={() => setShowAddForm(false)}
              />
            </div>
          )}
        </section>

        {/* Divider */}
        <div className="h-px bg-slate-100" />

        {/* Section: Distribuye a (read-only) */}
        <section>
          <div className="mb-3">
            <p className="text-xs font-black text-slate-900">Distribuye energía a</p>
            <p className="text-[10px] text-slate-400">
              Áreas que reciben energía de aquí · se edita desde cada área destino
            </p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin text-slate-400" />
            </div>
          ) : (
            <DistributesToSectionFixed
              areaId={areaId} allLinks={allLinks}
              onFocusArea={(id) => { onFocusArea(id); onClose() }}
              areaOptions={areaOptions}
            />
          )}
        </section>

        {/* Divider */}
        <div className="h-px bg-slate-100" />

        {/* Tip */}
        <section className="rounded-xl bg-blue-50 border border-blue-100 p-4">
          <p className="text-[10px] font-black text-blue-700 mb-1">💡 ¿Cómo funciona?</p>
          <p className="text-[10px] text-blue-600 leading-relaxed">
            Los enlaces definen el flujo de energía entre cajas. La suma de los enlaces
            de toda la planta construye el diagrama de distribución energética sin necesidad
            de dibujar líneas. Cada caja sabe de dónde recibe y a quién distribuye.
          </p>
        </section>

      </div>
    </div>
  )
}
