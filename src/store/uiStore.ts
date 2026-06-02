import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  activeModule: string
  selectedSiteId: string | null
  selectedUtilityType: string | null

  toggleSidebar: () => void
  setActiveModule: (id: string) => void
  setSelectedSiteId: (id: string | null) => void
  setSelectedUtilityType: (type: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeModule: 'inicio',
  selectedSiteId: null,
  selectedUtilityType: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveModule: (id) => set({ activeModule: id }),
  setSelectedSiteId: (id) => set({ selectedSiteId: id }),
  setSelectedUtilityType: (type) => set({ selectedUtilityType: type }),
}))
