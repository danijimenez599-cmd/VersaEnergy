import type { UtilityRuleSet } from './graphTypes'

export const UTILITY_RULES: Record<string, UtilityRuleSet> = {
  electricity: {
    utility: 'electricity',
    category: 'electrical',
    allowedNodeTypes: ['transformer', 'panel', 'breaker', 'power_meter', 'current_transformer',
      'consumer', 'utility_source', 'generator', 'battery_storage', 'motor',
      'connector_cable', 'connector_busbar', 'area', 'process', 'loss_node'],
    allowedEdgeTypes: ['cable', 'busbar', 'signal'],
    allowedMeterTypes: ['power_meter', 'energy_meter', 'current_transformer'],
    validFlowUnits: ['kW', 'kVA', 'A', 'V'],
    validAccumulatorUnits: ['kWh', 'MWh', 'GJ'],
    incompatibleWith: ['steam', 'compressed_air', 'chilled_water', 'hot_water',
      'industrial_water', 'natural_gas', 'diesel', 'lpg'],
    requiresSource: true,
    requiresFlowDirection: true,
  },
  natural_gas: {
    utility: 'natural_gas',
    category: 'gas',
    allowedNodeTypes: ['boiler', 'valve', 'regulator', 'gas_meter', 'consumer',
      'utility_source', 'connector_pipe', 'header', 'area', 'process', 'loss_node'],
    allowedEdgeTypes: ['pipe', 'signal'],
    allowedMeterTypes: ['gas_meter', 'flow_meter'],
    validFlowUnits: ['Nm3', 'SCFM', 'm3'],
    validAccumulatorUnits: ['m3', 'Nm3', 'BTU', 'GJ', 'kWh'],
    incompatibleWith: ['electricity', 'steam', 'chilled_water', 'industrial_water'],
    requiresSource: true,
    requiresFlowDirection: true,
  },
  steam: {
    utility: 'steam',
    category: 'thermal',
    allowedNodeTypes: ['boiler', 'steam_header', 'valve', 'control_valve', 'check_valve',
      'heat_exchanger', 'steam_trap', 'condensate_return', 'steam_meter', 'consumer',
      'utility_source', 'connector_pipe', 'header', 'area', 'process', 'loss_node', 'pump'],
    allowedEdgeTypes: ['pipe', 'signal'],
    allowedMeterTypes: ['steam_meter', 'flow_meter', 'pressure_sensor', 'temperature_sensor'],
    validFlowUnits: ['kg/h', 'lb/h', 't/h'],
    validAccumulatorUnits: ['kg', 'lb', 'ton', 'kWh_th', 'BTU', 'MJ', 'GJ'],
    incompatibleWith: ['electricity', 'chilled_water', 'compressed_air'],
    requiresSource: true,
    requiresFlowDirection: true,
  },
  compressed_air: {
    utility: 'compressed_air',
    category: 'gas',
    allowedNodeTypes: ['compressor', 'tank', 'valve', 'regulator', 'connector_pipe', 'header',
      'consumer', 'utility_source', 'area', 'process', 'loss_node'],
    allowedEdgeTypes: ['pipe', 'duct', 'signal'],
    allowedMeterTypes: ['flow_meter', 'pressure_sensor'],
    validFlowUnits: ['Nm3', 'SCFM', 'm3'],
    validAccumulatorUnits: ['Nm3', 'kWh_e', 'kWh/Nm3'],
    incompatibleWith: ['electricity', 'steam', 'chilled_water', 'natural_gas'],
    requiresSource: true,
    requiresFlowDirection: true,
  },
  chilled_water: {
    utility: 'chilled_water',
    category: 'thermal',
    allowedNodeTypes: ['chiller', 'cooling_tower', 'pump', 'tank', 'valve',
      'connector_pipe', 'header', 'ahu', 'consumer', 'utility_source',
      'area', 'process', 'loss_node'],
    allowedEdgeTypes: ['pipe', 'signal'],
    allowedMeterTypes: ['flow_meter', 'energy_meter', 'temperature_sensor', 'pressure_sensor'],
    validFlowUnits: ['m3', 'GPM', 'TR', 'L/s'],
    validAccumulatorUnits: ['TR-h', 'BTU/h', 'kWh_th'],
    incompatibleWith: ['electricity', 'steam', 'hot_water'],
    requiresSource: true,
    requiresFlowDirection: true,
  },
  hot_water: {
    utility: 'hot_water',
    category: 'thermal',
    allowedNodeTypes: ['boiler', 'pump', 'tank', 'valve', 'heat_exchanger',
      'connector_pipe', 'header', 'consumer', 'area', 'process', 'loss_node'],
    allowedEdgeTypes: ['pipe', 'signal'],
    allowedMeterTypes: ['flow_meter', 'temperature_sensor', 'energy_meter'],
    validFlowUnits: ['m3', 'L', 'GPM'],
    validAccumulatorUnits: ['m3', 'BTU', 'kWh_th'],
    incompatibleWith: ['electricity', 'chilled_water'],
    requiresSource: true,
    requiresFlowDirection: true,
  },
  industrial_water: {
    utility: 'industrial_water',
    category: 'fluid',
    allowedNodeTypes: ['pump', 'tank', 'valve', 'connector_pipe', 'header',
      'consumer', 'utility_source', 'area', 'process', 'loss_node'],
    allowedEdgeTypes: ['pipe', 'signal'],
    allowedMeterTypes: ['flow_meter', 'water_meter', 'pressure_sensor'],
    validFlowUnits: ['m3', 'L', 'GPM'],
    validAccumulatorUnits: ['m3', 'L'],
    incompatibleWith: ['electricity', 'steam'],
    requiresSource: true,
    requiresFlowDirection: true,
  },
  diesel: {
    utility: 'diesel',
    category: 'fluid',
    allowedNodeTypes: ['generator', 'pump', 'tank', 'valve', 'consumer',
      'utility_source', 'connector_pipe', 'area', 'process', 'loss_node'],
    allowedEdgeTypes: ['pipe', 'signal'],
    allowedMeterTypes: ['flow_meter', 'level_sensor'],
    validFlowUnits: ['L', 'gal', 'kg'],
    validAccumulatorUnits: ['L', 'gal', 'kg', 'BTU', 'GJ', 'kWh'],
    incompatibleWith: ['electricity'],
    requiresSource: true,
    requiresFlowDirection: true,
  },
  lpg: {
    utility: 'lpg',
    category: 'gas',
    allowedNodeTypes: ['boiler', 'valve', 'regulator', 'gas_meter', 'consumer',
      'utility_source', 'tank', 'connector_pipe', 'header', 'area', 'process', 'loss_node'],
    allowedEdgeTypes: ['pipe', 'signal'],
    allowedMeterTypes: ['gas_meter', 'flow_meter'],
    validFlowUnits: ['kg', 'L', 'gal'],
    validAccumulatorUnits: ['kg', 'L', 'BTU', 'GJ', 'kWh'],
    incompatibleWith: ['electricity', 'steam'],
    requiresSource: true,
    requiresFlowDirection: true,
  },
  condensate: {
    utility: 'condensate',
    category: 'fluid',
    allowedNodeTypes: ['condensate_return', 'pump', 'tank', 'valve',
      'connector_pipe', 'consumer', 'area', 'process', 'loss_node'],
    allowedEdgeTypes: ['pipe', 'signal'],
    allowedMeterTypes: ['flow_meter', 'temperature_sensor', 'level_sensor'],
    validFlowUnits: ['m3', 'L', 'kg'],
    validAccumulatorUnits: ['m3', 'L', 'kg', 'kWh_th', 'BTU', 'MJ'],
    incompatibleWith: ['electricity', 'compressed_air'],
    requiresSource: false,
    requiresFlowDirection: true,
  },
  refrigeration: {
    utility: 'refrigeration',
    category: 'thermal',
    allowedNodeTypes: ['chiller', 'compressor', 'cooling_tower', 'pump',
      'heat_exchanger', 'tank', 'connector_pipe', 'consumer', 'area', 'process', 'loss_node'],
    allowedEdgeTypes: ['pipe', 'signal'],
    allowedMeterTypes: ['energy_meter', 'temperature_sensor', 'pressure_sensor', 'flow_meter'],
    validFlowUnits: ['TR', 'kW_th'],
    validAccumulatorUnits: ['TR-h', 'kWh_th', 'BTU'],
    incompatibleWith: ['steam', 'hot_water'],
    requiresSource: true,
    requiresFlowDirection: true,
  },
  industrial_gas: {
    utility: 'industrial_gas',
    category: 'gas',
    allowedNodeTypes: ['tank', 'valve', 'regulator', 'connector_pipe', 'header',
      'consumer', 'utility_source', 'area', 'process', 'loss_node'],
    allowedEdgeTypes: ['pipe', 'signal'],
    allowedMeterTypes: ['flow_meter', 'pressure_sensor', 'gas_meter'],
    validFlowUnits: ['Nm3', 'SCF', 'm3', 'kg'],
    validAccumulatorUnits: ['Nm3', 'SCF', 'm3', 'kg'],
    incompatibleWith: ['electricity'],
    requiresSource: true,
    requiresFlowDirection: true,
  },
  potable_water: {
    utility: 'potable_water',
    category: 'fluid',
    allowedNodeTypes: ['pump', 'tank', 'valve', 'connector_pipe', 'header',
      'consumer', 'utility_source', 'area', 'process', 'loss_node'],
    allowedEdgeTypes: ['pipe', 'signal'],
    allowedMeterTypes: ['flow_meter', 'water_meter'],
    validFlowUnits: ['m3', 'L', 'GPM'],
    validAccumulatorUnits: ['m3', 'L'],
    incompatibleWith: ['electricity'],
    requiresSource: true,
    requiresFlowDirection: true,
  },
  process_water: {
    utility: 'process_water',
    category: 'fluid',
    allowedNodeTypes: ['pump', 'tank', 'valve', 'connector_pipe', 'header',
      'consumer', 'utility_source', 'area', 'process', 'loss_node'],
    allowedEdgeTypes: ['pipe', 'signal'],
    allowedMeterTypes: ['flow_meter', 'water_meter', 'pressure_sensor', 'temperature_sensor'],
    validFlowUnits: ['m3', 'L', 'GPM'],
    validAccumulatorUnits: ['m3', 'L'],
    incompatibleWith: ['electricity'],
    requiresSource: true,
    requiresFlowDirection: true,
  },
  solar_generation: {
    utility: 'solar_generation',
    category: 'electrical',
    allowedNodeTypes: ['generator', 'panel', 'power_meter', 'transformer',
      'consumer', 'utility_source', 'area', 'process'],
    allowedEdgeTypes: ['cable', 'busbar', 'signal'],
    allowedMeterTypes: ['power_meter', 'energy_meter'],
    validFlowUnits: ['kW'],
    validAccumulatorUnits: ['kWh', 'MWh'],
    incompatibleWith: ['steam', 'natural_gas', 'chilled_water', 'compressed_air'],
    requiresSource: true,
    requiresFlowDirection: true,
  },
  battery_storage: {
    utility: 'battery_storage',
    category: 'electrical',
    allowedNodeTypes: ['battery_storage', 'panel', 'power_meter', 'transformer',
      'consumer', 'utility_source', 'area', 'process'],
    allowedEdgeTypes: ['cable', 'busbar', 'signal'],
    allowedMeterTypes: ['power_meter', 'energy_meter'],
    validFlowUnits: ['kW'],
    validAccumulatorUnits: ['kWh', 'MWh'],
    incompatibleWith: ['steam', 'natural_gas', 'chilled_water', 'compressed_air'],
    requiresSource: true,
    requiresFlowDirection: true,
  },
}

export function getRuleSet(utility: string): UtilityRuleSet | undefined {
  return UTILITY_RULES[utility]
}

export function areUtilitiesCompatible(util1: string, util2: string): boolean {
  const rules1 = UTILITY_RULES[util1]
  if (!rules1) return true
  return !rules1.incompatibleWith.includes(util2)
}

export function isNodeTypeAllowed(utility: string, nodeType: string): boolean {
  const rules = UTILITY_RULES[utility]
  if (!rules) return true
  return rules.allowedNodeTypes.includes(nodeType)
}

export function isMeterTypeAllowed(utility: string, meterType: string): boolean {
  const rules = UTILITY_RULES[utility]
  if (!rules) return true
  return rules.allowedMeterTypes.includes(meterType)
}

export function isEdgeTypeAllowed(utility: string, edgeType: string): boolean {
  const rules = UTILITY_RULES[utility]
  if (!rules) return true
  return rules.allowedEdgeTypes.includes(edgeType)
}
