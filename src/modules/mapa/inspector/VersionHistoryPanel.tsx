import { useEffect, useState } from 'react'
import { History, RotateCcw, X, CheckCircle2, Clock } from 'lucide-react'
import { listVersions, type DiagramVersionMeta } from '@/services/diagramVersions'
import { Button } from '@/shared/Button'

interface Props {
  diagramId: string
  /** Para refrescar el listado cuando cambia (ej. tras guardar) */
  refreshKey?: number
  onClose: () => void
  onRestore: (versionId: string, versionNumber: number) => void
}

function relativeDate(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'hace instantes'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const days = Math.floor(h / 24)
  if (days < 30) return `hace ${days} d`
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function VersionHistoryPanel({ diagramId, refreshKey, onClose, onRestore }: Props) {
  const [versions, setVersions] = useState<DiagramVersionMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listVersions(diagramId).then((v) => {
      if (!cancelled) { setVersions(v); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [diagramId, refreshKey])

  return (
    <div className="w-80 bg-white border-l border-[--color-border-strong] h-full flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[--color-border-strong] shrink-0">
        <div className="flex items-center gap-2">
          <History size={15} className="text-brand" />
          <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            Historial de versiones
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer">
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[--color-border-strong] bg-gray-50 p-5 text-center">
            <Clock size={22} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-500">
              Aún no hay versiones. Cada vez que guardes el diagrama se creará un snapshot automático aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map((v, idx) => (
              <div
                key={v.id}
                className={[
                  'rounded-xl border p-3 transition-colors',
                  idx === 0 ? 'border-brand/30 bg-brand/5' : 'border-[--color-border-strong] bg-white hover:bg-gray-50',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-black text-gray-700" style={{ fontFamily: 'var(--font-display)' }}>
                      v{v.version_number}
                    </span>
                    {idx === 0 && (
                      <span className="text-[9px] font-bold bg-brand/10 text-brand px-1.5 py-0.5 rounded-full">ACTUAL</span>
                    )}
                    {v.is_published && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-[--color-ok-bg] text-[--color-ok] px-1.5 py-0.5 rounded-full">
                        <CheckCircle2 size={9} /> PUBLICADA
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">{relativeDate(v.created_at)}</span>
                </div>

                <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                  <span>{v.node_count} nodos</span>
                  <span>·</span>
                  <span>{v.edge_count} conexiones</span>
                </div>

                {v.label && <p className="mt-1 text-xs text-gray-600">{v.label}</p>}

                {idx !== 0 && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="xs"
                      variant="outline"
                      leftIcon={<RotateCcw size={11} />}
                      onClick={() => onRestore(v.id, v.version_number)}
                    >
                      Restaurar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[--color-border-strong] px-4 py-2.5 bg-gray-50/60">
        <p className="text-[10px] text-gray-400 leading-relaxed">
          Cada guardado crea una versión. Restaurar carga ese estado al lienzo; al guardar se registra como una nueva versión.
        </p>
      </div>
    </div>
  )
}
