import { Card } from '@/shared/Card'
import { Building2, Plus, CheckCircle2, AlertCircle } from 'lucide-react'

export function SitesView() {
  // Mock data para MP-R5
  const sites = [
    {
      id: '1',
      name: 'Planta Norte',
      code: 'PLN-01',
      location: 'Monterrey, NL',
      isReady: true,
    },
    {
      id: '2',
      name: 'Centro de Distribución Sur',
      code: 'CDS-02',
      location: 'CDMX',
      isReady: false,
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Sitios y Organización</h2>
          <p className="text-sm text-gray-500">Configura los sitios físicos y su vinculación con el CMMS.</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
          <Plus size={16} />
          <span>Nuevo Sitio</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sites.map(site => (
          <Card key={site.id} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{site.name}</h3>
                  <p className="text-xs text-gray-500">{site.location}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                {site.code}
              </span>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              {site.isReady ? (
                <div className="flex items-center gap-1.5 text-status-success">
                  <CheckCircle2 size={16} />
                  <span className="text-sm font-medium">Listo para operar</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-status-warning">
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">Falta configurar tarifas</span>
                </div>
              )}
              <button className="text-sm font-medium text-brand-blue hover:text-blue-700 cursor-pointer">
                Editar
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
