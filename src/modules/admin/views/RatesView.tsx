import { useEffect, useState } from 'react'
import { Card } from '@/shared/Card'
import { Plus, Zap, Droplets, Flame, Loader2, X, Save, Edit3, Calendar, Building2 } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/app/AuthProvider'
import { Modal } from '@/shared/Modal'
import { FormField } from '@/shared/FormField'
import { Button } from '@/shared/Button'
import { getUtilityLabel } from '@/shared/OperationalContext'
import { getTariffUnits } from '@/services/measurement-engine/unitCatalog'

interface Tariff {
  id: string
  site_id: string | null
  site_name?: string
  utility_type: string
  rate: number
  currency: string
  unit: string
  valid_from: string
  valid_to: string | null
}

interface EmissionFactor {
  id: string
  utility_type: string
  factor: number
  unit: string
  valid_from: string
}

interface SiteOption {
  id: string
  name: string
}

export function RatesView() {
  const { profile } = useAuth()
  
  // Data states
  const [tariffs, setTariffs] = useState<Tariff[]>([])
  const [factors, setFactors] = useState<EmissionFactor[]>([])
  const [sites, setSites] = useState<SiteOption[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [tariffModalOpen, setTariffModalOpen] = useState(false)
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null)
  
  const [factorModalOpen, setFactorModalOpen] = useState(false)
  const [editingFactor, setEditingFactor] = useState<EmissionFactor | null>(null)

  // Tariff Form state
  const [tSiteId, setTSiteId] = useState<string>('')
  const [tUtilityType, setTUtilityType] = useState('electricity')
  const [tRate, setTRate] = useState('')
  const [tCurrency, setTCurrency] = useState('MXN')
  const [tUnit, setTUnit] = useState('kWh')
  const [tValidFrom, setTValidFrom] = useState(new Date().toISOString().split('T')[0])
  const [tValidTo, setTValidTo] = useState('')

  // Factor Form state
  const [fUtilityType, setFUtilityType] = useState('electricity')
  const [fFactor, setFFactor] = useState('')
  const [fNumUnit, setFNumUnit] = useState('tCO2e')
  const [fDenUnit, setFDenUnit] = useState('MWh')
  const [fValidFrom, setFValidFrom] = useState(new Date().toISOString().split('T')[0])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Utility list for dropdown
  const UTILITY_OPTIONS = [
    { value: 'electricity', label: 'Electricidad' },
    { value: 'natural_gas', label: 'Gas Natural' },
    { value: 'lpg', label: 'Gas L.P. (GLP)' },
    { value: 'diesel', label: 'Diésel' },
    { value: 'steam', label: 'Vapor' },
    { value: 'chilled_water', label: 'Agua Helada' },
    { value: 'hot_water', label: 'Agua Caliente' },
    { value: 'potable_water', label: 'Agua Potable' },
    { value: 'industrial_water', label: 'Agua Industrial' },
  ]

  async function loadData() {
    setLoading(true)
    try {
      const [tariffsRes, factorsRes, sitesRes] = await Promise.all([
        supabase.from('energy_tariffs').select('*').order('valid_from', { ascending: false }),
        supabase.from('energy_emission_factors').select('*').order('valid_from', { ascending: false }),
        supabase.from('sites').select('id, name').order('name'),
      ])

      const rawTariffs = tariffsRes.data || []
      const rawSites = sitesRes.data || []
      
      setSites(rawSites)
      setFactors(factorsRes.data || [])

      // Map site names for tariffs display
      const mappedTariffs = rawTariffs.map(t => {
        const site = rawSites.find(s => s.id === t.site_id)
        return {
          ...t,
          rate: Number(t.rate),
          site_name: site ? site.name : 'Global de la empresa'
        }
      })
      setTariffs(mappedTariffs)

    } catch (err) {
      console.error('Error loading admin rates data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getUtilityIcon = (utility: string) => {
    switch (utility) {
      case 'electricity': return <Zap size={16} className="text-brand-blue" />
      case 'potable_water':
      case 'industrial_water':
      case 'chilled_water':
        return <Droplets size={16} className="text-cyan-600" />
      case 'natural_gas':
      case 'lpg':
      case 'steam':
        return <Flame size={16} className="text-orange-500" />
      default: return <Zap size={16} className="text-slate-400" />
    }
  }

  // Tariff Actions
  function openCreateTariff() {
    setEditingTariff(null)
    setTSiteId('')
    setTUtilityType('electricity')
    setTRate('')
    setTCurrency('MXN')
    const allowed = getTariffUnits('electricity')
    setTUnit(allowed[0] || 'kWh')
    setTValidFrom(new Date().toISOString().split('T')[0])
    setTValidTo('')
    setError(null)
    setTariffModalOpen(true)
  }

  function handleUtilityChange(utility: string) {
    setTUtilityType(utility)
    const allowed = getTariffUnits(utility)
    if (allowed.length > 0) {
      setTUnit(allowed[0])
    }
  }

  function openEditTariff(tariff: Tariff) {
    setEditingTariff(tariff)
    setTSiteId(tariff.site_id || '')
    setTUtilityType(tariff.utility_type)
    setTRate(tariff.rate.toString())
    setTCurrency(tariff.currency)
    setTUnit(tariff.unit)
    setTValidFrom(tariff.valid_from ? tariff.valid_from.split('T')[0] : new Date().toISOString().split('T')[0])
    setTValidTo(tariff.valid_to ? tariff.valid_to.split('T')[0] : '')
    setError(null)
    setTariffModalOpen(true)
  }

  async function handleSaveTariff() {
    const rateVal = parseFloat(tRate)
    if (isNaN(rateVal) || rateVal <= 0) {
      setError('Por favor, ingresa un costo unitario válido mayor a cero.')
      return
    }
    if (!profile?.company_id) {
      setError('No se pudo determinar la compañía.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const payload = {
        company_id: profile.company_id,
        site_id: tSiteId || null,
        utility_type: tUtilityType,
        rate: rateVal,
        currency: tCurrency,
        unit: tUnit,
        valid_from: new Date(tValidFrom).toISOString(),
        valid_to: tValidTo ? new Date(tValidTo).toISOString() : null,
      }

      if (editingTariff) {
        const { error: err } = await supabase
          .from('energy_tariffs')
          .update({
            ...payload,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTariff.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('energy_tariffs')
          .insert(payload)
        if (err) throw err
      }

      setTariffModalOpen(false)
      await loadData()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al guardar la tarifa.')
    } finally {
      setSaving(false)
    }
  }

  // Factor Actions
  function openCreateFactor() {
    setEditingFactor(null)
    setFUtilityType('electricity')
    setFFactor('')
    setFNumUnit('tCO2e')
    const allowed = getTariffUnits('electricity')
    setFDenUnit(allowed[0] || 'MWh')
    setFValidFrom(new Date().toISOString().split('T')[0])
    setError(null)
    setFactorModalOpen(true)
  }

  function openEditFactor(factor: EmissionFactor) {
    setEditingFactor(factor)
    setFUtilityType(factor.utility_type)
    setFFactor(factor.factor.toString())
    
    // Parse unit
    const parts = factor.unit.split('/')
    if (parts.length === 2) {
      setFNumUnit(parts[0])
      setFDenUnit(parts[1])
    } else {
      setFNumUnit('tCO2e')
      setFDenUnit(factor.unit || 'MWh')
    }

    setFValidFrom(factor.valid_from ? factor.valid_from.split('T')[0] : new Date().toISOString().split('T')[0])
    setError(null)
    setFactorModalOpen(true)
  }

  function handleFactorUtilityChange(utility: string) {
    setFUtilityType(utility)
    const allowed = getTariffUnits(utility)
    if (allowed.length > 0) {
      setFDenUnit(allowed[0])
    }
  }

  async function handleSaveFactor() {
    const factorVal = parseFloat(fFactor)
    if (isNaN(factorVal) || factorVal < 0) {
      setError('Por favor, ingresa un factor válido.')
      return
    }
    if (!profile?.company_id) {
      setError('No se pudo determinar la compañía.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const combinedUnit = `${fNumUnit}/${fDenUnit}`
      const payload = {
        company_id: profile.company_id,
        utility_type: fUtilityType,
        factor: factorVal,
        unit: combinedUnit,
        valid_from: new Date(fValidFrom).toISOString(),
      }

      if (editingFactor) {
        const { error: err } = await supabase
          .from('energy_emission_factors')
          .update({
            ...payload,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingFactor.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('energy_emission_factors')
          .insert(payload)
        if (err) throw err
      }

      setFactorModalOpen(false)
      await loadData()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al guardar el factor.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {loading ? (
        <div className="flex items-center justify-center p-24">
          <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
        </div>
      ) : (
        <>
          {/* Tarifas */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Tarifas Energéticas</h2>
                <p className="text-xs text-slate-500">Configura tarifas válidas por intervalos temporales (diario, semanal, mensual) para el cálculo del costo real.</p>
              </div>
              <button
                onClick={openCreateTariff}
                className="flex items-center gap-2 bg-brand-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                <Plus size={16} />
                <span>Nueva Tarifa</span>
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 font-bold text-slate-700 uppercase tracking-widest text-[9px]">Utility</th>
                    <th className="px-5 py-3 font-bold text-slate-700 uppercase tracking-widest text-[9px]">Ámbito / Planta</th>
                    <th className="px-5 py-3 font-bold text-slate-700 uppercase tracking-widest text-[9px]">Período de Vigencia</th>
                    <th className="px-5 py-3 font-bold text-slate-700 uppercase tracking-widest text-[9px] text-right">Costo Unitario</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tariffs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-medium">
                        Sin tarifas registradas. Agrega una nueva tarifa temporal.
                      </td>
                    </tr>
                  ) : (
                    tariffs.map(tariff => (
                      <tr key={tariff.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {getUtilityIcon(tariff.utility_type)}
                            <span className="font-bold text-slate-900">{getUtilityLabel(tariff.utility_type)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-600 font-medium">{tariff.site_name}</td>
                        <td className="px-5 py-3 text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <Calendar size={13} className="text-slate-400" />
                          <span>
                            {new Date(tariff.valid_from).toLocaleDateString()} - {tariff.valid_to ? new Date(tariff.valid_to).toLocaleDateString() : 'Presente'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="font-mono font-bold text-slate-900">${Number(tariff.rate).toFixed(4)}</span>
                          <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">{tariff.currency} / {tariff.unit}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => openEditTariff(tariff)}
                            className="text-brand-blue font-bold hover:text-blue-700 cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <Edit3 size={11} />
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Factores de emisión */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Factores de Emisión de CO₂e</h2>
                <p className="text-xs text-slate-500">Parámetros oficiales por vigencia temporal para el cálculo de la huella de carbono.</p>
              </div>
              <button
                onClick={openCreateFactor}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm"
              >
                <Plus size={16} />
                <span>Nuevo Factor</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {factors.length === 0 ? (
                <div className="col-span-full border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
                  Sin factores de emisión registrados.
                </div>
              ) : (
                factors.map(factor => (
                  <Card key={factor.id} className="p-4 hover:border-slate-300 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                        {getUtilityIcon(factor.utility_type)}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">{getUtilityLabel(factor.utility_type)}</h3>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Desde: {new Date(factor.valid_from).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="font-mono font-bold text-slate-900 text-sm">{factor.factor}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{factor.unit}</p>
                      </div>
                      <button
                        onClick={() => openEditFactor(factor)}
                        className="p-1 text-slate-400 hover:text-brand-blue cursor-pointer rounded hover:bg-slate-50"
                        title="Editar"
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </section>
        </>
      )}

      {/* Tariff Modal */}
      <Modal
        open={tariffModalOpen}
        onClose={() => setTariffModalOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-white shadow-md shadow-slate-900/10">
              <Zap size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900">
                {editingTariff ? 'Editar Tarifa' : 'Nueva Tarifa Energética'}
              </h3>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {editingTariff ? 'Modifica los parámetros de cobro' : 'Define un intervalo de vigencia y costo'}
              </p>
            </div>
          </div>
        }
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTariffModalOpen(false)} rightIcon={<X size={13} />} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTariff} loading={saving} rightIcon={<Save size={13} />}>
              {editingTariff ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <FormField label="Ámbito de Aplicación">
            <select
              value={tSiteId}
              onChange={(e) => setTSiteId(e.target.value)}
              className="select-custom w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
            >
              <option value="">Global (Toda la Empresa)</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Utility" required>
            <select
              value={tUtilityType}
              onChange={(e) => handleUtilityChange(e.target.value)}
              className="select-custom w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
            >
              {UTILITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <FormField label="Costo Unitario" required>
                <input
                  type="number"
                  step="0.0001"
                  value={tRate}
                  onChange={(e) => setTRate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
                  placeholder="Ej: 2.1534"
                />
              </FormField>
            </div>
            <div>
              <FormField label="Moneda" required>
                <select
                  value={tCurrency}
                  onChange={(e) => setTCurrency(e.target.value)}
                  className="select-custom w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </FormField>
            </div>
          </div>

          <FormField label="Unidad de Medida" required>
            <select
              value={tUnit}
              onChange={(e) => setTUnit(e.target.value)}
              className="select-custom w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue font-mono"
            >
              {getTariffUnits(tUtilityType).map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Vigente Desde" required>
              <input
                type="date"
                value={tValidFrom}
                onChange={(e) => setTValidFrom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
              />
            </FormField>
            <FormField label="Vigente Hasta (Opcional)">
              <input
                type="date"
                value={tValidTo}
                onChange={(e) => setTValidTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
              />
            </FormField>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            * Temporalidad: Para tarifas mensuales, establece la vigencia del primer al último día del mes. Para tarifas fijas u continuas, puedes dejar el campo "Vigente Hasta" en blanco.
          </p>
        </div>
      </Modal>

      {/* Emission Factor Modal */}
      <Modal
        open={factorModalOpen}
        onClose={() => setFactorModalOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-white shadow-md shadow-slate-900/10">
              <Building2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900">
                {editingFactor ? 'Editar Factor' : 'Nuevo Factor de Emisión'}
              </h3>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {editingFactor ? 'Modifica el factor de CO2e' : 'Define la constante de CO2e por unidad consumida'}
              </p>
            </div>
          </div>
        }
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFactorModalOpen(false)} rightIcon={<X size={13} />} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFactor} loading={saving} rightIcon={<Save size={13} />}>
              {editingFactor ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <FormField label="Utility" required>
            <select
              value={fUtilityType}
              onChange={(e) => handleFactorUtilityChange(e.target.value)}
              className="select-custom w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
            >
              {UTILITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Factor de Emisión" required>
            <input
              type="number"
              step="0.000001"
              value={fFactor}
              onChange={(e) => setFFactor(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
              placeholder="Ej: 0.435"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Unidad de Emisiones (CO2e)" required>
              <select
                value={fNumUnit}
                onChange={(e) => setFNumUnit(e.target.value)}
                className="select-custom w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue font-mono"
              >
                <option value="tCO2e">tCO2e (Tonelada)</option>
                <option value="kgCO2e">kgCO2e (Kilogramo)</option>
                <option value="lbCO2e">lbCO2e (Libra)</option>
                <option value="gCO2e">gCO2e (Gramo)</option>
              </select>
            </FormField>
            <FormField label="Unidad de Consumo (Utility)" required>
              <select
                value={fDenUnit}
                onChange={(e) => setFDenUnit(e.target.value)}
                className="select-custom w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue font-mono"
              >
                {getTariffUnits(fUtilityType).map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Vigente Desde" required>
            <input
              type="date"
              value={fValidFrom}
              onChange={(e) => setFValidFrom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-blue/10 focus:border-brand-blue"
            />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
