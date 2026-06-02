import { PageHeader } from '@/shared/PageHeader'
import { EmptyState } from '@/shared/EmptyState'
import { FileText } from 'lucide-react'

export default function ReportesPage() {
  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Generación de reportes PDF y exportación CSV/JSON"
      />
      <EmptyState
        icon={<FileText size={48} strokeWidth={1.5} />}
        title="Reportes en construcción"
        description="Los reportes PDF y exports estarán disponibles en la Fase 10."
      />
    </div>
  )
}
