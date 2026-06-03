import React, {
  useState, useEffect, useMemo, useRef, useCallback,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, ChevronRight, MoreHorizontal, Plus, Trash2, Gauge,
} from 'lucide-react'
import {
  type EnergyAssetTreeNode,
  type EnergyAssetCreateKind,
  type EnergyAssetNodeType,
  getAllowedCreateKinds,
} from '@/services/asset-tree'
import { utilityOptions } from '@/shared/OperationalContext'
import { ASSET_TYPE_ICONS, ASSET_TYPE_LABELS } from '@/shared/assetHelpers'

// ── Utilities ─────────────────────────────────────────────────────────────────

const EXPANDED_KEY = 'energy-asset-tree-expanded-v2'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

function loadExpandedFromStorage(): Set<string> {
  try {
    const stored = sessionStorage.getItem(EXPANDED_KEY)
    if (stored) return new Set(JSON.parse(stored) as string[])
  } catch { /* ignore */ }
  return new Set()
}

function saveExpandedToStorage(set: Set<string>) {
  sessionStorage.setItem(EXPANDED_KEY, JSON.stringify([...set]))
}

function matchesQuery(node: EnergyAssetTreeNode, q: string): boolean {
  const lower = q.toLowerCase()
  return (
    node.name.toLowerCase().includes(lower) ||
    (node.code ?? '').toLowerCase().includes(lower)
  )
}

function collectSearchExpansion(
  node: EnergyAssetTreeNode,
  matchIds: Set<string>,
  acc: Set<string>,
): boolean {
  const childMatches = node.children.some((c) => collectSearchExpansion(c, matchIds, acc))
  if (matchIds.has(node.id) || childMatches) { acc.add(node.id); return true }
  return false
}

// ── Tree item (memoized) ─────────────────────────────────────────────────────
// Props all primitives/stables so React.memo shallow compare works.

interface TreeItemProps {
  node: EnergyAssetTreeNode
  depth: number
  isExpanded: boolean
  isSelected: boolean
  isMenuOpen: boolean
  isSearchMatch: boolean
  expanded: Set<string>
  forceExpand: boolean
  selectedId: string | null
  activeMenuId: string | null
  readOnly: boolean
  utilityFilter: string
  searchQuery: string
  searchMatchIds: Set<string>
  toggleExpand: (id: string) => void
  onSelect: (id: string, node: EnergyAssetTreeNode) => void
  onNewChild?: (kind: EnergyAssetCreateKind, parent: EnergyAssetTreeNode) => void
  onDelete?: (node: EnergyAssetTreeNode) => void
  setActiveMenuId: (id: string | null) => void
}

