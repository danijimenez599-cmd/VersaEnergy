import { compileFromRows } from '../src/services/topology-engine/compiler'
import type {
  EnergyGroup,
  EnergyGroupMember,
  EnergyMeasurementBinding,
  EnergySource,
  MeasurementPoint,
  MeasurementReadingValue,
} from '../src/services/topology-engine/graphTypes'

function mp(
  id: string,
  tag: string,
  utility: string,
  targetType: MeasurementPoint['target_type'],
  targetId: string,
  quantity: MeasurementPoint['quantity'],
  unit: string,
): MeasurementPoint {
  return {
    id,
    site_id: 'site-1',
    tag,
    name: tag,
    target_type: targetType,
    target_id: targetId,
    utility,
    measurement_type: 'accumulator',
    quantity,
    unit,
    source_type: 'manual',
    source_config: { kind: 'manual', frequency: 'monthly' },
    accumulator_config: {
      multiplier: 1,
      offset: 0,
      allowNegativeDelta: false,
      resetDetection: true,
    },
    is_active: true,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
  }
}

function runNaveACoverage(): string[] {
  const nodes = [
    { id: 'src-elec', node_type: 'utility_source', tag: 'SRC-A', label: 'Acometida Nave A', utility: 'electricity', position_x: 0, position_y: 0, energy_role: 'source' },
    { id: 'tab-a', node_type: 'panel', tag: 'TAB-A', label: 'Tablero LP-A', utility: 'electricity', position_x: 200, position_y: 0, energy_role: 'distribution' },
    { id: 'maq-a1', node_type: 'consumer', tag: 'MAQ-A1', label: 'MAQ A1', utility: 'electricity', position_x: 420, position_y: -120, energy_role: 'load' },
    { id: 'maq-a2', node_type: 'consumer', tag: 'MAQ-A2', label: 'MAQ A2', utility: 'electricity', position_x: 420, position_y: -40, energy_role: 'load' },
    { id: 'maq-a3', node_type: 'consumer', tag: 'MAQ-A3', label: 'MAQ A3', utility: 'electricity', position_x: 420, position_y: 40, energy_role: 'load' },
    { id: 'ext-a', node_type: 'consumer', tag: 'EXT-A', label: 'Extraccion A', utility: 'electricity', position_x: 420, position_y: 120, energy_role: 'load' },
    { id: 'ilu-a', node_type: 'consumer', tag: 'ILU-A', label: 'Iluminacion A', utility: 'electricity', position_x: 420, position_y: 200, energy_role: 'load' },
  ].map((node) => ({ ...node, properties: {} }))

  const edges = [
    { id: 'e1', source_node_id: 'src-elec', target_node_id: 'tab-a', edge_type: 'cable', utility: 'electricity', flow_direction: 'source_to_target', semantic_role: 'supply' },
    { id: 'e2', source_node_id: 'tab-a', target_node_id: 'maq-a1', edge_type: 'cable', utility: 'electricity', flow_direction: 'source_to_target', semantic_role: 'supply' },
    { id: 'e3', source_node_id: 'tab-a', target_node_id: 'maq-a2', edge_type: 'cable', utility: 'electricity', flow_direction: 'source_to_target', semantic_role: 'supply' },
    { id: 'e4', source_node_id: 'tab-a', target_node_id: 'maq-a3', edge_type: 'cable', utility: 'electricity', flow_direction: 'source_to_target', semantic_role: 'supply' },
    { id: 'e5', source_node_id: 'tab-a', target_node_id: 'ext-a', edge_type: 'cable', utility: 'electricity', flow_direction: 'source_to_target', semantic_role: 'supply' },
    { id: 'e6', source_node_id: 'tab-a', target_node_id: 'ilu-a', edge_type: 'cable', utility: 'electricity', flow_direction: 'source_to_target', semantic_role: 'supply' },
  ].map((edge) => ({ ...edge, properties: {} }))

  const measurementPoints = [
    mp('mp-nave-a', 'MP-NAVE-A', 'electricity', 'edge', 'e1', 'energy', 'kWh'),
    mp('mp-a1', 'MP-A1', 'electricity', 'node', 'maq-a1', 'energy', 'kWh'),
    mp('mp-a2', 'MP-A2', 'electricity', 'node', 'maq-a2', 'energy', 'kWh'),
  ]
  const groups: EnergyGroup[] = [{
    id: 'g-nave-a',
    site_id: 'site-1',
    code: 'G-NAVE-A',
    name: 'Nave A',
    group_type: 'balance_boundary',
    utility_type: 'electricity',
    active: true,
  }]
  const members: EnergyGroupMember[] = ['maq-a1', 'maq-a2', 'maq-a3', 'ext-a', 'ilu-a'].map((nodeId, index) => ({
    id: `gm-${index}`,
    energy_group_id: 'g-nave-a',
    member_type: 'topology_node',
    topology_node_id: nodeId,
    role: 'included',
    active: true,
  }))
  const bindings: EnergyMeasurementBinding[] = [
    { id: 'b-boundary', site_id: 'site-1', measurement_point_id: 'mp-nave-a', binding_type: 'energy_group', energy_group_id: 'g-nave-a', role: 'boundary', utility_type: 'electricity', is_primary: true, active: true },
    { id: 'b-a1', site_id: 'site-1', measurement_point_id: 'mp-a1', binding_type: 'topology_node', topology_node_id: 'maq-a1', role: 'submeter', utility_type: 'electricity', is_primary: true, active: true },
    { id: 'b-a2', site_id: 'site-1', measurement_point_id: 'mp-a2', binding_type: 'topology_node', topology_node_id: 'maq-a2', role: 'submeter', utility_type: 'electricity', is_primary: true, active: true },
  ]
  const readings: MeasurementReadingValue[] = [
    { measurement_point_id: 'mp-nave-a', value: 100000, unit: 'kWh' },
    { measurement_point_id: 'mp-a1', value: 40000, unit: 'kWh' },
    { measurement_point_id: 'mp-a2', value: 25000, unit: 'kWh' },
  ]

  const graph = compileFromRows('diagram-nave-a', 'v-e6', nodes, edges, measurementPoints, {
    energyGroups: groups,
    energyGroupMembers: members,
    measurementBindings: bindings,
    readings,
  })
  const coverage = graph.groupCoverage[0]
  if (!coverage) throw new Error('No group coverage result for Nave A')

  return [
    'E6-E Nave A coverage',
    `utilitySubgraphs=${Object.keys(graph.utilitySubgraphs).join(',')}`,
    `boundary=${coverage.boundaryValue} kWh`,
    `submetered=${coverage.submeterValue} kWh`,
    `coverage=${coverage.coveragePercent.toFixed(0)}%`,
    `residual=${coverage.residualValue.toLocaleString('en-US')} kWh`,
    `unmetered=${coverage.unmeteredNodeIds.join(',')}`,
  ]
}

