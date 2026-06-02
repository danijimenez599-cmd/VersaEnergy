import { create } from 'zustand'
import type { Node, Edge } from '@xyflow/react'
import type { DiagramNodeData, DiagramEdgeData, DiagramStatus } from '@/services/topology-engine/graphTypes'

interface DiagramState {
  diagramId: string | null
  diagramName: string
  diagramUtility: string | null
  diagramStatus: DiagramStatus
  nodes: Node<DiagramNodeData>[]
  edges: Edge<DiagramEdgeData>[]
  selectedElement: { type: 'node' | 'edge'; id: string } | null
  isDirty: boolean

  setDiagram: (id: string | null, name: string, utility: string | null, status?: DiagramStatus) => void
  setStatus: (status: DiagramStatus) => void
  setNodes: (nodes: Node<DiagramNodeData>[]) => void
  setEdges: (edges: Edge<DiagramEdgeData>[]) => void
  addNode: (node: Node<DiagramNodeData>) => void
  updateNode: (id: string, data: Partial<DiagramNodeData>) => void
  removeNode: (id: string) => void
  addEdge: (edge: Edge<DiagramEdgeData>) => void
  updateEdge: (id: string, data: Partial<DiagramEdgeData>) => void
  removeEdge: (id: string) => void
  selectElement: (el: { type: 'node' | 'edge'; id: string } | null) => void
  resetDiagram: () => void
  markClean: () => void
}

export const useDiagramStore = create<DiagramState>((set) => ({
  diagramId: null,
  diagramName: '',
  diagramUtility: null,
  diagramStatus: 'draft',
  nodes: [],
  edges: [],
  selectedElement: null,
  isDirty: false,

  setDiagram: (id, name, utility, status = 'draft') =>
    set({ diagramId: id, diagramName: name, diagramUtility: utility, diagramStatus: status, isDirty: false }),

  setStatus: (status) => set({ diagramStatus: status }),

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),

  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node], isDirty: true })),

  updateNode: (id, data) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
      ),
      isDirty: true,
    })),

  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedElement: s.selectedElement?.id === id ? null : s.selectedElement,
      isDirty: true,
    })),

  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge], isDirty: true })),

  updateEdge: (id, data) =>
    set((s) => ({
      edges: s.edges.map((e) =>
        e.id === id ? { ...e, data: { ...(e.data || {} as DiagramEdgeData), ...data } as DiagramEdgeData } : e,
      ),
      isDirty: true,
    })),

  removeEdge: (id) =>
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      selectedElement: s.selectedElement?.id === id ? null : s.selectedElement,
      isDirty: true,
    })),

  selectElement: (el) => set({ selectedElement: el }),
  resetDiagram: () => set({
    diagramId: null, diagramName: '', diagramUtility: null, diagramStatus: 'draft',
    nodes: [], edges: [], selectedElement: null, isDirty: false,
  }),
  markClean: () => set({ isDirty: false }),
}))
