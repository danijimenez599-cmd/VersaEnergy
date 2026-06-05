// ── Explorer Engine ───────────────────────────────────────────────────────────
// Construye el modelo del "Explorador" (drill-down estilo Power BI):
//   Planta → Naves/Salas → Áreas → Equipos.
// Para cada scope calcula, por utility, el consumo del último periodo (~1 mes)
// y la cobertura de medición (medido vs frontera) al estilo del plan E6 §6:
//   frontera = medidor de área (target_type='area') o suma bottom-up de equipos
//   submedido = suma de medidores hijos (sub-áreas o equipos)
//   cobertura = submedido / frontera
//
// Lee SOLO el modelo ya existente y sembrado: energy_areas, energy_equipment,
// measurement_points, measurement_readings. No requiere migración nueva.

import { supabase } from '@/services/supabase'

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type CoverageQuality = 'good' | 'delayed' | 'missing' | 'none'

export interface UtilitySummary {
  utility: string
  /** Consumo del último periodo (~1 mes), en la unidad del medidor. */
  value: number | null
  unit: string
  /** Total que entra/cruza la frontera del scope. */
  boundary: number | null
  /** Suma de lo medido aguas abajo (sub-áreas o equipos). */
  submetered: number | null
  /** submetered / boundary, 0..1. null si no hay frontera. */
  coverage: number | null
  /** Residual = boundary - submetered (lo no explicado por submedición). */
  residual: number | null
  quality: CoverageQuality
}

export interface ExplorerBlock {
  id: string
  kind: 'area' | 'equipment'
  name: string
  code: string | null
  description: string | null
  equipmentType: string | null
  hasChildren: boolean
  childCount: number
  utilities: UtilitySummary[]
  primaryUtility: string | null
  /** utility → mp_id of the boundary/area measurement point — for sparklines */
  boundaryMpIds: Record<string, string>
}

export interface ExplorerLevel {
  scopeId: string // 'site' o uuid de área
  scopeName: string
  scopeCode: string | null
  /** Lo que entra/se consume en este scope, por utility (chips de cabecera). */
  inflows: UtilitySummary[]
  /** Bloques hijos clicables (sub-áreas) o equipos hoja. */
  blocks: ExplorerBlock[]
  /** Tipo de los bloques: si son áreas se puede drillear; si son equipos, no. */
  blockKind: 'area' | 'equipment' | 'empty'
}

export interface ExplorerModel {
  siteId: string
  siteName: string
  rootId: 'site'
  levels: Map<string, ExplorerLevel>
  /** Lista de utilities presentes en toda la planta (para el ribbon). */
  utilities: string[]
}

// ── Filas crudas ────────────────────────────────────────────────────────────

interface AreaRow {
  id: string
  name: string
  code: string | null
  description: string | null
  parent_area_id: string | null
}
interface EquipmentRow {
  id: string
  tag: string
  name: string
  equipment_type: string
  utility_type: string
  area_id: string | null
}
interface MpRow {
  id: string
  tag: string
  target_type: string
  target_id: string
  utility: string
  unit: string
}
interface ReadingRow {
  measurement_point_id: string
  value: number
  recorded_at: string
}
interface GroupRow {
  id: string
  utility_type: string | null
  properties: unknown
}
interface BindingRow {
  energy_group_id: string | null
  measurement_point_id: string | null
  role: string
}

const PERIOD_WINDOW_DAYS = 120
const DELTA_MIN_DAYS = 20

// ── Helpers ─────────────────────────────────────────────────────────────────

function calcQuality(latestTs: string | null): CoverageQuality {
  if (!latestTs) return 'missing'
  const ageH = (Date.now() - new Date(latestTs).getTime()) / 3_600_000
  if (ageH < 36) return 'good'
  if (ageH < 24 * 45) return 'delayed'
  return 'missing'
}

