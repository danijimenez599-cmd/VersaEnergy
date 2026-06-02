import { Badge } from '@/shared/Badge'

const labels: Record<string, string> = {
  draft: 'Borrador',
  in_review: 'En revisión',
  approved: 'Aprobado',
  archived: 'Archivado',
  candidate: 'Candidato',
  active: 'Activo',
  monitoring: 'Monitoreo',
  retired: 'Retirado',
  planned: 'Planificado',
  in_progress: 'En progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
  open: 'Abierto',
  closed: 'Cerrado',
  resolved: 'Resuelto',
  addressed: 'Atendido',
  achieved: 'Alcanzado',
  accepted: 'Aceptado',
  suggested: 'Sugerido',
  rejected: 'Rechazado',
  superseded: 'Reemplazado',
  observation: 'Observación',
  minor: 'Menor',
  major: 'Mayor',
  critical: 'Crítico',
}

const colors: Record<string, string> = {
  draft: 'gray', in_review: 'orange', approved: 'green', archived: 'gray',
  candidate: 'purple', active: 'blue', monitoring: 'teal', retired: 'gray',
  planned: 'gray', in_progress: 'teal', completed: 'green', cancelled: 'red',
  open: 'orange', closed: 'green', resolved: 'green', addressed: 'blue',
  achieved: 'green', accepted: 'green', suggested: 'cyan',
  rejected: 'red', superseded: 'gray',
  observation: 'gray', minor: 'orange', major: 'red', critical: 'red',
}

export function SgenStatusBadge({ status }: { status: string }) {
  return (
    <Badge color={(colors[status] || 'gray') as 'blue'} size="sm">
      {labels[status] || status}
    </Badge>
  )
}