const AssetTreeItemImpl: React.FC<TreeItemProps> = ({
  node, depth, isExpanded, isSelected, isMenuOpen, isSearchMatch,
  expanded, forceExpand, selectedId, activeMenuId,
  readOnly, utilityFilter, searchQuery, searchMatchIds,
  toggleExpand, onSelect, onNewChild, onDelete, setActiveMenuId,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const hasChildren = node.children.length > 0
  const allowedKinds = getAllowedCreateKinds(node.type as EnergyAssetNodeType)
  const firstKind = allowedKinds[0]

  // Hide equipment that don't match utility filter
  if (
    utilityFilter !== 'all' &&
    node.type === 'equipment' &&
    node.utility && node.utility !== utilityFilter
  ) return null

  // Hide nodes that don't match search (keep ancestors of matches)
  if (searchQuery && !searchMatchIds.has(node.id) && !isSearchMatch) return null

  useEffect(() => {
    if (!isMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isMenuOpen, setActiveMenuId])

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center group py-1.5 pr-2 rounded-lg mx-1.5 transition-all duration-150 cursor-pointer relative',
          isSelected
            ? 'bg-[--color-brand]/10 text-[--color-brand]'
            : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900',
          isMenuOpen && 'z-50',
          isSearchMatch && !isSelected && 'ring-1 ring-[--color-brand]/30',
          node.status === 'decommissioned' && 'opacity-50 grayscale',
        )}
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
        onClick={() => {
          onSelect(node.id, node)
          if (hasChildren) toggleExpand(node.id)
        }}
      >
        {isSelected && (
          <motion.div
            layoutId="energy-tree-active-indicator"
            className="absolute left-0 w-0.5 h-4 bg-[--color-brand] rounded-r-full"
          />
        )}


        {/* Chevron */}
        <div
          className="w-5 h-5 flex items-center justify-center shrink-0"
          onClick={(e) => { e.stopPropagation(); if (hasChildren) toggleExpand(node.id) }}
        >
          {hasChildren ? (
            <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
              <ChevronRight
                size={12}
                className={cn(isSelected ? 'text-[--color-brand]' : 'text-slate-400')}
              />
            </motion.div>
          ) : (
            <div className="w-1 h-1 rounded-full bg-slate-200" />
          )}
        </div>

        {/* Emoji icon */}
        <span className="w-5 text-center text-sm shrink-0 mr-1 grayscale group-hover:grayscale-0 transition-all opacity-70 group-hover:opacity-100">
          {ASSET_TYPE_ICONS[node.type as keyof typeof ASSET_TYPE_ICONS] ?? '📦'}
        </span>

        {/* Label */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate">
          <span className={cn('truncate text-xs font-bold tracking-tight', isSelected ? 'text-[--color-brand]' : 'text-slate-700')}>
            {node.name}
          </span>
          {node.code && (
            <span className={cn(
              'text-[9px] font-mono font-bold px-1 rounded uppercase shrink-0',
              isSelected ? 'bg-[--color-brand]/10 text-[--color-brand]' : 'bg-slate-100 text-slate-400',
            )}>
              {node.code}
            </span>
          )}
        </div>

        {/* Energy badges */}
        {node.isMeasurementAsset && (
          <span className="shrink-0 text-[8px] font-bold bg-purple-100 text-purple-700 px-1 py-0.5 rounded-full leading-none">
            med
          </span>
        )}
        {node.measurementPointCount > 0 && (
          <span className={cn(
            'shrink-0 flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none',
            isSelected ? 'bg-[--color-brand]/10 text-[--color-brand]' : 'bg-teal-50 text-teal-700',
          )}>
            <Gauge size={9} />
            {node.measurementPointCount}
          </span>
        )}

        {/* Context menu */}
        {!readOnly && (node.type !== 'plant') && (
          <div ref={menuRef} className="relative ml-1 shrink-0">
            <button
              className={cn(
                'w-6 h-6 flex items-center justify-center rounded-md transition-all',
                isMenuOpen || isSelected ? 'opacity-100 bg-white shadow-sm border border-slate-100' : 'opacity-0 group-hover:opacity-60',
                isSelected ? 'text-[--color-brand] hover:bg-[--color-brand]/20' : 'text-slate-400 hover:bg-white hover:shadow-sm',
              )}
              aria-label="Acciones del activo"
              onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : node.id) }}
            >
              <MoreHorizontal size={12} />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  className="absolute top-full right-0 mt-1 w-44 bg-white border border-slate-200 shadow-floating rounded-xl py-1.5 z-50"
                >
                  {firstKind && onNewChild && (
                    <button
                      className="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); onNewChild(firstKind, node) }}
                    >
                      <Plus size={11} className="opacity-70" />
                      Agregar {(ASSET_TYPE_LABELS as Record<string, string>)[firstKind] ?? firstKind}
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-[--color-danger] hover:bg-[--color-danger-bg] transition-colors"
                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); onDelete(node) }}
                    >
                      <Trash2 size={11} className="opacity-70" />
                      Eliminar
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Children */}
      <AnimatePresence initial={false}>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <AssetTreeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                isExpanded={forceExpand || expanded.has(child.id)}
                isSelected={selectedId === child.id}
                isMenuOpen={activeMenuId === child.id}
                isSearchMatch={searchMatchIds.has(child.id)}
                expanded={expanded}
                forceExpand={forceExpand}
                selectedId={selectedId}
                activeMenuId={activeMenuId}
                readOnly={readOnly}
                utilityFilter={utilityFilter}
                searchQuery={searchQuery}
                searchMatchIds={searchMatchIds}
                toggleExpand={toggleExpand}
                onSelect={onSelect}
                onNewChild={onNewChild}
                onDelete={onDelete}
                setActiveMenuId={setActiveMenuId}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Custom memo comparator — re-render only when primitives affecting this row change.
function hasExpansionChangeInSubtree(
  node: EnergyAssetTreeNode,
  prev: Set<string>,
  next: Set<string>,
): boolean {
  for (const child of node.children) {
    if (prev.has(child.id) !== next.has(child.id)) return true
    if (hasExpansionChangeInSubtree(child, prev, next)) return true
  }
  return false
}

const AssetTreeItem = React.memo(AssetTreeItemImpl, (prev, next) =>
  prev.node === next.node &&
  prev.depth === next.depth &&
  prev.isExpanded === next.isExpanded &&
  prev.isSelected === next.isSelected &&
  prev.isMenuOpen === next.isMenuOpen &&
  prev.isSearchMatch === next.isSearchMatch &&
  prev.forceExpand === next.forceExpand &&
  prev.readOnly === next.readOnly &&
  prev.utilityFilter === next.utilityFilter &&
  prev.searchQuery === next.searchQuery &&
  !hasExpansionChangeInSubtree(next.node, prev.expanded, next.expanded) &&
  prev.toggleExpand === next.toggleExpand &&
  prev.onSelect === next.onSelect &&
  prev.onNewChild === next.onNewChild &&
  prev.onDelete === next.onDelete &&
  prev.setActiveMenuId === next.setActiveMenuId
)

