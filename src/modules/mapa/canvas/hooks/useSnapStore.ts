import { create } from 'zustand'

interface SnapState {
  hoveredEdgeId: string | null       // edge que se resaltaría al soltar
  isDraggingMeasurement: boolean     // true mientras se arrastra un nodo de medición
  setHoveredEdgeId: (id: string | null) => void
  setIsDraggingMeasurement: (v: boolean) => void
}

export const useSnapStore = create<SnapState>((set) => ({
  hoveredEdgeId: null,
  isDraggingMeasurement: false,
  setHoveredEdgeId: (id) => set((s) => s.hoveredEdgeId === id ? s : { hoveredEdgeId: id }),
  setIsDraggingMeasurement: (v) => set({ isDraggingMeasurement: v }),
}))
