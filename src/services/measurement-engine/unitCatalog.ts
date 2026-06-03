// unitCatalog.ts
// VersaEnergy — Catálogo de unidades por utility y magnitud
// Fuente: ISA-5.1, IEC 60617, convenciones industriales comunes

export type MeasurementQuantity =
  | 'flow' | 'volume' | 'mass' | 'energy' | 'power'
  | 'pressure' | 'temperature' | 'level'
  | 'current' | 'voltage' | 'runtime' | 'custom'

/** utility id → quantity → unidades permitidas (primera = default) */
export const UNIT_CATALOG: Record<string, Partial<Record<MeasurementQuantity, string[]>>> = {
  electricity: {
    energy:      ['kWh', 'MWh', 'GWh', 'GJ', 'MJ'],
    power:       ['kW', 'MW', 'W'],
    current:     ['A', 'kA', 'mA'],
    voltage:     ['V', 'kV', 'mV'],
    runtime:     ['h', 'min'],
    custom:      [],
  },
  natural_gas: {
    volume:      ['m3', 'Nm3', 'MCF', 'SCF'],
    flow:        ['m3/h', 'Nm3/h', 'SCFM'],
    energy:      ['GJ', 'MJ', 'kWh', 'BTU', 'MMBTU'],
    mass:        ['kg', 'ton'],
    pressure:    ['bar', 'psi', 'kPa', 'mbar'],
    temperature: ['°C', '°F', 'K'],
    custom:      [],
  },
  lpg: {
    volume:      ['L', 'gal', 'm3'],
    mass:        ['kg', 'ton', 'lb'],
    energy:      ['GJ', 'MJ', 'kWh', 'BTU'],
    flow:        ['kg/h', 'L/h'],
    pressure:    ['bar', 'psi', 'kPa'],
    custom:      [],
  },
  diesel: {
    volume:      ['L', 'gal', 'm3'],
    mass:        ['kg', 'ton'],
    energy:      ['GJ', 'MJ', 'kWh'],
    flow:        ['L/h', 'gal/h'],
    custom:      [],
  },
  steam: {
    mass:        ['kg', 'ton', 'lb'],
    flow:        ['kg/h', 'ton/h', 'lb/h'],
    energy:      ['GJ', 'MJ', 'kWh_th', 'BTU'],
    pressure:    ['bar', 'psi', 'kPa', 'MPa'],
    temperature: ['°C', '°F', 'K'],
    volume:      ['m3', 'L'],
    custom:      [],
  },
  condensate: {
    mass:        ['kg', 'ton'],
    flow:        ['kg/h', 'ton/h', 'm3/h'],
    volume:      ['m3', 'L'],
    temperature: ['°C', '°F'],
    pressure:    ['bar', 'psi', 'kPa'],
    custom:      [],
  },
  compressed_air: {
    flow:        ['Nm3/h', 'm3/h', 'SCFM', 'CFM'],
    volume:      ['Nm3', 'm3'],
    pressure:    ['bar', 'psi', 'kPa', 'MPa'],
    energy:      ['kWh', 'MWh'],
    power:       ['kW', 'MW'],
    custom:      [],
  },
  chilled_water: {
    flow:        ['m3/h', 'L/min', 'GPM'],
    volume:      ['m3', 'L'],
    energy:      ['kWh_th', 'GJ', 'MJ', 'TR-h'],
    power:       ['kW', 'MW', 'TR'],
    temperature: ['°C', '°F'],
    pressure:    ['bar', 'psi', 'kPa'],
    level:       ['m', 'cm', '%'],
    custom:      [],
  },
  hot_water: {
    flow:        ['m3/h', 'L/min', 'GPM'],
    volume:      ['m3', 'L'],
    energy:      ['kWh_th', 'GJ', 'MJ'],
    power:       ['kW', 'MW'],
    temperature: ['°C', '°F'],
    pressure:    ['bar', 'psi', 'kPa'],
    custom:      [],
  },
  industrial_water: {
    flow:        ['m3/h', 'L/min', 'GPM', 'L/h'],
    volume:      ['m3', 'L', 'gal'],
    pressure:    ['bar', 'psi', 'kPa'],
    level:       ['m', 'cm', 'mm', '%'],
    temperature: ['°C', '°F'],
    custom:      [],
  },
  potable_water: {
    flow:        ['m3/h', 'L/min', 'GPM'],
    volume:      ['m3', 'L', 'gal'],
    pressure:    ['bar', 'psi', 'kPa'],
    level:       ['m', 'cm', '%'],
    custom:      [],
  },
  process_water: {
    flow:        ['m3/h', 'L/min', 'GPM', 'L/h'],
    volume:      ['m3', 'L'],
    pressure:    ['bar', 'psi', 'kPa'],
    temperature: ['°C', '°F'],
    level:       ['m', 'cm', '%'],
    custom:      [],
  },
  refrigeration: {
    energy:      ['kWh_th', 'GJ', 'TR-h'],
    power:       ['kW', 'TR'],
    temperature: ['°C', '°F', 'K'],
    flow:        ['m3/h', 'kg/h'],
    pressure:    ['bar', 'psi', 'kPa'],
    custom:      [],
  },
  industrial_gas: {
    volume:      ['Nm3', 'm3', 'L'],
    flow:        ['Nm3/h', 'm3/h', 'L/min'],
    mass:        ['kg', 'ton'],
    pressure:    ['bar', 'psi', 'kPa', 'MPa'],
    temperature: ['°C', '°F', 'K'],
    custom:      [],
  },
  solar_generation: {
    energy:      ['kWh', 'MWh'],
    power:       ['kW', 'MW', 'W'],
    runtime:     ['h'],
    custom:      [],
  },
  battery_storage: {
    energy:      ['kWh', 'MWh'],
    power:       ['kW', 'MW'],
    custom:      [],
  },
}

