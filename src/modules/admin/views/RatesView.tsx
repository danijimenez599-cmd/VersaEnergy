import { Card } from '@/shared/Card'
import { Plus, Zap, Droplets, Flame } from 'lucide-react'

export function RatesView() {
  const rates = [
    { id: '1', utility: 'electricity', label: 'Electricidad', rate: 2.15, currency: 'MXN', unit: 'kWh', type: 'Tarifa Horaria (GDMTH)' },
    { id: '2', utility: 'water', label: 'Agua Industrial', rate: 15.50, currency: 'MXN', unit: 'm³', type: 'Cuota Fija' },
    { id: '3', utility: 'natural_gas', label: 'Gas Natural', rate: 8.90, currency: 'MXN', unit: 'GJ', type: 'Mercado Abierto' }
  ]

  const factors = [
    { id: '1', utility: 'electricity', label: 'Electricidad', factor: 0.435, unit: 'tCO2e/MWh', source: 'CRE 2024' },
    { id: '2', utility: 'natural_gas', label: 'Gas Natural', factor: 0.0561, unit: 'tCO2e/GJ', source: 'IPCC' }
  ]

  const getUtilityIcon = (utility: string) => {
    switch (utility) {
      case 'electricity': return <Zap size={18} className="text-brand-blue" />
      case 'water': return <Droplets size={18} className="text-cyan-600" />
      case 'natural_gas': return <Flame size={18} className="text-orange-500" />
      default: return <Zap size={18} />
    }
  }

  return (
    <div className="space-y-8">
      {/* Tarifas */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Tarifas Energéticas</h2>
            <p className="text-sm text-gray-500">Configura el costo unitario por utility para el cálculo de balances.</p>
          </div>
          <button className="flex items-center gap-2 bg-brand-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
            <Plus size={16} />
            <span>Nueva Tarifa</span>
          </button>
        </div>

        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="px-5 py-3 font-semibold text-gray-900">Utility</th>
                <th className="px-5 py-3 font-semibold text-gray-900">Tipo de Tarifa</th>
                <th className="px-5 py-3 font-semibold text-gray-900 text-right">Costo Unitario</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rates.map(rate => (
                <tr key={rate.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {getUtilityIcon(rate.utility)}
                      <span className="font-medium text-gray-900">{rate.label}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{rate.type}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="font-bold text-gray-900">${rate.rate.toFixed(2)}</span>
                    <span className="text-gray-500 ml-1">{rate.currency} / {rate.unit}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button className="text-brand-blue font-medium hover:underline cursor-pointer">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Factores de emisión */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Factores de Emisión</h2>
            <p className="text-sm text-gray-500">Parámetros para la conversión de consumo a huella de carbono.</p>
          </div>
          <button className="flex items-center gap-2 bg-white border border-border hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
            <Plus size={16} />
            <span>Nuevo Factor</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {factors.map(factor => (
            <Card key={factor.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                  {getUtilityIcon(factor.utility)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{factor.label}</h3>
                  <p className="text-xs text-gray-500">Fuente: {factor.source}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{factor.factor}</p>
                <p className="text-xs text-gray-500">{factor.unit}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
