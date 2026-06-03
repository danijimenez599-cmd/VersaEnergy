import { Card } from '@/shared/Card'
import { Info, Save } from 'lucide-react'

export function SettingsView() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Parámetros del Sistema</h2>
          <p className="text-sm text-gray-500">Configuraciones globales que afectan a todos los sitios de la empresa.</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
          <Save size={16} />
          <span>Guardar Cambios</span>
        </button>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Umbrales de Calidad de Datos</h3>
          <p className="text-sm text-gray-500 mb-4">
            Definen cuándo el sistema marca un balance o una métrica como poco confiable.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alerta de calidad general (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  defaultValue={80}
                  className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Si la calidad del dato baja de este valor, se dispara una advertencia.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alerta de uso no explicado (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  defaultValue={10}
                  className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Límite para la tolerancia de pérdidas no medidas en un balance.</p>
            </div>
          </div>
        </div>

        <hr className="border-border" />

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Módulo SGEn (ISO 50001)</h3>
          <p className="text-sm text-gray-500 mb-4">
            Parámetros utilizados por el asistente del Sistema de Gestión de Energía.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Período energético por defecto</label>
            <select className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20">
              <option value="monthly">Mensual</option>
              <option value="quarterly">Trimestral</option>
              <option value="annual">Anual</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
        <Info size={20} className="text-blue-600 shrink-0" />
        <div>
          <h4 className="text-sm font-medium text-blue-900">Configuración global vs local</h4>
          <p className="text-xs text-blue-700 mt-1">
            Estos parámetros se aplican a toda la compañía. Algunos sitios pueden sobreescribir configuraciones específicas desde su propia pestaña de configuración, pero estos valores actuarán como defecto.
          </p>
        </div>
      </div>
    </div>
  )
}
