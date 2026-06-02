import { PageHeader } from '@/shared/PageHeader'
import { EmptyState } from '@/shared/EmptyState'

export default function InicioPage() {
  return (
    <div>
      <PageHeader
        title="Inicio"
        description="Dashboard principal de Energy & Utilities"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Consumo total', 'Costo energético', 'Emisiones CO₂', 'Ahorro acumulado'].map((metric) => (
          <div
            key={metric}
            className="bg-surface border border-border rounded-(--radius-card) shadow-card p-5 animate-pulse"
          >
            <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        ))}
      </div>
      <EmptyState
        title="Dashboard en construcción"
        description="El cockpit de utilities estará disponible en una fase posterior."
        className="mt-8"
      />
    </div>
  )
}
