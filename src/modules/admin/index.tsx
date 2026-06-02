import { PageHeader } from '@/shared/PageHeader'
import { EmptyState } from '@/shared/EmptyState'
import { Settings } from 'lucide-react'

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        title="Administración"
        description="Gestión de usuarios, sitios y configuración"
      />
      <EmptyState
        icon={<Settings size={48} strokeWidth={1.5} />}
        title="Administración en construcción"
        description="La administración de usuarios y sitios estará disponible próximamente."
      />
    </div>
  )
}
