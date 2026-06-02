import { useState, useEffect, type DragEvent } from 'react'
import { ChevronDown, ChevronRight, Search, Clock, X } from 'lucide-react'
import { useDiagramStore } from '../canvas/hooks/useDiagramStore'
import {
  ALL_PALETTE_GROUPS,
  getFilteredGroups,
  type PaletteItemDef,
} from './paletteConfig'

// ── Recents ──────────────────────────────────────────────────────────────────

const RECENTS_KEY = 'energy-palette-recents'
const MAX_RECENTS = 5

function loadRecents(): PaletteItemDef[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecent(item: PaletteItemDef) {
  try {
    const prev = loadRecents().filter((r) => r.type !== item.type)
    localStorage.setItem(RECENTS_KEY, JSON.stringify([item, ...prev].slice(0, MAX_RECENTS)))
  } catch {
    // ignore
  }
}

// ── Family color helpers ──────────────────────────────────────────────────────

const familyItemColors: Record<string, string> = {
  equipment:     'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  connector:     'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
  control:       'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  measurement:   'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  iot:           'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
  organizational:'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
  special:       'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
}

// ── Palette item component ────────────────────────────────────────────────────

function PaletteItem({
  item,
  onDragStart,
  compact = false,
}: {
  item: PaletteItemDef
  onDragStart: (e: DragEvent<HTMLDivElement>, item: PaletteItemDef) => void
  compact?: boolean
}) {
  const Icon = item.icon
  const colorClass = familyItemColors[item.family] || 'bg-gray-50'

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      title={item.description}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] border cursor-grab active:cursor-grabbing transition-all duration-100 select-none ${compact ? 'py-1' : ''} ${colorClass}`}
    >
      <Icon size={11} className="shrink-0 opacity-80" />
      <span className="truncate font-medium leading-none">{item.label}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function NodePalette() {
  const diagramUtility = useDiagramStore((s) => s.diagramUtility)

  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    equipment: true,
    connector: false,
    control: false,
    measurement: false,
    iot: false,
    organizational: false,
    special: false,
  })
  const [recents, setRecents] = useState<PaletteItemDef[]>([])

  // Load recents on mount
  useEffect(() => { setRecents(loadRecents()) }, [])

  function toggle(family: string) {
    setExpanded((prev) => ({ ...prev, [family]: !prev[family] }))
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, item: PaletteItemDef) {
    e.dataTransfer.setData('application/reactflow-type', item.type)
    e.dataTransfer.setData('application/reactflow-family', item.family)
    e.dataTransfer.effectAllowed = 'move'
    // Track recent
    saveRecent(item)
    setRecents(loadRecents())
  }

  // Filtered groups based on utility + search query
  const filteredGroups = getFilteredGroups(diagramUtility, query)

  // If searching, auto-expand all groups that have results
  const isSearching = query.trim().length > 0

  // Build the flat all-items map for recents lookup
  const allItemsFlat = ALL_PALETTE_GROUPS.flatMap((g) => g.items)
  const visibleRecents = recents
    .map((r) => allItemsFlat.find((i) => i.type === r.type))
    .filter((i): i is PaletteItemDef => !!i)

  return (
    <div className="w-56 bg-white border-r border-gray-100 h-full flex flex-col shrink-0 shadow-[1px_0_0_0_#f3f4f6]">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-100 shrink-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Paleta de elementos
        </p>
        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar elemento..."
            className="w-full pl-7 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B6FF8]/20 focus:border-[#1B6FF8]/40 bg-gray-50 placeholder-gray-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Utility context badge */}
        {diagramUtility && !isSearching && (
          <p className="text-[10px] text-[#1B6FF8] mt-1.5 truncate">
            Filtrado por utilidad activa
          </p>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Recents section */}
        {visibleRecents.length > 0 && !isSearching && (
          <div className="mb-2">
            <div className="flex items-center gap-1 px-1 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <Clock size={9} />
              Recientes
            </div>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {visibleRecents.map((item) => (
                <PaletteItem
                  key={item.type}
                  item={item}
                  onDragStart={handleDragStart}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* No results message */}
        {filteredGroups.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-xs text-gray-400">Sin resultados para "{query}"</p>
          </div>
        )}

        {/* Groups */}
        {filteredGroups.map((group) => {
          const isOpen = isSearching ? true : (expanded[group.family] ?? false)
          return (
            <div key={group.family}>
              <button
                onClick={() => toggle(group.family)}
                className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors ${group.color} border-l-2`}
              >
                {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                <span className="flex-1 text-left">{group.label}</span>
                <span className="text-[10px] text-gray-400 font-normal">{group.items.length}</span>
              </button>

              {isOpen && (
                <div className="ml-2 mt-1 space-y-0.5">
                  {group.items.map((item) => (
                    <PaletteItem
                      key={item.type}
                      item={item}
                      onDragStart={handleDragStart}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer summary */}
      <div className="px-3 py-2 border-t border-gray-100 shrink-0">
        <p className="text-[10px] text-gray-400 text-center">
          Arrastra para agregar al diagrama
        </p>
      </div>
    </div>
  )
}
