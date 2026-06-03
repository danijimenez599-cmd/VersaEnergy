import { create } from 'zustand'
import { supabase } from '@/services/supabase'
import { QUALITY_COLORS, type ReadingQuality } from '@/services/measurement-engine/lastReadings'

// ── Types ────────────────────────────────────────────────────────────────────

export interface EquipmentMPEntry {
  id: string
  tag: string
  name: string
  quantity: string
  unit: string
  source_type: string
  measurement_type: string
  value: number | null
  recorded_at: string | null
  quality: ReadingQuality
}

interface EquipmentMPsState {
  mpsByEntity: Map<string, EquipmentMPEntry[]>  // entityId → MPs
  loading: boolean
  fetchForEntities: (siteId: string, entityIds: string[]) => Promise<void>
  getMPs: (entityId: string) => EquipmentMPEntry[]
  clear: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcQuality(ts: string | null): ReadingQuality {
  if (!ts) return 'missing'
  const ageH = (Date.now() - new Date(ts).getTime()) / 3_600_000
  if (ageH < 4) return 'good'
  if (ageH < 12) return 'delayed'
  return 'missing'
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useEquipmentMPs = create<EquipmentMPsState>((set, get) => ({
  mpsByEntity: new Map(),
  loading: false,

  fetchForEntities: async (siteId, entityIds) => {
    if (!siteId || entityIds.length === 0) return
    set({ loading: true })

    // 1. MPs que miden estos equipos (target_type='equipment')
    const { data: mps } = await supabase
      .from('measurement_points')
      .select('id, tag, name, quantity, unit, source_type, measurement_type, target_id')
      .eq('site_id', siteId)
      .eq('target_type', 'equipment')
      .eq('is_active', true)
      .in('target_id', entityIds)

    if (!mps || mps.length === 0) {
      set({ mpsByEntity: new Map(), loading: false })
      return
    }

    const mpIds = mps.map((m) => m.id)

    // 2. Última lectura por MP
    const { data: readings } = await supabase
      .from('measurement_readings')
      .select('measurement_point_id, value, recorded_at')
      .in('measurement_point_id', mpIds)
      .order('recorded_at', { ascending: false })
      .limit(mpIds.length * 5)

    const latestByMp = new Map<string, { value: number | null; recorded_at: string }>()
    for (const r of readings || []) {
      if (!latestByMp.has(r.measurement_point_id)) {
        latestByMp.set(r.measurement_point_id, { value: r.value, recorded_at: r.recorded_at })
      }
    }

    // 3. Agrupar por entityId
    const byEntity = new Map<string, EquipmentMPEntry[]>()
    for (const mp of mps) {
      const entityId = mp.target_id as string
      const latest = latestByMp.get(mp.id)
      const entry: EquipmentMPEntry = {
        id: mp.id,
        tag: mp.tag,
        name: mp.name,
        quantity: mp.quantity,
        unit: mp.unit,
        source_type: (mp.source_type as string) || 'manual',
        measurement_type: mp.measurement_type,
        value: latest?.value ?? null,
        recorded_at: latest?.recorded_at ?? null,
        quality: calcQuality(latest?.recorded_at ?? null),
      }
      const list = byEntity.get(entityId) || []
      byEntity.set(entityId, [...list, entry])
    }

    set({ mpsByEntity: byEntity, loading: false })
  },

  getMPs: (entityId) => get().mpsByEntity.get(entityId) || [],

  clear: () => set({ mpsByEntity: new Map() }),
}))

// Re-export para usar en nodos sin importar QUALITY_COLORS por separado
export { QUALITY_COLORS }
