import { useCallback, useRef, type DragEvent } from 'react'
import { ReactFlow, Background, Controls, MiniMap, MarkerType, ConnectionMode, type Connection, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useDiagramStore } from './hooks/useDiagramStore'
import { nodeTypes } from './nodes'
import { edgeTypes } from './edges/UtilityEdge'
import type { DiagramNodeData, DiagramEdgeData } from '@/services/topology-engine/graphTypes'

export function EnergyUtilitiesCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const selectElement = useDiagramStore((s) => s.selectElement)
  const addNodeStore = useDiagramStore((s) => s.addNode)
  const addEdgeStore = useDiagramStore((s) => s.addEdge)

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge<DiagramEdgeData> = {
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        type: 'utility',
        data: {
          edgeType: 'pipe',
          utility: 'electricity',
          flowDirection: 'source_to_target',
          properties: {},
        },
      }
      addEdgeStore(edge)
    },
    [addEdgeStore],
  )

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const nodeType = e.dataTransfer.getData('application/reactflow-type')
      if (!nodeType || !reactFlowWrapper.current) return

      const rect = reactFlowWrapper.current.getBoundingClientRect()
      const position = {
        x: e.clientX - rect.left - 60,
        y: e.clientY - rect.top - 25,
      }

      const newNode: Node<DiagramNodeData> = {
        id: crypto.randomUUID(),
        type: 'equipment',
        position,
        data: {
          tag: `${nodeType}-${Date.now().toString(36).slice(-4)}`,
          label: nodeType,
          nodeType: nodeType as DiagramNodeData['nodeType'],
          utility: 'electricity',
          properties: {},
        },
      }
      addNodeStore(newNode)
    },
    [addNodeStore],
  )

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => { selectElement({ type: 'node', id: node.id }) },
    [selectElement],
  )

  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: Edge) => { selectElement({ type: 'edge', id: edge.id }) },
    [selectElement],
  )

  const onPaneClick = useCallback(() => { selectElement(null) }, [selectElement])

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges as Edge[]}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{
          type: 'utility',
          style: { stroke: '#6b7280', strokeWidth: 2.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280', width: 16, height: 16 },
        }}
      >
        <Background gap={16} color="#e5e7eb" />
        <Controls className="!rounded-lg !border !border-border !shadow-sm" />
        <MiniMap
          className="!rounded-lg !border !border-border !shadow-sm"
          nodeColor={(node) => {
            const nt = (node.data as Record<string, unknown>)?.nodeType as string || ''
            const colors: Record<string, string> = {
              boiler: '#3b82f6', pump: '#3b82f6', compressor: '#3b82f6', chiller: '#3b82f6',
              transformer: '#3b82f6', panel: '#3b82f6', generator: '#3b82f6',
              connector_pipe: '#14b8a6', header: '#14b8a6',
              valve: '#f97316', breaker: '#f97316',
              flow_meter: '#a855f7', power_meter: '#a855f7',
              iot_device: '#06b6d4', area_node: '#9ca3af', utility_source: '#22c55e', loss_node: '#ef4444',
            }
            return colors[nt] || '#6b7280'
          }}
        />
      </ReactFlow>
    </div>
  )
}
