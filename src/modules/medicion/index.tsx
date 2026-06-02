import { PageHeader } from '@/shared/PageHeader'
import { EmptyState } from '@/shared/EmptyState'
import { Gauge } from 'lucide-react'

export default function MedicionPage() {
  return (
    <div>
      <PageHeader
        title="Medición"
        description="Lecturas, importación CSV y calidad de datos"
      />
      <EmptyState
        icon={<Gauge size={48} strokeWidth={1.5} />}
        title="Medición en construcción"
        description="La gestión de lecturas y acumuladores estará disponible en la Fase 5."
      />
    </div>
  )
}
