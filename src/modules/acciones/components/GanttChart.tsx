import { useState, useMemo, useRef } from 'react'
import { ChevronDown, ChevronRight, Plus, Pencil } from 'lucide-react'
import type { EnergyProjectPhase, EnergyProjectTask } from '../types'

// ─── Types ──────────────────────────────────────────────────────────────────

interface GanttRow {
  id: string
  type: 'phase' | 'task'
  label: string
  progress: number
  planned_start?: string
  planned_finish?: string
  actual_start?: string
  actual_finish?: string
  priority?: string
  phaseId?: string
  depth: number
}

interface Props {
  phases: EnergyProjectPhase[]
  tasks: EnergyProjectTask[]
  onAddPhase: () => void
  onAddTask: (phaseId?: string) => void
  onEditTask: (task: EnergyProjectTask) => void
  onEditPhase: (phase: EnergyProjectPhase) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_MS = 86400000

function parseDate(s?: string): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS)
}

const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const PRIORITY_COLORS: Record<string, string> = {
  low:      '#6b7280',
  medium:   '#1e40af',
  high:     '#ea580c',
  critical: '#dc2626',
  normal:   '#6b7280',
  urgent:   '#dc2626',
}

// ─── Main Gantt ───────────────────────────────────────────────────────────────

export function GanttChart({ phases, tasks, onAddPhase, onAddTask, onEditTask, onEditPhase }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const chartRef = useRef<HTMLDivElement>(null)

  // ── Determine date range ─────────────────────────────────────────────────
  const allDates = [
    ...phases.flatMap((p) => [p.planned_start, p.planned_finish, p.actual_start, p.actual_finish]),
    ...tasks.flatMap((t) => [t.planned_date, t.actual_date]),
  ].filter(Boolean).map((s) => new Date(s!))

  const today = new Date()
  const minDate = allDates.length > 0
    ? new Date(Math.min(...allDates.map((d) => d.getTime())))
    : addDays(today, -30)
  const maxDate = allDates.length > 0
    ? new Date(Math.max(...allDates.map((d) => d.getTime())))
    : addDays(today, 90)

  // Pad ±14 days
  const chartStart = addDays(minDate, -14)
  const chartEnd = addDays(maxDate, 14)
  const totalDays = daysBetween(chartStart, chartEnd)

  // ── Build flat row list ─────────────────────────────────────────────────
  const rows = useMemo<GanttRow[]>(() => {
    const result: GanttRow[] = []
    for (const phase of [...phases].sort((a, b) => a.order - b.order)) {
      result.push({
        id: phase.id, type: 'phase', label: phase.name, progress: phase.progress,
        planned_start: phase.planned_start, planned_finish: phase.planned_finish,
        actual_start: phase.actual_start, actual_finish: phase.actual_finish, depth: 0,
      })
      if (!collapsed.has(phase.id)) {
        const phaseTasks = tasks.filter((t) => t.phase_id === phase.id)
        for (const task of phaseTasks) {
          result.push({
            id: task.id, type: 'task', label: task.title, progress: task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : 0,
            planned_start: task.planned_date, planned_finish: task.planned_date,
            actual_start: task.actual_date, actual_finish: task.actual_date,
            priority: task.priority, phaseId: phase.id, depth: 1,
          })
        }
      }
    }
    // Tasks without phase
    const orphans = tasks.filter((t) => !t.phase_id)
    for (const task of orphans) {
      result.push({
        id: task.id, type: 'task', label: task.title, progress: task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : 0,
        planned_start: task.planned_date, planned_finish: task.planned_date,
        actual_start: task.actual_date, actual_finish: task.actual_date,
        priority: task.priority, depth: 0,
      })
    }
    return result
  }, [phases, tasks, collapsed])

  // ── Month headers ────────────────────────────────────────────────────────
  const monthHeaders = useMemo(() => {
    const headers: { label: string; startDay: number; widthDays: number }[] = []
    let cursor = new Date(chartStart)
    cursor.setDate(1)
    while (cursor <= chartEnd) {
      const startDay = Math.max(0, daysBetween(chartStart, cursor))
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
      const endDay = Math.min(totalDays, daysBetween(chartStart, nextMonth))
      headers.push({
        label: `${MONTH_LABELS[cursor.getMonth()]} ${cursor.getFullYear()}`,
        startDay,
        widthDays: endDay - startDay,
      })
      cursor = nextMonth
    }
    return headers
  }, [chartStart, chartEnd, totalDays])

  const todayOffset = daysBetween(chartStart, today)
  const ROW_H = 36
  const LEFT_COL_W = 220
  const DAY_W = 14

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function getPhaseForRow(row: GanttRow): EnergyProjectPhase | undefined {
    return phases.find((p) => p.id === row.id)
  }
  function getTaskForRow(row: GanttRow): EnergyProjectTask | undefined {
    return tasks.find((t) => t.id === row.id)
  }

  const chartW = totalDays * DAY_W

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-gray-50/60">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan / Gantt</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddTask()}
            className="flex items-center gap-1 text-xs text-brand-blue hover:underline cursor-pointer"
          >
            <Plus size={11} /> Tarea
          </button>
          <button
            onClick={onAddPhase}
            className="flex items-center gap-1 text-xs text-purple-600 hover:underline cursor-pointer"
          >
            <Plus size={11} /> Fase
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          Sin fases ni tareas. Crea una fase para comenzar el plan.
        </div>
      ) : (
        <div className="flex overflow-hidden">
          {/* ── Left column: task list ─────────────────────────────────── */}
          <div style={{ width: LEFT_COL_W, minWidth: LEFT_COL_W }} className="border-r border-border shrink-0">
            {/* Header */}
            <div className="h-10 flex items-center px-3 border-b border-border bg-gray-50/40">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Nombre</span>
            </div>
            {rows.map((row) => {
              const isPhase = row.type === 'phase'
              const isCollapsible = isPhase && tasks.some((t) => t.phase_id === row.id)
              const isCollapsed = collapsed.has(row.id)
              const phaseColor = PRIORITY_COLORS[row.priority || 'medium']

              return (
                <div
                  key={row.id}
                  style={{ height: ROW_H, paddingLeft: 12 + row.depth * 16 }}
                  className={`flex items-center gap-1.5 border-b border-border/40 group ${isPhase ? 'bg-gray-50/60' : 'bg-white'}`}
                >
                  {isCollapsible ? (
                    <button onClick={() => toggleCollapse(row.id)} className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0">
                      {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    </button>
                  ) : (
                    <span className="w-3 shrink-0" />
                  )}
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${isPhase ? 'bg-purple-400' : ''}`}
                    style={!isPhase ? { backgroundColor: phaseColor, opacity: 0.7 } : undefined}
                  />
                  <span className={`text-xs truncate flex-1 ${isPhase ? 'font-semibold text-gray-700' : 'text-gray-600'}`}>
                    {row.label}
                  </span>
                  <button
                    onClick={() => {
                      if (isPhase) {
                        const ph = getPhaseForRow(row); if (ph) onEditPhase(ph)
                      } else {
                        const tk = getTaskForRow(row); if (tk) onEditTask(tk)
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 cursor-pointer mr-1 shrink-0"
                  >
                    <Pencil size={10} className="text-gray-400" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* ── Right column: Gantt bars ───────────────────────────────── */}
          <div className="flex-1 overflow-x-auto" ref={chartRef}>
            <div style={{ minWidth: chartW, position: 'relative' }}>
              {/* Month header */}
              <div className="flex h-10 border-b border-border bg-gray-50/40">
                {monthHeaders.map((mh) => (
                  <div
                    key={mh.label}
                    style={{ width: mh.widthDays * DAY_W }}
                    className="border-r border-border/30 flex items-center px-2 shrink-0"
                  >
                    <span className="text-[10px] font-medium text-gray-500 whitespace-nowrap">{mh.label}</span>
                  </div>
                ))}
              </div>

              {/* Today line */}
              {todayOffset >= 0 && todayOffset <= totalDays && (
                <div
                  className="absolute top-10 bottom-0 w-px bg-red-400/60 z-10 pointer-events-none"
                  style={{ left: todayOffset * DAY_W }}
                >
                  <div className="absolute -top-1 -translate-x-1/2 text-[9px] font-bold text-red-500 bg-white px-0.5">Hoy</div>
                </div>
              )}

              {/* Grid columns (weeks) */}
              {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, wi) => (
                <div
                  key={wi}
                  className="absolute top-10 bottom-0 border-r border-dashed border-gray-100"
                  style={{ left: wi * 7 * DAY_W, width: 7 * DAY_W }}
                />
              ))}

              {/* Rows */}
              {rows.map((row) => {
                const isPhase = row.type === 'phase'
                const pStart = parseDate(row.planned_start)
                const pEnd = parseDate(row.planned_finish)
                const aStart = parseDate(row.actual_start)
                const aEnd = parseDate(row.actual_finish)

                const barColor = isPhase ? '#7c3aed' : PRIORITY_COLORS[row.priority || 'medium']

                return (
                  <div
                    key={row.id}
                    style={{ height: ROW_H, position: 'relative' }}
                    className={`border-b border-border/40 ${isPhase ? 'bg-gray-50/40' : 'bg-white'}`}
                  >
                    {/* Planned bar */}
                    {pStart && pEnd && (
                      <GanttBar
                        startDay={Math.max(0, daysBetween(chartStart, pStart))}
                        endDay={Math.min(totalDays, daysBetween(chartStart, pEnd) + 1)}
                        totalDays={totalDays}
                        dayW={DAY_W}
                        rowH={ROW_H}
                        color={barColor}
                        progress={row.progress}
                        isPlanned
                        isPhase={isPhase}
                        label={row.label}
                      />
                    )}
                    {/* Actual bar */}
                    {aStart && (
                      <GanttBar
                        startDay={Math.max(0, daysBetween(chartStart, aStart))}
                        endDay={Math.min(totalDays, daysBetween(chartStart, aEnd || aStart) + 1)}
                        totalDays={totalDays}
                        dayW={DAY_W}
                        rowH={ROW_H}
                        color={barColor}
                        progress={row.progress}
                        isPlanned={false}
                        isPhase={isPhase}
                        label=""
                      />
                    )}
                    {/* No dates placeholder */}
                    {!pStart && !aStart && (
                      <div className="absolute inset-0 flex items-center">
                        <span className="text-[10px] text-gray-300 ml-4">Sin fechas</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 px-4 py-2 border-t border-border bg-gray-50/40 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-8 h-3 rounded bg-purple-200 opacity-80 inline-block" />Fase planeada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-8 h-2 rounded bg-brand-blue/30 border border-brand-blue/40 inline-block" />Tarea planeada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-8 h-1.5 rounded bg-emerald-400 inline-block" />Real
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-px h-3 bg-red-400 inline-block" />Hoy
        </span>
      </div>
    </div>
  )
}

// ─── Gantt Bar ────────────────────────────────────────────────────────────────

interface BarProps {
  startDay: number; endDay: number; totalDays: number; dayW: number
  rowH: number; color: string; progress: number
  isPlanned: boolean; isPhase: boolean; label: string
}

function GanttBar({ startDay, endDay, dayW, rowH, color, progress, isPlanned, isPhase, label }: BarProps) {
  if (endDay <= startDay) return null
  const left = startDay * dayW
  const width = Math.max(4, (endDay - startDay) * dayW)
  const barH = isPhase ? (isPlanned ? 16 : 8) : (isPlanned ? 12 : 6)
  const top = Math.floor((rowH - barH) / 2) + (isPlanned ? -1 : 4)

  return (
    <div
      className="absolute rounded overflow-hidden"
      style={{
        left, width, height: barH, top,
        backgroundColor: isPlanned
          ? (isPhase ? `${color}33` : `${color}25`)
          : `${color}99`,
        border: `1.5px solid ${color}${isPlanned ? '88' : 'dd'}`,
      }}
      title={label || undefined}
    >
      {/* Progress fill */}
      {isPlanned && progress > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 rounded"
          style={{ width: `${progress}%`, backgroundColor: `${color}99` }}
        />
      )}
      {/* Label inside bar (only planned, wide enough) */}
      {isPlanned && label && width > 60 && (
        <span className="absolute left-1.5 top-0 bottom-0 flex items-center text-[9px] font-medium truncate"
          style={{ color, maxWidth: width - 8 }}>
          {label}
        </span>
      )}
    </div>
  )
}
