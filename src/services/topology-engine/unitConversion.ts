import type { UnitConversion } from './graphTypes'

const CONVERSIONS: UnitConversion[] = [
  // Energy
  { fromUnit: 'kWh', toUnit: 'MWh', factor: 0.001, isEstimated: false },
  { fromUnit: 'MWh', toUnit: 'kWh', factor: 1000, isEstimated: false },
  { fromUnit: 'kWh', toUnit: 'GJ', factor: 0.0036, isEstimated: false },
  { fromUnit: 'GJ', toUnit: 'kWh', factor: 277.7778, isEstimated: false },
  { fromUnit: 'BTU', toUnit: 'kWh', factor: 0.000293071, isEstimated: false },
  { fromUnit: 'kWh', toUnit: 'BTU', factor: 3412.14, isEstimated: false },
  { fromUnit: 'kWh_th', toUnit: 'BTU', factor: 3412.14, isEstimated: false },
  { fromUnit: 'BTU', toUnit: 'kWh_th', factor: 0.000293071, isEstimated: false },
  { fromUnit: 'MJ', toUnit: 'kWh', factor: 0.277778, isEstimated: false },
  { fromUnit: 'kWh', toUnit: 'MJ', factor: 3.6, isEstimated: false },

  // Volume
  { fromUnit: 'm3', toUnit: 'L', factor: 1000, isEstimated: false },
  { fromUnit: 'L', toUnit: 'm3', factor: 0.001, isEstimated: false },
  { fromUnit: 'gal', toUnit: 'L', factor: 3.78541, isEstimated: false },
  { fromUnit: 'L', toUnit: 'gal', factor: 0.264172, isEstimated: false },
  { fromUnit: 'gal', toUnit: 'm3', factor: 0.00378541, isEstimated: false },
  { fromUnit: 'm3', toUnit: 'gal', factor: 264.172, isEstimated: false },

  // Mass
  { fromUnit: 'kg', toUnit: 'lb', factor: 2.20462, isEstimated: false },
  { fromUnit: 'lb', toUnit: 'kg', factor: 0.453592, isEstimated: false },
  { fromUnit: 'kg', toUnit: 'ton', factor: 0.001, isEstimated: false },
  { fromUnit: 'ton', toUnit: 'kg', factor: 1000, isEstimated: false },
  { fromUnit: 'ton', toUnit: 'lb', factor: 2204.62, isEstimated: false },

  // Flow
  { fromUnit: 'kg/h', toUnit: 'lb/h', factor: 2.20462, isEstimated: false },
  { fromUnit: 'lb/h', toUnit: 'kg/h', factor: 0.453592, isEstimated: false },
  { fromUnit: 'kg/h', toUnit: 't/h', factor: 0.001, isEstimated: false },
  { fromUnit: 't/h', toUnit: 'kg/h', factor: 1000, isEstimated: false },
  { fromUnit: 'm3/h', toUnit: 'GPM', factor: 4.40287, isEstimated: false },
  { fromUnit: 'GPM', toUnit: 'm3/h', factor: 0.227125, isEstimated: false },
  { fromUnit: 'L/s', toUnit: 'GPM', factor: 15.8503, isEstimated: false },
  { fromUnit: 'GPM', toUnit: 'L/s', factor: 0.06309, isEstimated: false },

  // Pressure
  { fromUnit: 'bar', toUnit: 'psi', factor: 14.5038, isEstimated: false },
  { fromUnit: 'psi', toUnit: 'bar', factor: 0.0689476, isEstimated: false },

  // Temperature
  { fromUnit: 'C', toUnit: 'F', factor: 1.8, isEstimated: false },

  // Cross-utility (estimated)
  { fromUnit: 'm3', toUnit: 'kWh', factor: 10.55, utility: 'natural_gas', isEstimated: true },
  { fromUnit: 'Nm3', toUnit: 'kWh', factor: 10.55, utility: 'natural_gas', isEstimated: true },
  { fromUnit: 'L', toUnit: 'kWh', factor: 10.0, utility: 'diesel', isEstimated: true },
  { fromUnit: 'kg', toUnit: 'kWh', factor: 0.75, utility: 'steam', isEstimated: true },
]

export function getConversion(fromUnit: string, toUnit: string, utility?: string): UnitConversion | undefined {
  return CONVERSIONS.find(
    (c) =>
      c.fromUnit === fromUnit &&
      c.toUnit === toUnit &&
      (!c.utility || !utility || c.utility === utility),
  )
}

export function getAllConversions(): UnitConversion[] {
  return CONVERSIONS
}

export function convertUnits(
  value: number,
  fromUnit: string,
  toUnit: string,
  utility?: string,
): { result: number; isEstimated: boolean } {
  const conv = getConversion(fromUnit, toUnit, utility)
  if (conv) {
    return { result: value * conv.factor, isEstimated: conv.isEstimated }
  }
  return { result: value, isEstimated: true }
}

export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  if (unit1 === unit2) return true
  return getConversion(unit1, unit2) !== undefined
}
