import { Outlet } from 'react-router-dom'
import {
  Factory, Layers, Network, Settings,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { ASSET_TYPE_LABELS } from '@/shared/assetHelpers'

// ── Icon mapping ──────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ElementType> = {
  plant:     Factory,
  area:      Layers,
  system:    Network,
  equipment: Settings,
}

export function AssetDetail() {
  const { selectedAssetSourceId, selectedAssetType, selectedAssetName, selectedAssetCode } = useUIStore()

  const TypeIcon = selectedAssetType ? (TYPE_ICONS[selectedAssetType] ?? Factory) : Factory
  const typeLabel = selectedAssetType
    ? (ASSET_TYPE_LABELS as Record<string, string>)[selectedAssetType] ?? selectedAssetType
    : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Asset header context block */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 shrink-0 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0 border border-brand-blue/5">
            <TypeIcon size={16} className="text-brand-blue" />
          </div>
          <div className="min-w-0 flex-1">
            {typeLabel && (
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-0.5">
                {typeLabel}
              </p>
            )}
            {selectedAssetSourceId ? (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm truncate leading-tight">
                  {selectedAssetName}
                </span>
                {selectedAssetCode && (
                  <span className="px-1.5 py-0.5 bg-slate-900 text-white rounded font-mono text-[9px] font-bold">
                    TAG: {selectedAssetCode}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Selecciona un activo en el árbol</p>
            )}
          </div>
        </div>
      </div>

      {/* Lens content */}
      <div className="flex-1 overflow-y-auto bg-slate-50/20">
        <Outlet />
      </div>
    </div>
  )
}