/** Retorna las unidades permitidas para una utility + quantity dada */
export function getAllowedUnits(utility: string, quantity: MeasurementQuantity): string[] {
  return UNIT_CATALOG[utility]?.[quantity] ?? []
}

/** Retorna true si la unidad es compatible con la utility y la magnitud */
export function isUnitCompatible(utility: string, quantity: MeasurementQuantity, unit: string): boolean {
  const allowed = getAllowedUnits(utility, quantity)
  if (allowed.length === 0) return true // sin restricciones (custom)
  return allowed.includes(unit)
}

/** Retorna la unidad default para una utility + quantity dada */
export function getDefaultUnit(utility: string, quantity: MeasurementQuantity): string {
  return getAllowedUnits(utility, quantity)[0] ?? ''
}

/** Magnitudes permitidas para una utility */
export function getAllowedQuantities(utility: string): MeasurementQuantity[] {
  const catalog = UNIT_CATALOG[utility]
  if (!catalog) return ['custom']
  return Object.keys(catalog) as MeasurementQuantity[]
}

/** Sugerencia de tag ISA-5.1 basada en utility + quantity */
export function suggestTag(utility: string, quantity: MeasurementQuantity, index: number): string {
  const prefixes: Record<string, Record<string, string>> = {
    electricity: { energy: 'EI', power: 'PI', current: 'AI', voltage: 'EI' },
    natural_gas: { flow: 'FQI', volume: 'FQI', energy: 'QI', pressure: 'PI', temperature: 'TI' },
    steam:       { flow: 'FI', mass: 'FQI', pressure: 'PI', temperature: 'TI', energy: 'QI' },
    compressed_air: { flow: 'FI', pressure: 'PI', energy: 'QI', volume: 'FQI' },
    chilled_water:  { flow: 'FI', energy: 'QI', power: 'QI', temperature: 'TI', level: 'LI' },
    hot_water:      { flow: 'FI', energy: 'QI', temperature: 'TI' },
    industrial_water: { flow: 'FI', volume: 'FQI', level: 'LI', pressure: 'PI' },
    potable_water:  { flow: 'FI', volume: 'FQI', level: 'LI' },
    diesel:         { volume: 'FQI', flow: 'FI' },
    lpg:            { mass: 'FQI', flow: 'FI' },
    solar_generation: { energy: 'EI', power: 'PI' },
    battery_storage:  { energy: 'EI', power: 'PI' },
  }
  const prefix = prefixes[utility]?.[quantity] ?? 'XI'
  return `${prefix}-${String(index).padStart(3, '0')}`
}

export const QUANTITY_LABELS: Record<MeasurementQuantity, string> = {
  flow:        'Flujo',
  volume:      'Volumen',
  mass:        'Masa',
  energy:      'Energía',
  power:       'Potencia',
  pressure:    'Presión',
  temperature: 'Temperatura',
  level:       'Nivel',
  current:     'Corriente',
  voltage:     'Voltaje',
  runtime:     'Tiempo operación',
  custom:      'Personalizado',
}

export const MEASUREMENT_TYPE_LABELS: Record<string, string> = {
  instantaneous: 'Instantáneo',
  accumulator:   'Acumulador',
  counter:       'Contador',
  status:        'Estado',
  calculated:    'Calculado',
  manual:        'Manual',
}

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  manual:     'Manual',
  iot:        'IoT / Automático',
  calculated: 'Calculado',
}

/** Obtiene las unidades válidas de consumo o cobro para una utility */
export function getTariffUnits(utility: string): string[] {
  const catalog = UNIT_CATALOG[utility]
  if (!catalog) return []
  const units = new Set<string>()
  const quantities: MeasurementQuantity[] = ['energy', 'volume', 'mass', 'flow']
  for (const q of quantities) {
    const list = catalog[q]
    if (list) {
      for (const u of list) {
        units.add(u)
      }
    }
  }
  return Array.from(units)
}

/** Obtiene todas las unidades únicas presentes en todo el catálogo */
export function getAllUnitsFromCatalog(): string[] {
  const units = new Set<string>()
  for (const utility of Object.keys(UNIT_CATALOG)) {
    const quantities = UNIT_CATALOG[utility]
    if (quantities) {
      for (const list of Object.values(quantities)) {
        if (list) {
          for (const u of list) {
            units.add(u)
          }
        }
      }
    }
  }
  return Array.from(units).sort()
}
