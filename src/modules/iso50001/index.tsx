import { PageHeader } from '@/shared/PageHeader'
import { EmptyState } from '@/shared/EmptyState'
import { Shield } from 'lucide-react'

export default function Iso50001Page() {
  return (
    <div>
      <PageHeader
        title="ISO 50001"
        description="Workspace del sistema de gestión energética"
      />
      <EmptyState
        icon={<Shield size={48} strokeWidth={1.5} />}
        title="ISO 50001 en construcción"
        description="El workspace ISO 50001 estará disponible en la Fase 9."
      />
    </div>
  )
}
