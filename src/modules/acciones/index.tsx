import { PageHeader } from '@/shared/PageHeader'
import { EmptyState } from '@/shared/EmptyState'
import { Zap } from 'lucide-react'

export default function AccionesPage() {
  return (
    <div>
      <PageHeader
        title="Acciones de Ahorro"
        description="Gestión de proyectos y acciones de eficiencia"
      />
      <EmptyState
        icon={<Zap size={48} strokeWidth={1.5} />}
        title="Acciones en construcción"
        description="El sistema Kanban de acciones estará disponible en la Fase 8."
      />
    </div>
  )
}
