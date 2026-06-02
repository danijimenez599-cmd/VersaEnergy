import type { ValidationRule, ValidationIssue, ValidationContext } from './graphTypes'
import { areUtilitiesCompatible, isMeterTypeAllowed, isEdgeTypeAllowed } from './utilityRules'

const ACCUMULATOR_UNITS = ['kWh', 'MWh', 'GJ', 'm3', 'Nm3', 'kg', 'L', 'gal', 'BTU', 'TR-h', 'lb', 'ton', 'kWh_th', 'MJ', 'SCF']
const EQUIPMENT_NODE_TYPES = new Set([
  'boiler', 'pump', 'compressor', 'chiller', 'cooling_tower', 'tank',
  'transformer', 'panel', 'generator', 'heat_exchanger', 'motor', 'consumer',
  'custom_equipment',
])
const MEASUREMENT_NODE_TYPES = new Set([
  'flow_meter', 'energy_meter', 'power_meter', 'pressure_sensor',
  'temperature_sensor', 'level_sensor', 'current_transformer',
  'gas_meter', 'water_meter', 'steam_meter', 'custom_meter',
])
const ORGANIZATIONAL_NODE_TYPES = new Set([
  'area_node', 'process_node', 'production_line', 'area', 'process', 'site', 'cost_center',
])

let issueCounter = 0
function issueId(): string {
  return `val-${++issueCounter}-${Date.now()}`
}

function linkedObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  return record.status === 'linked' ? record : null
}