// ── Public component ──────────────────────────────────────────────────────────

export interface AssetTreeProps {
  /** Single plant root (Energy always has one root per site). */
  root: EnergyAssetTreeNode
  loading?: boolean
  selectedId?: string | null
  readOnly?: boolean
  onSelect: (id: string, node: EnergyAssetTreeNode) => void
  onNewChild?: (kind: EnergyAssetCreateKind, parent: EnergyAssetTreeNode) => void
  onDelete?: (node: EnergyAssetTreeNode) => void
}

export function AssetTree({
  root, loading = false, selectedId = null, readOnly = false,
  onSelect, onNewChild, onDelete,
}: AssetTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(loadExpandedFromStorage)
  const [query, setQuery] = useState('')
  const [utilityFilter, setUtilityFilter] = useState('all')
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const initDone = useRef(false)

  // Auto-expand first level on first load
  useEffect(() => {
    if (!initDone.current && root) {
      if (expanded.size === 0) {
        const next = new Set<string>()
        next.add(root.id)
        root.children.forEach((c) => next.add(c.id))
        setExpanded(next)
      }
      initDone.current = true
    }
  }, [root]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initDone.current) saveExpandedToStorage(expanded)
  }, [expanded])

  const isSearching = query.trim().length > 0

  const { searchMatchIds, expandForSearch } = useMemo(() => {
    if (!isSearching) return { searchMatchIds: new Set<string>(), expandForSearch: new Set<string>() }
    const matchIds = new Set<string>()
    const flatAll = flattenNode(root)
    flatAll.forEach((n) => { if (matchesQuery(n, query)) matchIds.add(n.id) })
    const expand = new Set<string>()
    if (matchIds.size > 0) collectSearchExpansion(root, matchIds, expand)
    return { searchMatchIds: matchIds, expandForSearch: expand }
  }, [root, query, isSearching])

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const stableSetActiveMenuId = useCallback((id: string | null) => setActiveMenuId(id), [])

  const resultCount = useMemo(
    () => isSearching ? searchMatchIds.size : null,
    [searchMatchIds, isSearching],
  )

  // Count total non-plant nodes for footer
  const totalNodes = useMemo(() => flattenNode(root).length - 1, [root])

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200 w-full shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/70 bg-white shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 tracking-tight text-sm flex items-center gap-2">
            <span className="text-base">🏭</span>
            Árbol de planta
          </h2>
          {/* Utility filter */}
          <select
            value={utilityFilter}
            onChange={(e) => setUtilityFilter(e.target.value)}
            className="text-[10px] border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-[--color-brand]/30 cursor-pointer"
          >
            <option value="all">Todos</option>
            {utilityOptions.filter((u) => u.value !== '').map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative group">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[--color-brand] transition-colors" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className="w-full pl-8 pr-7 py-1.5 text-xs font-medium bg-slate-100 border border-transparent rounded-lg focus:bg-white focus:border-[--color-brand]/40 focus:ring-2 focus:ring-[--color-brand]/10 transition-all placeholder:text-slate-400 outline-none"
          />
          {isSearching && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[--color-brand] transition-colors"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Tree body */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="px-4 space-y-3">
            {[80, 65, 70, 50, 75, 60].map((w, i) => (
              <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${(i % 3) * 14}px` }}>
                <div className="w-4 h-4 bg-slate-200 rounded animate-pulse shrink-0" />
                <div className="h-2.5 bg-slate-200 rounded-full animate-pulse" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            <AssetTreeItem
              node={root}
              depth={0}
              isExpanded={isSearching ? expandForSearch.has(root.id) : expanded.has(root.id)}
              isSelected={selectedId === root.id}
              isMenuOpen={activeMenuId === root.id}
              isSearchMatch={searchMatchIds.has(root.id)}
              expanded={expanded}
              forceExpand={false}
              selectedId={selectedId}
              activeMenuId={activeMenuId}
              readOnly={readOnly}
              utilityFilter={utilityFilter}
              searchQuery={query}
              searchMatchIds={searchMatchIds}
              toggleExpand={toggleExpand}
              onSelect={onSelect}
              onNewChild={onNewChild}
              onDelete={onDelete}
              setActiveMenuId={stableSetActiveMenuId}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-200 px-4 py-2 bg-white">
        {isSearching && resultCount !== null ? (
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">
            {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
          </p>
        ) : (
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
            {totalNodes} activos
          </p>
        )}
      </div>
    </div>
  )
}

function flattenNode(node: EnergyAssetTreeNode): EnergyAssetTreeNode[] {
  return [node, ...node.children.flatMap(flattenNode)]
}
