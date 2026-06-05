// ExplorerHome — focus-first energy explorer.
//
// Level 0 (grid): site-level blocks as cards.
// Level 1 (focus): clicked block takes full width; siblings shrink to a strip.
// Level 2+ (tree): children shown as an expandable tree list — full names,
//   no truncation, consumption inline, floating detail modal per item.

import { useCallback, useEffect, useState } from 'react'
import {
  Building2, Box, Zap, Flame, Wind, Droplets, Gauge,
  BarChart2, ExternalLink, Plus, Layers, X, Info,
  ChevronDown, ChevronRight, Pencil,
} from 'lucide-react'
import { getUtilityLabel } from '@/shared/OperationalContext'
import { EmptyState } from '@/shared/EmptyState'
import {
  loadExplorerModel,
  type ExplorerModel, type ExplorerBlock, type UtilitySummary,
} from '@/services/explorer-engine/loadExplorer'
import { fetchMonthlyTrend, type MonthlyPoint } from '@/services/explorer-engine/monthlyTrend'
import { loadFlowLinks, type FlowLink } from '@/services/explorer-engine/flowLinks'
import { Sparkline } from './Sparkline'
import { TrendPanel } from './TrendPanel'
import { FlowEditor } from './FlowEditor'

// ── Types ─────────────────────────────────────────────────────────────────────
interface DiagramMeta {
  id: string; name: string; utility_type: string | null; status: string
  scope_type?: string | null; scope_id?: string | null
}
interface Props {
  siteId: string; siteName: string; diagrams: DiagramMeta[]
  onOpenDiagram: (d: DiagramMeta) => void
  onCreateDiagramForScope: (scopeId: string, scopeName: string, utility?: string | null) => void
  onCreateNew: () => void
}

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
const Q_DOT: Record<string, string> = {
  good: 'bg-emerald-500', delayed: 'bg-amber-400', missing: 'bg-rose-400', none: 'bg-slate-300',
}
const Q_LABEL: Record<string, string> = {
  good: 'Actualizado', delayed: 'Con retraso', missing: 'Sin datos recientes', none: 'Sin medidor',
}
function fmt(v: number | null, unit: string): string {
  if (v == null) return '—'
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} M${unit}`
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)} k${unit}`
  return `${Math.round(v)} ${unit}`
}

// ── Mini coverage strip (horizontal, no label, just bar + %) ─────────────────
function MiniCoverage({ coverage }: { coverage: number | null }) {
  if (coverage == null) return null
  const pct = Math.round(coverage * 100)
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[9px] font-bold tabular-nums" style={{ color }}>{pct}%</span>
    </div>
  )
}