/** Consumo del periodo = última lectura − lectura ~1 mes antes (acumuladores). */
function periodConsumption(readings: ReadingRow[] | undefined): { value: number | null; latestTs: string | null } {
  if (!readings || readings.length === 0) return { value: null, latestTs: null }
  // readings vienen ordenadas desc por recorded_at
  const latest = readings[0]
  const latestMs = new Date(latest.recorded_at).getTime()
  const minGapMs = DELTA_MIN_DAYS * 86_400_000
  let prev: ReadingRow | null = null
  for (let i = 1; i < readings.length; i++) {
    if (latestMs - new Date(readings[i].recorded_at).getTime() >= minGapMs) {
      prev = readings[i]
      break
    }
  }
  if (!prev) prev = readings[readings.length - 1]
  if (prev === latest) return { value: null, latestTs: latest.recorded_at }
  const delta = Number(latest.value) - Number(prev.value)
  return { value: delta > 0 ? delta : 0, latestTs: latest.recorded_at }
}

// ── Carga principal ─────────────────────────────────────────────────────────

export async function loadExplorerModel(siteId: string, siteName = 'Planta'): Promise<ExplorerModel | null> {
  if (!siteId) return null

  const cutoff = new Date(Date.now() - PERIOD_WINDOW_DAYS * 86_400_000).toISOString()

  const [{ data: areaData }, { data: equipData }, { data: mpData }, { data: groupData }, { data: bindingData }] =
    await Promise.all([
      supabase
        .from('energy_areas')
        .select('id, name, code, description, parent_area_id')
        .eq('site_id', siteId)
        .eq('is_active', true),
      supabase
        .from('energy_equipment')
        .select('id, tag, name, equipment_type, utility_type, area_id')
        .eq('site_id', siteId)
        .eq('status', 'active'),
      supabase
        .from('measurement_points')
        .select('id, tag, target_type, target_id, utility, unit')
        .eq('site_id', siteId)
        .eq('is_active', true),
      supabase
        .from('energy_groups')
        .select('id, utility_type, properties')
        .eq('site_id', siteId)
        .eq('active', true),
      supabase
        .from('energy_measurement_bindings')
        .select('energy_group_id, measurement_point_id, role')
        .eq('site_id', siteId)
        .eq('binding_type', 'energy_group')
        .eq('active', true),
    ])

  const areas = (areaData ?? []) as AreaRow[]
  const equipment = (equipData ?? []) as EquipmentRow[]
  const mps = (mpData ?? []) as MpRow[]
  const groups = (groupData ?? []) as GroupRow[]
  const bindings = (bindingData ?? []) as BindingRow[]

  // Frontera de PLANTA por utility (§6 a escala sitio): si existe un grupo Energy
  // con scope=site y un binding boundary, ese medidor es la entrada real de la
  // planta (ej. acometida CFE) — evita doble conteo al sumar áreas.
  const siteBoundaryMpByUtility = new Map<string, string>()
  const boundaryMpByGroup = new Map<string, string>()
  for (const b of bindings) {
    if (b.role === 'boundary' && b.energy_group_id && b.measurement_point_id) {
      boundaryMpByGroup.set(b.energy_group_id, b.measurement_point_id)
    }
  }
  for (const g of groups) {
    const scope = (g.properties && typeof g.properties === 'object'
      ? (g.properties as Record<string, unknown>).scope ?? (g.properties as Record<string, unknown>).scope_type
      : null)
    if (scope === 'site' && g.utility_type) {
      const mpId = boundaryMpByGroup.get(g.id)
      if (mpId) siteBoundaryMpByUtility.set(g.utility_type, mpId)
    }
  }

  // Lecturas recientes para todos los MPs (una sola query).
  const mpIds = mps.map((m) => m.id)
  const consumptionByMp = new Map<string, { value: number | null; latestTs: string | null }>()
  const unitByMp = new Map<string, string>()
  mps.forEach((m) => unitByMp.set(m.id, m.unit))

  if (mpIds.length > 0) {
    const { data: readingData } = await supabase
      .from('measurement_readings')
      .select('measurement_point_id, value, recorded_at')
      .in('measurement_point_id', mpIds)
      .gte('recorded_at', cutoff)
      .order('recorded_at', { ascending: false })

    const byMp = new Map<string, ReadingRow[]>()
    for (const r of (readingData ?? []) as ReadingRow[]) {
      const arr = byMp.get(r.measurement_point_id) ?? []
      arr.push(r)
      byMp.set(r.measurement_point_id, arr)
    }
    for (const id of mpIds) consumptionByMp.set(id, periodConsumption(byMp.get(id)))
  }

  // ── Índices ────────────────────────────────────────────────────────────────
  const childrenOf = new Map<string | null, AreaRow[]>()
  for (const a of areas) {
    const k = a.parent_area_id
    const list = childrenOf.get(k) ?? []
    list.push(a)
    childrenOf.set(k, list)
  }
  const equipmentByArea = new Map<string, EquipmentRow[]>()
  for (const e of equipment) {
    if (!e.area_id) continue
    const list = equipmentByArea.get(e.area_id) ?? []
    list.push(e)
    equipmentByArea.set(e.area_id, list)
  }
  // MPs por target
  const areaMpByKey = new Map<string, MpRow>() // `${areaId}:${utility}`
  const equipMpByKey = new Map<string, MpRow>() // `${equipId}:${utility}`
  for (const mp of mps) {
    if (mp.target_type === 'area') areaMpByKey.set(`${mp.target_id}:${mp.utility}`, mp)
    else if (mp.target_type === 'equipment') equipMpByKey.set(`${mp.target_id}:${mp.utility}`, mp)
  }

  function subtreeAreaIds(areaId: string): string[] {
    const out: string[] = [areaId]
    const stack = [...(childrenOf.get(areaId) ?? [])]
    while (stack.length) {
      const cur = stack.pop()!
      out.push(cur.id)
      const kids = childrenOf.get(cur.id) ?? []
      stack.push(...kids)
    }
    return out
  }

  function cons(mpId: string | undefined): { value: number | null; latestTs: string | null } {
    if (!mpId) return { value: null, latestTs: null }
    return consumptionByMp.get(mpId) ?? { value: null, latestTs: null }
  }

  // Suma bottom-up de equipos de un subárbol para una utility.
  function equipmentSum(areaIds: string[], utility: string): { value: number | null; latestTs: string | null } {
    let total = 0
    let any = false
    let latestTs: string | null = null
    for (const aid of areaIds) {
      for (const e of equipmentByArea.get(aid) ?? []) {
        const mp = equipMpByKey.get(`${e.id}:${utility}`)
        if (!mp) continue
        const c = cons(mp.id)
        if (c.value != null) {
          total += c.value
          any = true
          if (!latestTs || (c.latestTs && c.latestTs > latestTs)) latestTs = c.latestTs
        }
      }
    }
    return { value: any ? total : null, latestTs }
  }

  // Utilities presentes en un subárbol (de medidores de área o de equipos).
  function utilitiesOfArea(areaId: string): string[] {
    const ids = subtreeAreaIds(areaId)
    const set = new Set<string>()
    for (const aid of ids) {
      for (const e of equipmentByArea.get(aid) ?? []) set.add(e.utility_type)
    }
    for (const mp of mps) {
      if (mp.target_type === 'area' && ids.includes(mp.target_id)) set.add(mp.utility)
    }
    return Array.from(set)
  }

  // Resumen por utility de un área (frontera + submedido + cobertura).
  function utilitySummary(areaId: string, utility: string): UtilitySummary {
    const ids = subtreeAreaIds(areaId)
    const areaMp = areaMpByKey.get(`${areaId}:${utility}`)
    const boundaryC = areaMp ? cons(areaMp.id) : equipmentSum(ids, utility)
    const boundary = boundaryC.value

    const children = childrenOf.get(areaId) ?? []
    let submetered: number | null = null
    if (children.length > 0) {
      let total = 0
      let any = false
      for (const ch of children) {
        const childMp = areaMpByKey.get(`${ch.id}:${utility}`)
        const c = childMp ? cons(childMp.id) : equipmentSum(subtreeAreaIds(ch.id), utility)
        if (c.value != null) { total += c.value; any = true }
      }
      submetered = any ? total : null
    } else {
      // Hoja: los submedidores son los equipos del área.
      const c = equipmentSum([areaId], utility)
      // Si la frontera ES la suma de equipos, no hay submedición separada.
      submetered = areaMp ? c.value : null
    }

    const unit = areaMp?.unit ?? mps.find((m) => m.utility === utility)?.unit ?? ''
    const coverage = boundary && boundary > 0 && submetered != null ? Math.min(1, submetered / boundary) : null
    const residual = boundary != null && submetered != null ? Math.max(0, boundary - submetered) : null
    return {
      utility,
      value: boundary,
      unit,
      boundary,
      submetered,
      coverage,
      residual,
      quality: calcQuality(boundaryC.latestTs),
    }
  }

  function areaBlock(a: AreaRow): ExplorerBlock {
    const utils = utilitiesOfArea(a.id)
    const summaries = utils.map((u) => utilitySummary(a.id, u)).filter((s) => s.value != null || s.boundary != null)
    summaries.sort((x, y) => (y.value ?? 0) - (x.value ?? 0))
    const children = childrenOf.get(a.id) ?? []
    // Collect boundary MP IDs per utility (for sparklines/trend panel)
    const boundaryMpIds: Record<string, string> = {}
    for (const u of utils) {
      const mp = areaMpByKey.get(`${a.id}:${u}`)
      if (mp) boundaryMpIds[u] = mp.id
    }
    return {
      id: a.id,
      kind: 'area',
      name: a.name,
      code: a.code,
      description: a.description,
      equipmentType: null,
      // hasChildren is true when there are child areas OR equipment at this node
      hasChildren: children.length > 0 || (equipmentByArea.get(a.id)?.length ?? 0) > 0,
      childCount: children.length > 0
        ? children.length
        : (equipmentByArea.get(a.id)?.length ?? 0),
      utilities: summaries,
      primaryUtility: summaries[0]?.utility ?? null,
      boundaryMpIds,
    }
  }

  function equipmentBlock(e: EquipmentRow): ExplorerBlock {
    const mp = equipMpByKey.get(`${e.id}:${e.utility_type}`)
    const c = cons(mp?.id)
    const summary: UtilitySummary = {
      utility: e.utility_type,
      value: c.value,
      unit: mp?.unit ?? '',
      boundary: c.value,
      submetered: null,
      coverage: null,
      residual: null,
      quality: mp ? calcQuality(c.latestTs) : 'none',
    }
    const boundaryMpIds: Record<string, string> = {}
    if (mp) boundaryMpIds[e.utility_type] = mp.id
    return {
      id: e.id,
      kind: 'equipment',
      name: e.name,
      code: e.tag,
      description: null,
      equipmentType: e.equipment_type,
      hasChildren: false,
      childCount: 0,
      utilities: [summary],
      primaryUtility: e.utility_type,
      boundaryMpIds,
    }
  }

  // ── Construir niveles ──────────────────────────────────────────────────────
  const levels = new Map<string, ExplorerLevel>()
  const topAreas = (childrenOf.get(null) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name))

  // Nivel sitio: bloques = áreas de nivel 0; inflows = total por utility de la planta.
  const plantUtilities = new Set<string>()
  equipment.forEach((e) => plantUtilities.add(e.utility_type))
  const siteInflows: UtilitySummary[] = Array.from(plantUtilities).map((u) => {
    const unit = mps.find((m) => m.utility === u)?.unit ?? ''
    // Si la planta tiene frontera de sitio (grupo Energy scope=site), úsala como
    // la entrada real. Las naves quedan como submedidores → cobertura de planta.
    const siteBoundaryMp = siteBoundaryMpByUtility.get(u)
    if (siteBoundaryMp) {
      const bc = cons(siteBoundaryMp)
      let sub = 0
      let anySub = false
      for (const a of topAreas) {
        const s = utilitySummary(a.id, u)
        // no contar el área que contiene la propia frontera de planta
        if (s.boundary != null && s.boundary !== bc.value) { sub += s.boundary; anySub = true }
      }
      const coverage = bc.value && bc.value > 0 && anySub ? Math.min(1, sub / bc.value) : null
      return {
        utility: u, value: bc.value, unit,
        boundary: bc.value, submetered: anySub ? sub : null, coverage,
        residual: bc.value != null && anySub ? Math.max(0, bc.value - sub) : null,
        quality: calcQuality(bc.latestTs),
      }
    }
    // Sin frontera de sitio: suma de áreas top (gas/vapor/agua no doble-cuentan).
    let total = 0
    let any = false
    let latestTs: string | null = null
    for (const a of topAreas) {
      const s = utilitySummary(a.id, u)
      if (s.boundary != null) { total += s.boundary; any = true; if (s.quality === 'good') latestTs = new Date().toISOString() }
    }
    return {
      utility: u, value: any ? total : null, unit,
      boundary: any ? total : null, submetered: null, coverage: null, residual: null,
      quality: calcQuality(latestTs),
    }
  }).filter((s) => s.value != null).sort((x, y) => (y.value ?? 0) - (x.value ?? 0))

  levels.set('site', {
    scopeId: 'site',
    scopeName: siteName,
    scopeCode: null,
    inflows: siteInflows,
    blocks: topAreas.map(areaBlock),
    blockKind: topAreas.length ? 'area' : 'empty',
  })

  // Un nivel por cada área.
  for (const a of areas) {
    const children = (childrenOf.get(a.id) ?? []).slice().sort((x, y) => x.name.localeCompare(y.name))
    const equ = (equipmentByArea.get(a.id) ?? []).slice().sort((x, y) => x.name.localeCompare(y.name))
    const inflows = utilitiesOfArea(a.id).map((u) => utilitySummary(a.id, u))
      .filter((s) => s.value != null || s.boundary != null)
      .sort((x, y) => (y.value ?? 0) - (x.value ?? 0))

    let blocks: ExplorerBlock[]
    let blockKind: ExplorerLevel['blockKind']
    if (children.length > 0) {
      blocks = children.map(areaBlock)
      blockKind = 'area'
    } else if (equ.length > 0) {
      blocks = equ.map(equipmentBlock)
      blockKind = 'equipment'
    } else {
      blocks = []
      blockKind = 'empty'
    }

    levels.set(a.id, {
      scopeId: a.id,
      scopeName: a.name,
      scopeCode: a.code,
      inflows,
      blocks,
      blockKind,
    })
  }

  return {
    siteId,
    siteName,
    rootId: 'site',
    levels,
    utilities: Array.from(plantUtilities),
  }
}

// Path de breadcrumb (raíz → área) usando parent_area_id; lo resuelve el modelo.
export function buildBreadcrumb(model: ExplorerModel, scopeId: string): { id: string; name: string }[] {
  const crumbs: { id: string; name: string }[] = [{ id: 'site', name: model.siteName }]
  if (scopeId === 'site') return crumbs
  // reconstruir cadena de áreas
  const chain: { id: string; name: string }[] = []
  let cur: string | null = scopeId
  const seen = new Set<string>()
  while (cur && cur !== 'site' && !seen.has(cur)) {
    seen.add(cur)
    const lvl = model.levels.get(cur)
    if (!lvl) break
    chain.unshift({ id: cur, name: lvl.scopeName })
    // buscar el padre: el nivel cuyo bloque incluye a cur
    let parent: string | null = 'site'
    for (const [pid, lv] of model.levels) {
      if (pid === cur) continue
      if (lv.blocks.some((b) => b.id === cur && b.kind === 'area')) { parent = pid; break }
    }
    cur = parent
  }
  return [...crumbs, ...chain]
}