export const validationRules: ValidationRule[] = [
  // R01: Tag único
  {
    id: 'R01',
    severity: 'error',
    appliesTo: 'diagram',
    check(ctx: ValidationContext): ValidationIssue[] {
      const issues: ValidationIssue[] = []
      const tagMap = new Map<string, string[]>()
      for (const node of ctx.nodes) {
        const existing = tagMap.get(node.tag) || []
        existing.push(node.id)
        tagMap.set(node.tag, existing)
      }
      for (const [tag, ids] of tagMap) {
        if (ids.length > 1) {
          issues.push({
            id: issueId(),
            ruleId: 'R01',
            severity: 'error',
            message: `Tag duplicado: "${tag}" en ${ids.length} nodos (${ids.join(', ')})`,
            targetId: ids[0],
            targetType: 'node',
          })
        }
      }
      return issues
    },
  },

  // R02: Edge con utility
  {
    id: 'R02',
    severity: 'error',
    appliesTo: 'edge',
    check(ctx: ValidationContext): ValidationIssue[] {
      return ctx.edges
        .filter((e) => !e.utility)
        .map((e) => ({
          id: issueId(),
          ruleId: 'R02',
          severity: 'error' as const,
          message: `Edge ${e.id} no tiene utility definida`,
          targetId: e.id,
          targetType: 'edge',
        }))
    },
  },

  // R03: Compatibilidad utility entre nodos conectados
  {
    id: 'R03',
    severity: 'error',
    appliesTo: 'edge',
    check(ctx: ValidationContext): ValidationIssue[] {
      const issues: ValidationIssue[] = []
      const nodeMap = new Map(ctx.nodes.map((n) => [n.id, n]))
      for (const edge of ctx.edges) {
        const source = nodeMap.get(edge.source)
        const target = nodeMap.get(edge.target)
        if (!source || !target) continue
        if (source.utility && target.utility && !areUtilitiesCompatible(source.utility, target.utility)) {
          issues.push({
            id: issueId(),
            ruleId: 'R03',
            severity: 'error',
            message: `Incompatibilidad de utilities: ${source.utility} (${source.tag}) → ${target.utility} (${target.tag})`,
            targetId: edge.id,
            targetType: 'edge',
          })
        }
      }
      return issues
    },
  },

  // R04: Medidor compatible con utility
  {
    id: 'R04',
    severity: 'error',
    appliesTo: 'measurement',
    check(ctx: ValidationContext): ValidationIssue[] {
      const issues: ValidationIssue[] = []
      const nodeMap = new Map(ctx.nodes.map((n) => [n.id, n]))
      for (const mp of ctx.measurementPoints) {
        if (mp.measurement_type === 'calculated') continue
        const targetNode = nodeMap.get(mp.target_id)
        if (!targetNode) continue
        if (!isMeterTypeAllowed(mp.utility, mp.measurement_type)) {
          issues.push({
            id: issueId(),
            ruleId: 'R04',
            severity: 'error',
            message: `Medidor ${mp.tag} (${mp.measurement_type}) no es compatible con utility ${mp.utility}`,
            targetId: mp.id,
            targetType: 'measurement',
          })
        }
      }
      return issues
    },
  },

  // R05: Unidad acumulativa para accumulators
  {
    id: 'R05',
    severity: 'error',
    appliesTo: 'measurement',
    check(ctx: ValidationContext): ValidationIssue[] {
      return ctx.measurementPoints
        .filter((mp) => mp.measurement_type === 'accumulator' && !ACCUMULATOR_UNITS.includes(mp.unit))
        .map((mp) => ({
          id: issueId(),
          ruleId: 'R05',
          severity: 'error' as const,
          message: `Medidor ${mp.tag} es acumulador pero usa unidad no acumulativa: ${mp.unit}. Unidades válidas: ${ACCUMULATOR_UNITS.join(', ')}`,
          targetId: mp.id,
          targetType: 'measurement',
        }))
    },
  },

  // R06: Dirección de flujo en edges
  {
    id: 'R06',
    severity: 'warning',
    appliesTo: 'edge',
    check(ctx: ValidationContext): ValidationIssue[] {
      return ctx.edges
        .filter((e) => e.flowDirection === 'unknown')
        .map((e) => ({
          id: issueId(),
          ruleId: 'R06',
          severity: 'warning' as const,
          message: `Edge ${e.id} (${e.utility}) no tiene dirección de flujo definida`,
          targetId: e.id,
          targetType: 'edge',
        }))
    },
  },

  // R07: Nodos sin utility definida
  {
    id: 'R07',
    severity: 'warning',
    appliesTo: 'node',
    check(ctx: ValidationContext): ValidationIssue[] {
      return ctx.nodes
        .filter((n) => !n.utility && n.type !== 'annotation')
        .map((n) => ({
          id: issueId(),
          ruleId: 'R07',
          severity: 'warning' as const,
          message: `Nodo ${n.tag} no tiene utility definida`,
          targetId: n.id,
          targetType: 'node',
        }))
    },
  },

  // R08: Edge type no compatible con utility
  {
    id: 'R08',
    severity: 'error',
    appliesTo: 'edge',
    check(ctx: ValidationContext): ValidationIssue[] {
      const issues: ValidationIssue[] = []
      for (const edge of ctx.edges) {
        if (!edge.utility) continue
        if (!isEdgeTypeAllowed(edge.utility, edge.type)) {
          issues.push({
            id: issueId(),
            ruleId: 'R08',
            severity: 'error',
            message: `Edge type "${edge.type}" no es compatible con utility "${edge.utility}". Tipos válidos: cable, busbar, signal (eléctricas) | pipe (fluidos/gas)`,
            targetId: edge.id,
            targetType: 'edge',
          })
        }
      }
      return issues
    },
  },

  // R09: Circuito eléctrico debe tener source
  {
    id: 'R09',
    severity: 'warning',
    appliesTo: 'diagram',
    check(ctx: ValidationContext): ValidationIssue[] {
      const issues: ValidationIssue[] = []
      const hasElectrical = ctx.nodes.some((n) =>
        ['electricity', 'solar_generation', 'battery_storage'].includes(n.utility),
      )
      if (hasElectrical) {
        const hasSource = ctx.nodes.some(
          (n) =>
            n.type === 'utility_source' &&
            ['electricity', 'solar_generation', 'battery_storage'].includes(n.utility),
        )
        if (!hasSource) {
          issues.push({
            id: issueId(),
            ruleId: 'R09',
            severity: 'warning',
            message: 'El diagrama tiene nodos eléctricos pero no tiene utility_source definido',
            targetType: 'diagram',
          })
        }
      }
      return issues
    },
  },

  // R10: Sin ciclos en edges de flujo
  {
    id: 'R10',
    severity: 'warning',
    appliesTo: 'diagram',
    check(ctx: ValidationContext): ValidationIssue[] {
      const issues: ValidationIssue[] = []
      const adj = new Map<string, string[]>()
      for (const edge of ctx.edges) {
        if (edge.type === 'signal' || edge.type === 'logical') continue
        const list = adj.get(edge.source) || []
        list.push(edge.target)
        adj.set(edge.source, list)
      }

      const visited = new Set<string>()
      const recStack = new Set<string>()

      function dfs(nodeId: string): boolean {
        visited.add(nodeId)
        recStack.add(nodeId)
        for (const next of adj.get(nodeId) || []) {
          if (!visited.has(next)) {
            if (dfs(next)) return true
          } else if (recStack.has(next)) {
            return true
          }
        }
        recStack.delete(nodeId)
        return false
      }

      for (const node of ctx.nodes) {
        if (!visited.has(node.id)) {
          if (dfs(node.id)) {
            issues.push({
              id: issueId(),
              ruleId: 'R10',
              severity: 'warning',
              message: 'Se detectó un ciclo en las conexiones de flujo. Esto puede indicar una conexión incorrecta o una recirculación no declarada.',
              targetType: 'diagram',
            })
            break
          }
        }
      }
      return issues
    },
  },

  // R11: Nodo tipo "measurement" debe ser compatible con la utility que mide
  {
    id: 'R11',
    severity: 'error',
    appliesTo: 'node',
    check(ctx: ValidationContext): ValidationIssue[] {
      return ctx.nodes
        .filter(
          (n) =>
            n.utility &&
            ['flow_meter', 'energy_meter', 'power_meter', 'pressure_sensor',
              'temperature_sensor', 'level_sensor', 'gas_meter', 'water_meter',
              'steam_meter', 'current_transformer'].includes(n.type),
        )
        .filter((n) => !isMeterTypeAllowed(n.utility, n.type))
        .map((n) => ({
          id: issueId(),
          ruleId: 'R11',
          severity: 'error' as const,
          message: `Nodo de medición "${n.tag}" (${n.type}) no es compatible con la utility "${n.utility}"`,
          targetId: n.id,
          targetType: 'node',
        }))
    },
  },

  // R12: MeasurementPoint con target inexistente
  {
    id: 'R12',
    severity: 'error',
    appliesTo: 'measurement',
    check(ctx: ValidationContext): ValidationIssue[] {
      const issues: ValidationIssue[] = []
      const nodeIds = new Set(ctx.nodes.map((n) => n.id))
      const edgeIds = new Set(ctx.edges.map((e) => e.id))
      for (const mp of ctx.measurementPoints) {
        if (mp.target_type === 'node' && !nodeIds.has(mp.target_id)) {
          issues.push({
            id: issueId(),
            ruleId: 'R12',
            severity: 'error',
            message: `MeasurementPoint ${mp.tag} apunta a nodo ${mp.target_id} que no existe en el grafo`,
            targetId: mp.id,
            targetType: 'measurement',
          })
        }
        if (mp.target_type === 'edge' && !edgeIds.has(mp.target_id)) {
          issues.push({
            id: issueId(),
            ruleId: 'R12',
            severity: 'error',
            message: `MeasurementPoint ${mp.tag} apunta a edge ${mp.target_id} que no existe en el grafo`,
            targetId: mp.id,
            targetType: 'measurement',
          })
        }
      }
      return issues
    },
  },

  // R13: Equipos, areas y medidores del mapa deben venir del arbol de activos
  {
    id: 'R13',
    severity: 'error',
    appliesTo: 'node',
    check(ctx: ValidationContext): ValidationIssue[] {
      const issues: ValidationIssue[] = []
      for (const node of ctx.nodes) {
        const assetBinding = linkedObject(node.properties?.asset_binding)
        if (EQUIPMENT_NODE_TYPES.has(node.type) && !assetBinding) {
          issues.push({
            id: issueId(),
            ruleId: 'R13',
            severity: 'error',
            message: `Nodo ${node.tag} debe vincularse a un equipo existente del arbol de activos antes de publicar.`,
            targetId: node.id,
            targetType: 'node',
          })
        }
        if (ORGANIZATIONAL_NODE_TYPES.has(node.type) && !assetBinding) {
          issues.push({
            id: issueId(),
            ruleId: 'R13',
            severity: 'error',
            message: `Nodo organizacional ${node.tag} debe vincularse a un area/proceso existente del arbol de activos.`,
            targetId: node.id,
            targetType: 'node',
          })
        }
        if (MEASUREMENT_NODE_TYPES.has(node.type)) {
          const measurementBinding = linkedObject(node.properties?.measurement_binding)
          if (!assetBinding || !measurementBinding?.measurement_point_id) {
            issues.push({
              id: issueId(),
              ruleId: 'R13',
              severity: 'error',
              message: `Medidor ${node.tag} debe vincularse a un equipo medidor y a su MeasurementPoint.`,
              targetId: node.id,
              targetType: 'node',
            })
          }
        }
      }
      return issues
    },
  },
]

export function validate(ctx: ValidationContext): ValidationIssue[] {
  return validationRules.flatMap((rule) => rule.check(ctx))
}

export function validateDiagram(ctx: ValidationContext): ValidationIssue[] {
  return validationRules
    .filter((r) => r.appliesTo === 'diagram')
    .flatMap((r) => r.check(ctx))
}

export function validateNode(ctx: ValidationContext): ValidationIssue[] {
  return validationRules
    .filter((r) => r.appliesTo === 'node' || r.appliesTo === 'diagram')
    .flatMap((r) => r.check(ctx))
}

export function validateEdge(ctx: ValidationContext): ValidationIssue[] {
  return validationRules
    .filter((r) => r.appliesTo === 'edge' || r.appliesTo === 'diagram')
    .flatMap((r) => r.check(ctx))
}

export function getIssuesBySeverity(
  issues: ValidationIssue[],
  severity: string,
): ValidationIssue[] {
  return issues.filter((i) => i.severity === severity)
}

export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error')
}
