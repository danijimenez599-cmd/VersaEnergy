import { useState, useMemo } from 'react'
import { Card } from '@/shared/Card'
import { FormField } from '@/shared/FormField'
import { UNIT_CATALOG, QUANTITY_LABELS, getAllUnitsFromCatalog, type MeasurementQuantity } from '@/services/measurement-engine/unitCatalog'
import { convertUnits, getAllConversions } from '@/services/topology-engine/unitConversion'
import { getUtilityLabel, utilityOptions } from '@/shared/OperationalContext'
import { Calculator, CheckCircle2, AlertTriangle, List, ArrowRightLeft } from 'lucide-react'

export function UnitsManagerView() {
  // Calculator State
  const [calcValue, setCalcValue] = useState<string>('1')
  const [calcUtility, setCalcUtility] = useState<string>('electricity')
  
  // Available units for the selected utility
  const utilityUnits = useMemo(() => {
    const catalog = UNIT_CATALOG[calcUtility]
    if (!catalog) return []
    const set = new Set<string>()
    for (const list of Object.values(catalog)) {
      if (list) list.forEach(u => set.add(u))
    }
    return Array.from(set)
  }, [calcUtility])

  const [fromUnit, setFromUnit] = useState<string>('kWh')
  const [toUnit, setToUnit] = useState<string>('MWh')

  // Keep fromUnit and toUnit in sync when calcUtility changes
  useMemo(() => {
    if (utilityUnits.length > 0) {
      if (!utilityUnits.includes(fromUnit)) {
        setFromUnit(utilityUnits[0])
      }
      const otherUnits = utilityUnits.filter(u => u !== utilityUnits[0])
      if (otherUnits.length > 0 && !utilityUnits.includes(toUnit)) {
        setToUnit(otherUnits[0])
      }
    }
  }, [calcUtility, utilityUnits])

  // Conversion result calculation
  const conversionResult = useMemo(() => {
    const numVal = parseFloat(calcValue)
    if (isNaN(numVal)) return null
    return convertUnits(numVal, fromUnit, toUnit, calcUtility)
  }, [calcValue, fromUnit, toUnit, calcUtility])

  // Catalog tab filtering
  const [activeCatalogUtility, setActiveCatalogUtility] = useState<string>('all')

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Diccionario y Conversión de Unidades</h2>
        <p className="text-xs text-slate-500">
          Gestiona y simula las equivalencias de unidades físicas y térmicas integradas en el motor de cálculo de VersaEnergy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Simulator Panel */}
        <Card className="lg:col-span-1 p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calculator className="w-5 h-5 text-brand-blue" />
            <h3 className="text-sm font-bold text-slate-900">Simulador de Conversión</h3>
          </div>

          <FormField label="Utility / Commodity">
            <select
              value={calcUtility}
              onChange={(e) => setCalcUtility(e.target.value)}
              className="select-custom w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
            >
              {utilityOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-1 gap-3">
            <FormField label="Valor a Convertir">
              <input
                type="number"
                value={calcValue}
                onChange={(e) => setCalcValue(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
                placeholder="1.00"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-2">
              <FormField label="Desde Unidad">
                <select
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value)}
                  className="select-custom w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue font-mono"
                >
                  {utilityUnits.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                  {/* Fallback to all units if utility has none */}
                  {utilityUnits.length === 0 && getAllUnitsFromCatalog().map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Hacia Unidad">
                <select
                  value={toUnit}
                  onChange={(e) => setToUnit(e.target.value)}
                  className="select-custom w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue font-mono"
                >
                  {utilityUnits.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                  {/* Fallback to all units if utility has none */}
                  {utilityUnits.length === 0 && getAllUnitsFromCatalog().map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          {conversionResult && (
            <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Resultado Calculado</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-mono font-black text-slate-900">
                  {Number(conversionResult.result).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </span>
                <span className="text-sm font-mono font-bold text-slate-500 uppercase">{toUnit}</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium">
                {conversionResult.isEstimated ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-amber-700">Conversión Estimada (Cruce de utility / PCI)</span>
                  </>
                ) : fromUnit === toUnit ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500">Misma unidad (Escalamiento 1:1)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-emerald-700">Conversión Oficial / Exacta</span>
                  </>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Catalog Table */}
        <Card className="lg:col-span-2 p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <List className="w-5 h-5 text-brand-blue" />
              <h3 className="text-sm font-bold text-slate-900">Catálogo de Magnitudes Autorizadas</h3>
            </div>
            
            <select
              value={activeCatalogUtility}
              onChange={(e) => setActiveCatalogUtility(e.target.value)}
              className="select-custom px-3 py-1 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
            >
              <option value="all">Todas las Utilities</option>
              {utilityOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-bold text-slate-700 uppercase tracking-widest text-[9px] w-1/3">Utility</th>
                  <th className="px-4 py-2.5 font-bold text-slate-700 uppercase tracking-widest text-[9px] w-1/3">Magnitud / Dimensión</th>
                  <th className="px-4 py-2.5 font-bold text-slate-700 uppercase tracking-widest text-[9px] w-1/3">Unidades Disponibles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(UNIT_CATALOG)
                  .filter(([utility]) => activeCatalogUtility === 'all' || utility === activeCatalogUtility)
                  .map(([utility, quantities]) => (
                    Object.entries(quantities).map(([qty, units]) => {
                      if (!units || units.length === 0) return null
                      return (
                        <tr key={`${utility}-${qty}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900 capitalize">
                            {getUtilityLabel(utility)}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-500">
                            {QUANTITY_LABELS[qty as MeasurementQuantity] || qty}
                          </td>
                          <td className="px-4 py-3 flex flex-wrap gap-1">
                            {units.map((u, i) => (
                              <span
                                key={u}
                                className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                                  i === 0
                                    ? 'bg-blue-50 text-brand-blue border border-blue-100'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                                title={i === 0 ? 'Unidad por defecto para esta magnitud' : undefined}
                              >
                                {u}
                                {i === 0 && <span className="text-[8px] font-black ml-1 text-brand-blue/70">DEF</span>}
                              </span>
                            ))}
                          </td>
                        </tr>
                      )
                    })
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Conversion Constants / Formulas table */}
      <Card className="p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <ArrowRightLeft className="w-5 h-5 text-brand-blue" />
          <h3 className="text-sm font-bold text-slate-900">Constantes de Conversión e Intercambiabilidad</h3>
        </div>
        <p className="text-xs text-slate-500">
          Esta sección enumera los factores de multiplicación directa definidos en el sistema para la estandarización de balances de masa y energía.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getAllConversions().map((conv, idx) => (
            <div key={idx} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                  {conv.fromUnit}
                </span>
                <span className="text-slate-400 mx-2">→</span>
                <span className="text-xs font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                  {conv.toUnit}
                </span>
                {conv.utility && (
                  <span className="ml-2 text-[9px] font-bold text-slate-500 uppercase bg-slate-100 rounded px-1">
                    {getUtilityLabel(conv.utility)}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Multiplicador</span>
                <span className="font-mono text-xs font-bold text-slate-900">{conv.factor}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
