import { useUIStore } from '@/store/uiStore'
import { CalendarClock, CheckCircle, ShieldAlert } from 'lucide-react'

// Placeholder for future connection to CMMS pm engine.
export function AssetMaintenance() {
  const { selectedAssetId } = useUIStore()

  if (!selectedAssetId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p>Selecciona un activo para ver su plan de mantenimiento y calibración.</p>
      </div>
    )
  }

  // En un activo de tipo instrumento/medidor, se mostraría el PM de calibración.
  // Aquí usamos un mock para la fase MP-R4.
  const isMeter = true // mock

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-gray-900">Mantenimiento de Instrumento</h2>
          <p className="text-sm text-gray-500">Planes de calibración y verificación vinculados (Motor CMMS)</p>
        </div>
        <button className="bg-brand-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
          Programar Calibración
        </button>
      </div>

      {!isMeter ? (
        <div className="bg-white border border-border rounded-xl p-6 text-center text-gray-500">
          Este activo no es un instrumento medidor. El mantenimiento general se gestiona en VersaMaint.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Estado de Calibración</p>
                <p className="text-lg font-bold text-gray-900">Vigente</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 border-t border-gray-100 pt-3">
              Impacto en la calidad del dato: <span className="text-green-600 font-medium">Confiable</span>
            </p>
          </div>

          <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <CalendarClock size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Próxima Verificación</p>
                <p className="text-lg font-bold text-gray-900">15 Oct 2026</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 border-t border-gray-100 pt-3">
              Plan metrológico (Trimestral)
            </p>
          </div>

          <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                <ShieldAlert size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Última Calibración</p>
                <p className="text-lg font-bold text-gray-900">10 Ene 2026</p>
              </div>
            </div>
            <p className="text-xs text-brand-blue mt-3 border-t border-gray-100 pt-3 cursor-pointer hover:underline">
              Ver Certificado PDF
            </p>
          </div>
        </div>
      )}

      {/* Mock PM List */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-gray-50/50">
          <h3 className="text-sm font-bold text-gray-900">Paquetes PM (Asset Plans)</h3>
        </div>
        <div className="divide-y divide-border">
          <div className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
            <div>
              <p className="text-sm font-semibold text-gray-900">Calibración Anual contra patrón</p>
              <p className="text-xs text-gray-500 mt-1">Gatillo: Calendario (cada 12 meses)</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-900">Ciclo actual: 2</p>
              <p className="text-xs text-gray-500">Último cierre: 10 Ene 2026</p>
            </div>
          </div>
          <div className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
            <div>
              <p className="text-sm font-semibold text-gray-900">Verificación de deriva</p>
              <p className="text-xs text-gray-500 mt-1">Gatillo: Calendario (cada 3 meses)</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-900">Ciclo actual: 6</p>
              <p className="text-xs text-gray-500">Último cierre: 15 Jul 2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