function runBoilerSeparation(): string[] {
  const nodes = [
    { id: 'src-gas', node_type: 'utility_source', tag: 'GAS-1', label: 'Contrato gas', utility: 'natural_gas', energy_source_id: 'source-gas', identity_kind: 'external_source', energy_role: 'source', position_x: 0, position_y: 0, properties: {} },
    {
      id: 'boiler-1',
      node_type: 'boiler',
      tag: 'N-CALD-1',
      label: 'Caldera 1',
      utility: 'steam',
      energy_role: 'conversion',
      position_x: 240,
      position_y: 0,
      properties: {
        ports: [
          { id: 'in-gas', direction: 'in', utility: 'natural_gas', measurement_point_id: 'mp-gas' },
          { id: 'out-steam', direction: 'out', utility: 'steam', measurement_point_id: 'mp-steam' },
        ],
        rated_efficiency: 0.86,
      },
    },
    { id: 'hdr-steam', node_type: 'header', tag: 'N-HDR-STEAM', label: 'Header vapor', utility: 'steam', energy_role: 'distribution', position_x: 520, position_y: 0, properties: {} },
  ]
  const edges = [
    { id: 'e-gas', source_node_id: 'src-gas', target_node_id: 'boiler-1', edge_type: 'pipe', utility: 'natural_gas', flow_direction: 'source_to_target', semantic_role: 'supply', properties: {} },
    { id: 'e-steam', source_node_id: 'boiler-1', target_node_id: 'hdr-steam', edge_type: 'pipe', utility: 'steam', flow_direction: 'source_to_target', semantic_role: 'supply', properties: {} },
  ]
  const measurementPoints = [
    mp('mp-gas', 'MP-GAS', 'natural_gas', 'edge', 'e-gas', 'volume', 'm3'),
    mp('mp-steam', 'MP-STEAM', 'steam', 'edge', 'e-steam', 'mass', 'kg'),
    mp('mp-p', 'MP-P', 'steam', 'node', 'boiler-1', 'pressure', 'bar'),
    mp('mp-t', 'MP-T', 'steam', 'node', 'boiler-1', 'temperature', 'C'),
  ]
  const bindings: EnergyMeasurementBinding[] = [
    { id: 'b-gas', site_id: 'site-1', measurement_point_id: 'mp-gas', binding_type: 'topology_edge', topology_edge_id: 'e-gas', role: 'boundary', utility_type: 'natural_gas', is_primary: true, active: true },
    { id: 'b-steam', site_id: 'site-1', measurement_point_id: 'mp-steam', binding_type: 'topology_edge', topology_edge_id: 'e-steam', role: 'boundary', utility_type: 'steam', is_primary: true, active: true },
  ]
  const energySources: EnergySource[] = [{
    id: 'source-gas',
    site_id: 'site-1',
    company_id: 'company-1',
    utility_type: 'natural_gas',
    name: 'Contrato gas',
    default_unit: 'm3',
    calorific_basis: 'LHV',
    calorific_value: 36,
    calorific_unit: 'MJ/m3',
    active: true,
  }]
  const graph = compileFromRows('diagram-boiler', 'v-e6', nodes, edges, measurementPoints, {
    measurementBindings: bindings,
    energySources,
  })

  const gasM3 = 1000
  const gasKwh = gasM3 * 36 / 3.6
  const steamUsefulKwh = gasKwh * 0.86
  const gasSubgraph = graph.utilitySubgraphs.natural_gas
  const steamSubgraph = graph.utilitySubgraphs.steam

  return [
    'E6-E boiler utility separation',
    `subgraphs=${Object.keys(graph.utilitySubgraphs).join(',')}`,
    `natural_gas_edges=${gasSubgraph.edgeIds.join(',')}`,
    `steam_edges=${steamSubgraph.edgeIds.join(',')}`,
    `steam_sources=${steamSubgraph.sourceNodeIds.join(',')}`,
    `gas_energy=${gasKwh.toFixed(0)} kWh_LHV from ${gasM3} m3 at 36 MJ/m3`,
    `steam_useful=${steamUsefulKwh.toFixed(0)} kWh calculated companion flow+P/T`,
    `boiler_efficiency=${((steamUsefulKwh / gasKwh) * 100).toFixed(0)}% LHV`,
  ]
}

const output = [
  ...runNaveACoverage(),
  '',
  ...runBoilerSeparation(),
]

console.log(output.join('\n'))
