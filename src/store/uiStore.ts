import { create } from 'zustand'

export interface SiteOption {
  id: string
  name: string
}

interface UIState {
  sidebarOpen: boolean
  assetTreeOpen: boolean
  activeModule: string
  availableSites: SiteOption[]
  selectedSiteId: string | null
  selectedUtilityType: string | null
  selectedPeriod: string
  /** ID compuesto del nodo en el árbol, ej. "equipment:uuid". Para selección visual del árbol. */
  selectedAssetId: string | null
  /** UUID crudo del activo seleccionado — usar en consultas Supabase. */
  selectedAssetSourceId: string | null
  /** Tipo del activo seleccionado: plant | area | system | equipment */
  selectedAssetType: string | null
  selectedAssetName: string | null
  selectedAssetCode: string | null
  activeLens: string

  toggleSidebar: () => void
  toggleAssetTree: () => void
  setActiveModule: (id: string) => void
  setAvailableSites: (sites: SiteOption[]) => void
  setSelectedSiteId: (id: string | null) => void
  setSelectedUtilityType: (type: string | null) => void
  setSelectedPeriod: (period: string) => void
  setSelectedAssetId: (id: string | null) => void
  setSelectedAsset: (
    id: string | null,
    sourceId: string | null,
    type: string | null,
    name?: string | null,
    code?: string | null
  ) => void
  setActiveLens: (lens: string) => void
}

const storageKey = 'versa-energy-operational-context'

function getDefaultPeriod() {
  return new Date().toISOString().slice(0, 7)
}

function loadStoredContext() {
  if (typeof window === 'undefined') {
    return {
      selectedSiteId: null,
      selectedUtilityType: null,
      selectedPeriod: getDefaultPeriod(),
    }
  }

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return {
        selectedSiteId: null,
        selectedUtilityType: null,
        selectedPeriod: getDefaultPeriod(),
      }
    }

    const parsed = JSON.parse(raw) as Partial<
      Pick<UIState, 'selectedSiteId' | 'selectedUtilityType' | 'selectedPeriod'>
    >

    return {
      selectedSiteId: parsed.selectedSiteId ?? null,
      selectedUtilityType: parsed.selectedUtilityType ?? null,
      selectedPeriod: parsed.selectedPeriod ?? getDefaultPeriod(),
    }
  } catch {
    return {
      selectedSiteId: null,
      selectedUtilityType: null,
      selectedPeriod: getDefaultPeriod(),
    }
  }
}

function saveStoredContext(state: Pick<UIState, 'selectedSiteId' | 'selectedUtilityType' | 'selectedPeriod'>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(state))
}

const storedContext = loadStoredContext()

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  assetTreeOpen: true,
  activeModule: 'inicio',
  availableSites: [],
  selectedSiteId: storedContext.selectedSiteId,
  selectedUtilityType: storedContext.selectedUtilityType,
  selectedPeriod: storedContext.selectedPeriod,
  selectedAssetId: null,
  selectedAssetSourceId: null,
  selectedAssetType: null,
  selectedAssetName: null,
  selectedAssetCode: null,
  activeLens: 'resumen',

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleAssetTree: () => set((s) => ({ assetTreeOpen: !s.assetTreeOpen })),
  setActiveModule: (id) => set({ activeModule: id }),
  setAvailableSites: (sites) =>
    set((state) => {
      const selectedSiteStillExists = sites.some((site) => site.id === state.selectedSiteId)
      const selectedSiteId = selectedSiteStillExists
        ? state.selectedSiteId
        : sites[0]?.id ?? null

      saveStoredContext({
        selectedSiteId,
        selectedUtilityType: state.selectedUtilityType,
        selectedPeriod: state.selectedPeriod,
      })

      return { availableSites: sites, selectedSiteId }
    }),
  setSelectedSiteId: (id) =>
    set((state) => {
      saveStoredContext({
        selectedSiteId: id,
        selectedUtilityType: state.selectedUtilityType,
        selectedPeriod: state.selectedPeriod,
      })
      // Reset selected asset when site changes
      return { selectedSiteId: id, selectedAssetId: null }
    }),
  setSelectedUtilityType: (type) =>
    set((state) => {
      saveStoredContext({
        selectedSiteId: state.selectedSiteId,
        selectedUtilityType: type,
        selectedPeriod: state.selectedPeriod,
      })
      return { selectedUtilityType: type }
    }),
  setSelectedPeriod: (period) =>
    set((state) => {
      const selectedPeriod = period || getDefaultPeriod()
      saveStoredContext({
        selectedSiteId: state.selectedSiteId,
        selectedUtilityType: state.selectedUtilityType,
        selectedPeriod,
      })
      return { selectedPeriod }
    }),
  setSelectedAssetId: (id) => set({ selectedAssetId: id }),
  setSelectedAsset: (id, sourceId, type, name = null, code = null) => set({
    selectedAssetId: id,
    selectedAssetSourceId: sourceId,
    selectedAssetType: type,
    selectedAssetName: name,
    selectedAssetCode: code,
  }),
  setActiveLens: (lens) => set({ activeLens: lens }),
}))
