import { create } from 'zustand'
import { getLastReadings, type LastReading } from '@/services/measurement-engine/lastReadings'

// ── Store ────────────────────────────────────────────────────────────────────

interface DiagramReadingsState {
  readings: Map<string, LastReading>  // nodeId → reading
  loading: boolean
  lastFetchedAt: number | null

  fetchReadings: (siteId: string, nodeIds: string[]) => Promise<void>
  getReading: (nodeId: string) => LastReading | undefined
  clear: () => void
}

export const useDiagramReadings = create<DiagramReadingsState>((set, get) => ({
  readings: new Map(),
  loading: false,
  lastFetchedAt: null,

  fetchReadings: async (siteId: string, nodeIds: string[]) => {
    if (!siteId || nodeIds.length === 0) return
    set({ loading: true })
    try {
      const list = await getLastReadings(siteId, nodeIds)
      const map = new Map<string, LastReading>()
      for (const r of list) map.set(r.nodeId, r)
      set({ readings: map, loading: false, lastFetchedAt: Date.now() })
    } catch {
      set({ loading: false })
    }
  },

  getReading: (nodeId: string) => get().readings.get(nodeId),

  clear: () => set({ readings: new Map(), lastFetchedAt: null }),
}))
