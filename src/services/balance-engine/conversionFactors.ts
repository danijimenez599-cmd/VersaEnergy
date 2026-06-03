// ── Conversion Factors for Efficiency Balance ────────────────────────────────

/**
 * Catálogo de factores estándar por utility como fallback.
 * Estos factores convierten de la unidad de consumo típica a kWh equivalentes.
 *
 * NOTA: Para una planta real, estos valores deben venir de la BD (energy_emission_factors o energy_tariffs).
 * Estos son valores de referencia (fallback).
 */
export const STANDARD_CONVERSION_FACTORS: Record<string, { factor: number; fromUnit: string; toUnit: string }> = {
  electricity: { factor: 1, fromUnit: 'kWh', toUnit: 'kWh' },

  // Gas natural: ~10.35 kWh por Nm3 (depende del poder calorífico local)
  natural_gas: { factor: 10.35, fromUnit: 'Nm3', toUnit: 'kWh' },

  // Vapor saturado: ~625 kWh por tonelada métrica (~2.25 MJ/kg) (depende de P y T)
  steam: { factor: 625, fromUnit: 'ton', toUnit: 'kWh' },
  // Equivalente en kg (0.625 kWh/kg)
  steam_kg: { factor: 0.625, fromUnit: 'kg', toUnit: 'kWh' },

  // Diésel: ~10.7 kWh por litro
  diesel: { factor: 10.7, fromUnit: 'L', toUnit: 'kWh' },

  // GLP: ~6.9 kWh por litro (o ~13.6 kWh/kg)
  lpg_l: { factor: 6.9, fromUnit: 'L', toUnit: 'kWh' },
  lpg_kg: { factor: 13.6, fromUnit: 'kg', toUnit: 'kWh' },

  // Aire comprimido: Convención muy aproximada de energía embebida (ej. 0.1 kWh por Nm3)
  compressed_air: { factor: 0.1, fromUnit: 'Nm3', toUnit: 'kWh' },

  // Agua helada: ton-hr de refrigeración a kWh térmicos (1 TR = 3.516 kW) -> 1 ton-hr = 3.516 kWh
  chilled_water_ton_hr: { factor: 3.516, fromUnit: 'ton-hr', toUnit: 'kWh' }
}

/**
 * Normaliza un valor de una unidad conocida a kWh basándose en factores de conversión.
 * Se puede expandir para recibir factores dinámicos desde la BD.
 */
export function convertToKwh(value: number, utility: string, unit: string): number | null {
  if (utility === 'electricity') {
    if (unit === 'kWh') return value
    if (unit === 'MWh') return value * 1000
    if (unit === 'Wh') return value / 1000
    return null
  }

  const factorKey = `${utility}_${unit.toLowerCase()}`
  const standardFallback = STANDARD_CONVERSION_FACTORS[factorKey] || STANDARD_CONVERSION_FACTORS[utility]

  if (standardFallback && (standardFallback.fromUnit.toLowerCase() === unit.toLowerCase() || standardFallback.fromUnit === unit)) {
    return value * standardFallback.factor
  }

  // Si no hay factor definido, devolver null
  return null
}
