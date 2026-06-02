import { PageHeader } from '@/shared/PageHeader'
import { EmptyState } from '@/shared/EmptyState'
import { TrendingUp } from 'lucide-react'

export default function DesempenoPage() {
  return (
    <div>
      <PageHeader
        title="Desempeño Energético"
        description="EnPI, líneas base y objetivos de reducción"
      />
      <EmptyState
        icon={<TrendingUp size={48} strokeWidth={1.5} />}
        title="Desempeño en construcción"
        description="Los indicadores EnPI y baselines estarán disponibles en la Fase 7."
      />
    </div>
  )
}
