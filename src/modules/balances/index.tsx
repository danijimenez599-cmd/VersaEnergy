import { PageHeader } from '@/shared/PageHeader'
import { EmptyState } from '@/shared/EmptyState'
import { Scale } from 'lucide-react'

export default function BalancesPage() {
  return (
    <div>
      <PageHeader
        title="Balances"
        description="Cálculo de balances de utilities por periodo"
      />
      <EmptyState
        icon={<Scale size={48} strokeWidth={1.5} />}
        title="Balances en construcción"
        description="El motor de balances con overlays visuales estará disponible en la Fase 6."
      />
    </div>
  )
}
