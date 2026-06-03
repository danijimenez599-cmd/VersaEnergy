import { EmptyState } from '@/shared/EmptyState'
import { useUIStore } from '@/store/uiStore'
import { PlantAssetTreeView } from './views/PlantAssetTreeView'
import { OperationalContextBanner } from '@/shared/OperationalContext'

export default function ModeloPage() {
  const { selectedSiteId, selectedUtilityType } = useUIStore()

  if (!selectedSiteId) {
    return (
      <div>
        <OperationalContextBanner />
        <EmptyState
          title="Selecciona un sitio"
          description="Selecciona o crea una planta para navegar su arbol de activos."
        />
      </div>
    )
  }

  return (
    <div className="h-full">
      <PlantAssetTreeView siteId={selectedSiteId} utilityType={selectedUtilityType} />
    </div>
  )
}
