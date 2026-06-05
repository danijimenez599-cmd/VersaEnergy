import { ExplorerHome } from './explorer/ExplorerHome'
import { useUIStore } from '@/store/uiStore'

export default function MapaPage() {
  const { selectedSiteId, availableSites } = useUIStore()
  const siteName = availableSites.find((s) => s.id === selectedSiteId)?.name ?? 'Planta'

  return (
    <ExplorerHome
      siteId={selectedSiteId ?? ''}
      siteName={siteName}
      diagrams={[]}
      onOpenDiagram={() => {}}
      onCreateDiagramForScope={() => {}}
      onCreateNew={() => {}}
    />
  )
}