// ── Floating detail modal (equipment / sub-area quick view) ───────────────────
function DetailModal({ block, sparklines, onTrend, onClose }: {
  block: ExplorerBlock
  sparklines: Map<string, MonthlyPoint[]>
  onTrend: (b: ExplorerBlock) => void
  onClose: () => void
}) {
  const primary = block.utilities[0] ?? null
  const m = primary ? umeta(primary.utility) : umeta('')
  const Icon = block.kind === 'area' ? Building2 : Box
  const primaryMpId = primary ? block.boundaryMpIds[primary.utility] : null
  const sparkPoints = primaryMpId ? (sparklines.get(primaryMpId) ?? []) : []
  const sparkValues = sparkPoints.map(p => p.value)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Color accent */}
        <div className="h-1 w-full" style={{ background: m.color }} />

        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            style={{ background: m.soft, color: m.color }}>
            <Icon size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900 leading-snug">{block.name}</p>
            {block.code && (
              <p className="mt-0.5 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                {block.code}
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={15} />
          </button>
        </div>

        {/* Metrics */}
        <div className="px-5 pb-4 space-y-3">
          {block.utilities.map(u => {
            const um = umeta(u.utility)
            const pct = u.coverage != null ? Math.round(u.coverage * 100) : null
            const coverColor = pct != null ? (pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444') : '#94a3b8'
            return (
              <div key={u.utility} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <um.icon size={13} style={{ color: um.color, flexShrink: 0 }} />
                  <span className="text-[10px] font-semibold text-slate-500">{getUtilityLabel(u.utility)}</span>
                  <span className={`ml-auto h-2 w-2 rounded-full ${Q_DOT[u.quality] ?? 'bg-slate-300'}`} title={Q_LABEL[u.quality] ?? ''} />
                  <span className="text-[9px] text-slate-400">{Q_LABEL[u.quality] ?? ''}</span>
                </div>
                <p className="text-xl font-black" style={{ color: um.color }}>{fmt(u.value, u.unit)}</p>
                {pct != null && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                      <span>Cobertura de medición</span>
                      <span style={{ color: coverColor }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: coverColor }} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Sparkline trend */}
          {sparkValues.length >= 3 && (
            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Tendencia — últimos 12 meses
              </p>
              <Sparkline data={sparkValues} color={m.color} softColor={m.soft} width={360} height={48} />
            </div>
          )}

          {/* Info row: sub-areas / equipment count */}
          {block.hasChildren && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <Building2 size={12} className="text-slate-400" />
              <p className="text-[11px] text-slate-500">
                Contiene <strong>{block.childCount}</strong>&nbsp;
                {block.utilities[0]?.utility ? getUtilityLabel(block.utilities[0].utility) : ''} sub-elemento{block.childCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 border-t border-slate-100 px-5 py-3">
          <button onClick={() => { onTrend(block); onClose() }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <BarChart2 size={13} /> Ver tendencia completa
          </button>
          <button onClick={() => { onClose() }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <ExternalLink size={13} /> Diagrama técnico
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tree list row — level 2 (direct child of focused block) ──────────────────
// Full width, no truncation, expandable to reveal grandchildren
function ChildTreeRow({ block, isExpanded, onToggle, model, sparklines, focusUtility, onDetail, isLast }: {
  block: ExplorerBlock
  isExpanded: boolean
  onToggle: () => void
  model: ExplorerModel
  sparklines: Map<string, MonthlyPoint[]>
  focusUtility: string | null
  onDetail: (b: ExplorerBlock) => void
  isLast: boolean
}) {
  const shown = focusUtility
    ? block.utilities.filter(u => u.utility === focusUtility)
    : block.utilities
  const primary = shown[0] ?? block.utilities[0] ?? null
  if (focusUtility && !primary) return null
  const m = primary ? umeta(primary.utility) : umeta('')
  const childLevel = model.levels.get(block.id)
  const grandchildren = isExpanded ? (childLevel?.blocks ?? []) : []

  return (
    <div className={`${!isLast ? 'border-b border-slate-100' : ''}`}>
      {/* ─ Row ─────────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 px-5 py-3 transition-colors ${
        isExpanded ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'
      }`}>

        {/* Expand toggle */}
        {block.hasChildren ? (
          <button onClick={onToggle}
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg transition-colors ${
              isExpanded ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}>
            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
        ) : (
          <div className="w-6 shrink-0" />
        )}

        {/* Icon */}
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
          style={{ background: m.soft, color: m.color }}>
          <Building2 size={13} />
        </span>

        {/* Name + code — no truncation, grows to fill */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-slate-900">{block.name}</span>
          {block.code && (
            <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-500 align-middle">
              {block.code}
            </span>
          )}
          {block.hasChildren && (
            <span className="ml-2 text-[10px] text-slate-400 align-middle">
              · {block.childCount} {childLevel?.blockKind === 'equipment' ? 'equipo' : 'sub-área'}{block.childCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Primary metric */}
        {primary && (
          <span className="shrink-0 text-sm font-black tabular-nums" style={{ color: m.color }}>
            {fmt(primary.value, primary.unit)}
          </span>
        )}

        {/* Coverage strip */}
        {primary && <MiniCoverage coverage={primary.coverage} />}

        {/* Quality dot */}
        {primary && (
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${Q_DOT[primary.quality] ?? 'bg-slate-300'}`}
            title={Q_LABEL[primary.quality] ?? ''} />
        )}

        {/* Detail button */}
        <button onClick={() => onDetail(block)}
          className="shrink-0 flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:border-brand-blue hover:text-brand-blue hover:bg-blue-50 transition-colors ml-1">
          <Info size={11} /> Ver
        </button>
      </div>

      {/* ─ Grandchildren tree ───────────────────────────────────────── */}
      {isExpanded && grandchildren.length > 0 && (
        <div className="bg-slate-50/80 border-t border-blue-100">
          {grandchildren.map((gc, i) => (
            <GrandchildRow
              key={gc.id}
              block={gc}
              sparklines={sparklines}
              focusUtility={focusUtility}
              onDetail={onDetail}
              isLast={i === grandchildren.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tree list row — level 3 (leaf: equipment or deepest area) ────────────────
function GrandchildRow({ block, sparklines, focusUtility, onDetail, isLast }: {
  block: ExplorerBlock
  sparklines: Map<string, MonthlyPoint[]>
  focusUtility: string | null
  onDetail: (b: ExplorerBlock) => void
  isLast: boolean
}) {
  const shown = focusUtility
    ? block.utilities.filter(u => u.utility === focusUtility)
    : block.utilities
  const primary = shown[0] ?? block.utilities[0] ?? null
  if (focusUtility && !primary) return null
  const m = primary ? umeta(primary.utility) : umeta('')
  const primaryMpId = primary ? block.boundaryMpIds[primary.utility] : null
  const sparkValues = primaryMpId ? (sparklines.get(primaryMpId) ?? []).map(p => p.value) : []

  return (
    <div className={`flex items-center gap-3 px-5 py-2.5 hover:bg-white/80 transition-colors ${
      !isLast ? 'border-b border-slate-100/70' : ''
    }`}>
      {/* Tree indent line */}
      <div className="w-6 shrink-0 flex items-center justify-center">
        <span className="text-slate-300 text-xs font-light select-none">
          {isLast ? '└' : '├'}
        </span>
      </div>

      {/* Icon (smaller) */}
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
        style={{ background: m.soft, color: m.color }}>
        <Box size={11} />
      </span>

      {/* TAG monospace — prominent for engineers */}
      {block.code && (
        <span className="shrink-0 rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold text-white tracking-wide">
          {block.code}
        </span>
      )}

      {/* Name — full, no truncation */}
      <span className="flex-1 text-sm text-slate-700 font-medium min-w-0">
        {block.name}
      </span>

      {/* Sparkline inline (tiny) */}
      {sparkValues.length >= 3 && (
        <Sparkline data={sparkValues} color={m.color} softColor={m.soft} width={52} height={18} />
      )}

      {/* Metric */}
      {primary && (
        <span className="shrink-0 text-sm font-black tabular-nums" style={{ color: m.color }}>
          {fmt(primary.value, primary.unit)}
        </span>
      )}

      {/* Quality dot */}
      {primary && (
        <span className={`h-2 w-2 shrink-0 rounded-full ${Q_DOT[primary.quality] ?? 'bg-slate-300'}`}
          title={Q_LABEL[primary.quality] ?? ''} />
      )}

      {/* Detail button */}
      <button onClick={() => onDetail(block)}
        className="shrink-0 flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-bold text-slate-400 hover:border-brand-blue hover:text-brand-blue hover:bg-blue-50 transition-colors">
        <Info size={9} /> Ver
      </button>
    </div>
  )
}

// ── Sibling chip ──────────────────────────────────────────────────────────────
function SiblingChip({ block, focusUtility, onClick }: {
  block: ExplorerBlock; focusUtility: string | null; onClick: () => void
}) {
  const shown = focusUtility
    ? block.utilities.filter(u => u.utility === focusUtility)
    : block.utilities
  const primary = shown[0] ?? block.utilities[0] ?? null
  const m = primary ? umeta(primary.utility) : umeta('')
  const Icon = block.kind === 'area' ? Building2 : Box
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm hover:border-brand-blue hover:shadow-md transition-all shrink-0">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: m.soft, color: m.color }}>
        <Icon size={13} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-black text-slate-800 whitespace-nowrap max-w-[110px] overflow-hidden text-ellipsis">{block.name}</p>
        {primary && <p className="text-[10px] font-bold" style={{ color: m.color }}>{fmt(primary.value, primary.unit)}</p>}
      </div>
      {primary && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${Q_DOT[primary.quality] ?? 'bg-slate-300'}`} />}
    </button>
  )
}

// ── Flow link chip (shown in "Recibe de" / "Distribuye a" strips) ─────────────
function FlowChip({ link, onFocus }: {
  link: FlowLink; onFocus: (id: string) => void
}) {
  const m = umeta(link.utility)
  const Icon = m.icon
  const name = link.fromType === 'external'
    ? `◉ ${link.fromName}`
    : (link.fromAreaName ?? '?')
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold shrink-0 transition-opacity"
      style={{ borderColor: `${m.color}44`, background: m.soft, color: m.color }}>
      <Icon size={9} />
      {link.fromType === 'area' ? (
        <button onClick={() => onFocus(link.fromAreaId!)} className="hover:underline">{name}</button>
      ) : (
        <span>{name}</span>
      )}
    </span>
  )
}

function DistributeChip({ utility, areaName, areaId, onFocus }: {
  utility: string; areaName: string; areaId: string; onFocus: (id: string) => void
}) {
  const m = umeta(utility)
  const Icon = m.icon
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold shrink-0"
      style={{ borderColor: `${m.color}44`, background: m.soft, color: m.color }}>
      <Icon size={9} />
      <button onClick={() => onFocus(areaId)} className="hover:underline">{areaName}</button>
    </span>
  )
}

// ── Focused view ──────────────────────────────────────────────────────────────
function FocusedView({ block, siblings, model, focusUtility, sparklines, expandedInFocus, onToggleInFocus,
  onFocusSibling, onExit, onTrend, onDiagram, onDetail, flowLinks, onOpenEditor }: {
  block: ExplorerBlock; siblings: ExplorerBlock[]
  model: ExplorerModel; focusUtility: string | null
  sparklines: Map<string, MonthlyPoint[]>
  expandedInFocus: Set<string>; onToggleInFocus: (id: string) => void
  onFocusSibling: (id: string) => void; onExit: () => void
  onTrend: (b: ExplorerBlock) => void; onDiagram: (b: ExplorerBlock) => void
  onDetail: (b: ExplorerBlock) => void
  flowLinks: FlowLink[]; onOpenEditor: (block: ExplorerBlock) => void
}) {
  const shown = focusUtility
    ? block.utilities.filter(u => u.utility === focusUtility)
    : block.utilities
  const m = (shown[0] ?? block.utilities[0]) ? umeta((shown[0] ?? block.utilities[0]).utility) : umeta('')
  const childLevel = model.levels.get(block.id)
  const children = childLevel?.blocks ?? []

  // Flow data for this block
  const linksIn = flowLinks.filter(l => l.toAreaId === block.id)
  const linksOut = flowLinks.filter(l => l.fromAreaId === block.id)

  // Reverse-lookup area names for outgoing links
  const allAreaBlocks = Array.from(model.levels.values()).flatMap(lv => lv.blocks)
  function areaName(id: string): string {
    return allAreaBlocks.find(b => b.id === id)?.name ?? id.slice(0, 8)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Sibling strip ── */}
      {siblings.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={onExit}
            className="shrink-0 flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-500 hover:border-brand-blue hover:text-brand-blue shadow-sm transition-all">
            <X size={11} /> Salir
          </button>
          <div className="h-px w-4 bg-slate-200 shrink-0" />
          {siblings.map(s => (
            <SiblingChip key={s.id} block={s} focusUtility={focusUtility} onClick={() => onFocusSibling(s.id)} />
          ))}
        </div>
      )}

      {/* ── Main card ── */}
      <div className="rounded-2xl border-2 border-blue-200 bg-white shadow-lg overflow-hidden">

        {/* ── Header: ultra thin single row ── */}
        <div className="h-0.5 w-full" style={{ background: m.color }} />
        <div className="flex items-center gap-2 px-4 py-2 flex-wrap border-b border-slate-100">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg" style={{ background: m.soft, color: m.color }}>
            <Building2 size={13} />
          </span>
          <p className="text-xs font-black text-slate-900 shrink-0">{block.name}</p>
          {block.code && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-400">{block.code}</span>
          )}
          <span className="text-[9px] text-slate-300 shrink-0">·</span>
          <span className="text-[9px] text-slate-400 shrink-0">
            {block.childCount}&nbsp;{childLevel?.blockKind === 'equipment' ? 'equipo' : 'sub-área'}{block.childCount !== 1 ? 's' : ''}
          </span>
          {/* Metric pills */}
          {shown.map(u => {
            const um = umeta(u.utility)
            return (
              <span key={u.utility}
                className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-black shrink-0"
                style={{ background: um.soft, color: um.color }}>
                <um.icon size={8} />
                {fmt(u.value, u.unit)}
                {u.coverage != null && <span className="opacity-60 ml-0.5">{Math.round(u.coverage * 100)}%</span>}
                <span className={`h-1.5 w-1.5 rounded-full ml-0.5 ${Q_DOT[u.quality] ?? 'bg-slate-300'}`} />
              </span>
            )
          })}
          <div className="flex items-center gap-1 ml-auto shrink-0">
            <button onClick={() => onTrend(block)} title="Tendencia"
              className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">
              <BarChart2 size={11} />
            </button>
            <button onClick={() => onDiagram(block)} title="Diagrama técnico"
              className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">
              <ExternalLink size={11} />
            </button>
            <button onClick={onExit}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:bg-slate-50 transition-colors">
              <X size={10} /> Colapsar
            </button>
          </div>
        </div>

        {/* ── Recibe de strip ── */}
        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50/80 border-b border-slate-100 flex-wrap">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0">Recibe</span>
          {linksIn.length === 0 ? (
            <span className="text-[9px] text-slate-300 italic">sin fuentes definidas</span>
          ) : (
            linksIn.map(link => (
              <FlowChip key={link.id} link={link}
                onFocus={(id) => { onFocusSibling(id) }} />
            ))
          )}
          <button onClick={() => onOpenEditor(block)}
            className="ml-auto flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold text-slate-500 hover:border-brand-blue hover:text-brand-blue transition-colors shrink-0">
            <Pencil size={9} /> Editar flujos
          </button>
        </div>

        {/* ── Distribuye a strip (only if this area distributes) ── */}
        {linksOut.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50/40 border-b border-slate-100 flex-wrap">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0">Distribuye</span>
            {linksOut.map(link => (
              <DistributeChip key={link.id}
                utility={link.utility}
                areaName={areaName(link.toAreaId)}
                areaId={link.toAreaId}
                onFocus={(id) => {
                  const sibling = siblings.find(s => s.id === id)
                  if (sibling) onFocusSibling(id)
                }}
              />
            ))}
          </div>
        )}

        {/* ── Children as expandable tree list ── */}
        <div>
          {children.length === 0 ? (
            <p className="px-6 py-4 text-sm text-slate-400">Sin contenido registrado.</p>
          ) : (
            children.map((child, i) => (
              <ChildTreeRow
                key={child.id}
                block={child}
                isExpanded={expandedInFocus.has(child.id)}
                onToggle={() => onToggleInFocus(child.id)}
                model={model}
                sparklines={sparklines}
                focusUtility={focusUtility}
                onDetail={onDetail}
                isLast={i === children.length - 1}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Grid card (level 0, default view) ─────────────────────────────────────────
function GridCard({ block, focusUtility, sparklines, onFocus, onTrend, onDiagram }: {
  block: ExplorerBlock; focusUtility: string | null
  sparklines: Map<string, MonthlyPoint[]>
  onFocus: () => void; onTrend: (b: ExplorerBlock) => void; onDiagram: (b: ExplorerBlock) => void
}) {
  const shown = focusUtility ? block.utilities.filter(u => u.utility === focusUtility) : block.utilities
  const primary = shown[0] ?? block.utilities[0] ?? null
  if (focusUtility && !primary) return null
  const m = primary ? umeta(primary.utility) : umeta('')
  const Icon = block.kind === 'area' ? (block.hasChildren ? Building2 : Box) : Box
  const primaryMpId = primary ? block.boundaryMpIds[primary.utility] : null
  const sparkValues = primaryMpId ? (sparklines.get(primaryMpId) ?? []).map(p => p.value) : []

  return (
    <div onClick={block.hasChildren ? onFocus : undefined}
      className={`flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all
        ${block.hasChildren ? 'cursor-pointer hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md' : ''}`}>
      <div className="h-1 w-full" style={{ background: m.color }} />
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: m.soft, color: m.color }}>
            <Icon size={17} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900">{block.name}</p>
            <p className="text-[10px] font-semibold text-slate-400">
              {block.code ? `${block.code} · ` : ''}
              {block.kind === 'area' ? (block.hasChildren ? `${block.childCount} sub-área${block.childCount !== 1 ? 's' : ''}` : 'Equipos') : (block.equipmentType ?? 'Equipo')}
            </p>
          </div>
          {block.hasChildren && <span className="text-[10px] font-black text-slate-300 mt-0.5">→</span>}
        </div>
        {primary && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-2" style={{ background: m.soft }}>
            <m.icon size={14} style={{ color: m.color, flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black" style={{ color: m.color }}>{fmt(primary.value, primary.unit)}</p>
              <p className="text-[10px] font-semibold text-slate-500">{getUtilityLabel(primary.utility)}</p>
            </div>
            <span className={`h-2 w-2 shrink-0 rounded-full ${Q_DOT[primary.quality] ?? 'bg-slate-300'}`} />
          </div>
        )}
        {primary?.coverage != null && (
          <div className="mb-1">
            <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
              <span>Cobertura</span>
              <span>{Math.round(primary.coverage * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{
                width: `${Math.round(primary.coverage * 100)}%`,
                background: primary.coverage >= 0.8 ? '#10b981' : primary.coverage >= 0.5 ? '#f59e0b' : '#ef4444',
              }} />
            </div>
          </div>
        )}
        {!focusUtility && shown.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {shown.slice(1, 4).map(u => {
              const um = umeta(u.utility)
              return (
                <span key={u.utility} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ background: um.soft, color: um.color }}>
                  {getUtilityLabel(u.utility)} · {fmt(u.value, u.unit)}
                </span>
              )
            })}
          </div>
        )}
        {sparkValues.length >= 2 && (
          <div className="mt-3"><Sparkline data={sparkValues} color={m.color} softColor={m.soft} /></div>
        )}
        <div className="flex items-center gap-1 mt-auto pt-3 border-t border-slate-100" onClick={e => e.stopPropagation()}>
          <button onClick={() => onTrend(block)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <BarChart2 size={11} /> Tendencia
          </button>
          <button onClick={() => onDiagram(block)}
            className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <ExternalLink size={11} /> Diagrama
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Inflow chip ───────────────────────────────────────────────────────────────
function InflowChip({ s }: { s: UtilitySummary }) {
  const m = umeta(s.utility)
  const Icon = m.icon
  return (
    <div className="flex items-center gap-2 rounded-xl border px-3 py-2"
      style={{ borderColor: `${m.color}33`, background: m.soft }}>
      <Icon size={16} style={{ color: m.color, flexShrink: 0 }} />
      <div>
        <p className="text-sm font-black leading-tight" style={{ color: m.color }}>{fmt(s.value, s.unit)}</p>
        <p className="text-[10px] font-semibold text-slate-500">{getUtilityLabel(s.utility)}</p>
      </div>
      <span className={`ml-1 h-1.5 w-1.5 shrink-0 rounded-full ${Q_DOT[s.quality] ?? 'bg-slate-300'}`} />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function ExplorerHome({ siteId, siteName, diagrams, onOpenDiagram, onCreateDiagramForScope, onCreateNew }: Props) {
  const [model, setModel] = useState<ExplorerModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [expandedInFocus, setExpandedInFocus] = useState<Set<string>>(new Set())
  const [focusUtility, setFocusUtility] = useState<string | null>(null)
  const [trendBlock, setTrendBlock] = useState<ExplorerBlock | null>(null)
  const [detailBlock, setDetailBlock] = useState<ExplorerBlock | null>(null)
  const [sparklines, setSparklines] = useState<Map<string, MonthlyPoint[]>>(new Map())
  const [flowLinks, setFlowLinks] = useState<FlowLink[]>([])
  const [editorBlock, setEditorBlock] = useState<ExplorerBlock | null>(null)

  useEffect(() => {
    if (!siteId) { setModel(null); setFlowLinks([]); return }
    let cancelled = false
    setLoading(true)
    Promise.all([
      loadExplorerModel(siteId, siteName),
      loadFlowLinks(siteId),
    ]).then(([m, links]) => {
      if (!cancelled) {
        setModel(m)
        setFlowLinks(links)
        setFocusedId(null); setExpandedInFocus(new Set()); setFocusUtility(null)
      }
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [siteId, siteName])

  useEffect(() => {
    if (!model) return
    const allMpIds = new Set<string>()
    for (const level of model.levels.values())
      for (const block of level.blocks)
        Object.values(block.boundaryMpIds).forEach(id => allMpIds.add(id))
    if (allMpIds.size) fetchMonthlyTrend(Array.from(allMpIds), 12).then(setSparklines)
  }, [model])

  const openDiagramForBlock = useCallback((block: ExplorerBlock) => {
    const diag = diagrams.find(d => d.scope_id === block.id)
    if (diag) onOpenDiagram(diag)
    else onCreateDiagramForScope(block.id, block.name, block.primaryUtility)
  }, [diagrams, onOpenDiagram, onCreateDiagramForScope])

  const toggleInFocus = useCallback((id: string) => {
    setExpandedInFocus(prev => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
    })
  }, [])

  const siteLevel = model?.levels.get('site')
  const focusedBlock = focusedId ? siteLevel?.blocks.find(b => b.id === focusedId) ?? null : null
  const siblings = focusedId ? (siteLevel?.blocks.filter(b => b.id !== focusedId) ?? []) : []

  if (!siteId) {
    return (
      <div className="grid h-full place-items-center p-6">
        <EmptyState icon={<Layers size={44} strokeWidth={1.5} />} title="Selecciona una planta"
          description="Elige una sede para explorar el flujo de energía." />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-[#F4F7FB]">
      {/* ── Top bar ── */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Red energética</p>
            <h1 className="text-base font-black text-slate-900">{siteName}</h1>
          </div>
          <div className="flex items-center gap-2">
            {model && model.utilities.length > 0 && (
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button onClick={() => setFocusUtility(null)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-black transition-colors ${
                    !focusUtility ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'
                  }`}>Todas</button>
                {model.utilities.map(u => {
                  const m = umeta(u); const Icon = m.icon; const active = focusUtility === u
                  return (
                    <button key={u} onClick={() => setFocusUtility(active ? null : u)} title={getUtilityLabel(u)}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-all ${active ? 'shadow-sm' : 'opacity-50 hover:opacity-100'}`}
                      style={active ? { background: m.soft, color: m.color } : { color: '#64748b' }}>
                      <Icon size={12} />
                    </button>
                  )
                })}
              </div>
            )}
            <button onClick={onCreateNew}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white hover:bg-slate-800 transition-colors">
              <Plus size={12} /> Nuevo diagrama
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="grid h-40 place-items-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
          </div>
        ) : !model || !siteLevel ? (
          <EmptyState icon={<Building2 size={44} strokeWidth={1.5} />} title="Sin datos"
            description="Esta planta no tiene áreas ni equipos registrados." />
        ) : focusedBlock ? (
          <FocusedView
            block={focusedBlock} siblings={siblings} model={model}
            focusUtility={focusUtility} sparklines={sparklines}
            expandedInFocus={expandedInFocus} onToggleInFocus={toggleInFocus}
            onFocusSibling={(id) => { setFocusedId(id); setExpandedInFocus(new Set()) }}
            onExit={() => { setFocusedId(null); setExpandedInFocus(new Set()) }}
            onTrend={setTrendBlock} onDiagram={openDiagramForBlock} onDetail={setDetailBlock}
            flowLinks={flowLinks} onOpenEditor={setEditorBlock}
          />
        ) : (
          <>
            {siteLevel.inflows.length > 0 && (
              <div className="mb-6">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Entra a la planta · último mes
                </p>
                <div className="flex flex-wrap gap-2">
                  {(focusUtility ? siteLevel.inflows.filter(s => s.utility === focusUtility) : siteLevel.inflows)
                    .map(s => <InflowChip key={s.utility} s={s} />)}
                </div>
              </div>
            )}
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {siteLevel.blockKind === 'equipment' ? 'Equipos' : 'Áreas y sistemas · click para enfocar'}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={{ alignItems: 'start' }}>
              {siteLevel.blocks.map(block => (
                <GridCard key={block.id} block={block} focusUtility={focusUtility} sparklines={sparklines}
                  onFocus={() => { setFocusedId(block.id); setExpandedInFocus(new Set()) }}
                  onTrend={setTrendBlock} onDiagram={openDiagramForBlock} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Detail floating modal */}
      {detailBlock && (
        <DetailModal block={detailBlock} sparklines={sparklines}
          onTrend={setTrendBlock} onClose={() => setDetailBlock(null)} />
      )}

      {/* Trend side panel */}
      {trendBlock && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setTrendBlock(null)} />
          <TrendPanel block={trendBlock} onClose={() => setTrendBlock(null)} />
        </>
      )}

      {/* Flow editor side panel */}
      {editorBlock && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setEditorBlock(null)} />
          <FlowEditor
            siteId={siteId}
            areaId={editorBlock.id}
            areaName={editorBlock.name}
            allLinks={flowLinks}
            onLinksChanged={setFlowLinks}
            onFocusArea={(id) => {
              setFocusedId(id)
              setExpandedInFocus(new Set())
              setEditorBlock(null)
            }}
            onClose={() => setEditorBlock(null)}
          />
        </>
      )}
    </div>
  )
}
