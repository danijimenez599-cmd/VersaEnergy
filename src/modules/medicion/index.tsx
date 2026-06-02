import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabase'
import { PageHeader } from '@/shared/PageHeader'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { Card } from '@/shared/Card'
import { EmptyState } from '@/shared/EmptyState'
import { useUIStore } from '@/store/uiStore'
import { OperationalContextBanner, OperationalContextSummary, getEnergyPeriodRange } from '@/shared/OperationalContext'
import { validateReadingsBatch, detectGaps } from '@/services/measurement-engine/quality'
import {
  Plus, Upload, Table, ShieldCheck, Gauge, CheckCircle,
  AlertTriangle, XCircle, Save, Package,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MP {
  id: string; tag: string; name: string; utility: string
  measurement_type: string; quantity: string; unit: string
  accumulator_config: Record<string, unknown>
}

interface RawReading {
  id: string; timestamp: string; value: number; unit: string; source: string
  import_batch_id?: string
}

interface ValidatedReading {
  id: string; timestamp: string; value: number; unit: string
  status: string; delta_value?: number; quality_flags: Record<string, unknown>
}

interface ImportBatch {
  id: string; file_name: string; row_count: number; valid_count: number
  error_count: number; status: string; created_at: string
  errors: { row: number; issues: { field: string; message: string }[] }[]
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'capture',     label: 'Captura',       icon: Plus },
  { id: 'imports',     label: 'Importaciones', icon: Package },
  { id: 'quality',     label: 'Calidad',       icon: ShieldCheck },
  { id: 'validated',   label: 'Validadas',     icon: CheckCircle },
]

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function MedicionPage() {
  const [activeTab, setActiveTab] = useState('capture')
  const [points, setPoints] = useState<MP[]>([])
  const [selectedPoint, setSelectedPoint] = useState<string>('')
  const [rawReadings, setRawReadings] = useState<RawReading[]>([])
  const [validatedReadings, setValidatedReadings] = useState<ValidatedReading[]>([])
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [loading, setLoading] = useState(false)
  const { selectedSiteId, selectedUtilityType, selectedPeriod } = useUIStore()

  useEffect(() => {
    if (!selectedSiteId) { setPoints([]); setSelectedPoint(''); return }
    let q = supabase.from('measurement_points').select('*').eq('site_id', selectedSiteId).order('tag')
    if (selectedUtilityType) q = q.eq('utility', selectedUtilityType)
    q.then(({ data }) => setPoints(data || []))
  }, [selectedSiteId, selectedUtilityType])

  useEffect(() => {
    if (selectedPoint && !points.some((p) => p.id === selectedPoint)) setSelectedPoint('')
  }, [points, selectedPoint])

  const loadReadings = useCallback(async () => {
    if (!selectedPoint) return
    setLoading(true)
    const { startIso, endIso } = getEnergyPeriodRange(selectedPeriod)
    const [{ data: raw }, { data: validated }] = await Promise.all([
      supabase.from('energy_readings_raw')
        .select('*').eq('measurement_point_id', selectedPoint)
        .gte('timestamp', startIso).lt('timestamp', endIso)
        .order('timestamp', { ascending: false }).limit(100),
      supabase.from('energy_readings_validated')
        .select('*').eq('measurement_point_id', selectedPoint)
        .gte('timestamp', startIso).lt('timestamp', endIso)
        .order('timestamp', { ascending: false }).limit(100),
    ])
    setRawReadings(raw || [])
    setValidatedReadings(validated || [])
    setLoading(false)
  }, [selectedPeriod, selectedPoint])

  useEffect(() => { loadReadings() }, [loadReadings])

  const loadBatches = useCallback(async () => {
    if (!selectedSiteId) return
    const { data } = await supabase.from('energy_import_batches')
      .select('*').eq('site_id', selectedSiteId)
      .order('created_at', { ascending: false }).limit(20)
    setBatches(data || [])
  }, [selectedSiteId])

  useEffect(() => { loadBatches() }, [loadBatches])

  const point = points.find((p) => p.id === selectedPoint)

  return (
    <div>
      <PageHeader title="Medición" description="Captura, importación, calidad y lecturas validadas" />
      <OperationalContextSummary />
      <OperationalContextBanner />

      {/* Point selector */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <label className="text-sm text-gray-600">Punto de medición:</label>
        <select
          value={selectedPoint}
          onChange={(e) => setSelectedPoint(e.target.value)}
          className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface cursor-pointer max-w-xs"
        >
          <option value="">Seleccionar...</option>
          {points.map((p) => (
            <option key={p.id} value={p.id}>{p.tag} — {p.name} ({p.utility})</option>
          ))}
        </select>
        {point && (
          <div className="flex items-center gap-2">
            <Gauge size={14} className="text-brand-blue" />
            <span className="text-sm font-medium font-mono text-brand-blue">{point.tag}</span>
            <Badge color="blue" size="sm">{point.measurement_type}</Badge>
            <Badge color="teal" size="sm">{point.utility}</Badge>
            <span className="text-xs text-gray-400">{point.quantity} · {point.unit}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-4">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === t.id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'capture' && (
        <CaptureTab point={point} onSave={loadReadings} rawReadings={rawReadings} loading={loading} />
      )}
      {activeTab === 'imports' && (
        <ImportsTab points={points} siteId={selectedSiteId || ''} batches={batches} onImportComplete={() => { loadReadings(); loadBatches() }} />
      )}
      {activeTab === 'quality' && (
        <QualityTab points={points} siteId={selectedSiteId || ''} selectedPeriod={selectedPeriod} />
      )}
      {activeTab === 'validated' && (
        <ValidatedTab readings={validatedReadings} loading={loading} point={point} />
      )}
    </div>
  )
}

// ─── Tab: Captura ─────────────────────────────────────────────────────────────

function CaptureTab({ point, onSave, rawReadings, loading }: {
  point: MP | undefined; onSave: () => void
  rawReadings: RawReading[]; loading: boolean
}) {
  const [value, setValue] = useState('')
  const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16))
  const [saving, setSaving] = useState(false)
  const [deltaPreview, setDeltaPreview] = useState<number | null>(null)

  // Preview delta for accumulators
  useEffect(() => {
    if (!point || point.measurement_type !== 'accumulator' || !value) { setDeltaPreview(null); return }
    const sorted = [...rawReadings].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const last = sorted[0]?.value
    if (last !== undefined) {
      const curr = parseFloat(value)
      if (!isNaN(curr)) setDeltaPreview(curr - last)
      else setDeltaPreview(null)
    }
  }, [value, rawReadings, point])

  if (!point) return <EmptyState title="Selecciona un punto" description="Elige un punto de medición para ingresar lecturas." />

  async function handleSave() {
    const v = parseFloat(value)
    if (isNaN(v)) return
    setSaving(true)
    await supabase.from('energy_readings_raw').upsert({
      measurement_point_id: point!.id,
      timestamp: new Date(timestamp).toISOString(),
      value: v, unit: point!.unit, source: 'manual',
    }, { onConflict: 'measurement_point_id, timestamp' })
    setValue(''); setSaving(false); onSave()
  }

  const isNegativeDelta = deltaPreview !== null && deltaPreview < 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Nueva lectura — {point.unit}</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha y hora</label>
              <input type="datetime-local" value={timestamp} onChange={(e) => setTimestamp(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valor ({point.unit})</label>
              <input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
            </div>
          </div>

          {/* Delta preview for accumulators */}
          {point.measurement_type === 'accumulator' && deltaPreview !== null && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
              isNegativeDelta ? 'bg-red-50 border border-red-100 text-red-700' : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
            }`}>
              {isNegativeDelta ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
              Delta calculado: {deltaPreview > 0 ? '+' : ''}{deltaPreview.toFixed(3)} {point.unit}
              {isNegativeDelta && ' — posible reset o lectura incorrecta'}
            </div>
          )}

          <Button size="sm" leftIcon={<Save size={14} />} onClick={handleSave} loading={saving}>
            Guardar lectura
          </Button>
        </div>
      </Card>

      {/* Recent raw readings */}
      <Card padding="none">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-gray-700">Lecturas recientes</p>
        </div>
        {loading ? (
          <div className="py-8 text-center text-sm text-gray-400">Cargando...</div>
        ) : rawReadings.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">Sin lecturas en el periodo</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-600">Fecha</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-600">Valor</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-600">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {rawReadings.slice(0, 10).map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-gray-50/30">
                  <td className="px-4 py-2 text-gray-600 text-xs">{new Date(r.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono font-medium text-gray-800 text-right">{Number(r.value).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <Badge color={r.source === 'manual' ? 'blue' : r.source === 'csv_import' ? 'teal' : 'gray'} size="sm">
                      {r.source}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

// ─── Tab: Importaciones ───────────────────────────────────────────────────────

function ImportsTab({ points, siteId, batches, onImportComplete }: {
  points: MP[]; siteId: string
  batches: ImportBatch[]; onImportComplete: () => void
}) {
  const [preview, setPreview] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [selectedMpId, setSelectedMpId] = useState<string>('')
  const [status, setStatus] = useState<{ imported: number; errors: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [batchIssues, setBatchIssues] = useState<{ row: number; issues: { field: string; message: string }[] }[]>([])
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      // auto-detect delimiter
      const firstLine = text.split('\n')[0]
      const delim = firstLine.includes(';') ? ';' : ','
      const rows = text.split('\n').slice(0, 10).map((r) => r.split(delim).map((c) => c.trim().replace(/"/g, '')))
      setHeaders(rows[0] || []); setPreview(rows.slice(1, 6))
      setMapping({}); setStatus(null); setBatchIssues([])
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!mapping.timestamp || !mapping.value || !siteId) return
    setLoading(true)
    const file = (document.getElementById('csv-file') as HTMLInputElement)?.files?.[0]
    if (!file) return

    const text = await file.text()
    const firstLine = text.split('\n')[0]
    const delim = firstLine.includes(';') ? ';' : ','
    const rows = text.split('\n').slice(1)
      .map((r) => r.split(delim).map((c) => c.trim().replace(/"/g, '')))
      .filter((r) => r.length > 1)

    const tsIdx = parseInt(mapping.timestamp)
    const valIdx = parseInt(mapping.value)
    const mpTagIdx = mapping.point ? parseInt(mapping.point) : -1

    // Build readings list for batch validation
    const mp = mpTagIdx < 0 ? points.find((p) => p.id === selectedMpId) : null
    const toInsert: { mp: MP; timestamp: string; value: number; unit: string; rowIdx: number }[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row[tsIdx] || !row[valIdx]) continue
      const resolvedMp = mpTagIdx >= 0 ? points.find((p) => p.tag === row[mpTagIdx]) : mp
      if (!resolvedMp) continue
      const ts = new Date(row[tsIdx])
      if (isNaN(ts.getTime())) continue
      toInsert.push({ mp: resolvedMp, timestamp: ts.toISOString(), value: parseFloat(row[valIdx]), unit: resolvedMp.unit, rowIdx: i + 2 })
    }

    // Batch validation
    const rawReadings = toInsert.map((r) => ({ measurement_point_id: r.mp.id, timestamp: r.timestamp, value: r.value, unit: r.unit }))
    const sampleMp = toInsert[0]?.mp
    const { valid: _v, issues } = sampleMp
      ? validateReadingsBatch(rawReadings, sampleMp.unit)
      : { valid: rawReadings, issues: [] }

    // Create batch record
    const { data: batch } = await supabase.from('energy_import_batches').insert({
      site_id: siteId, file_name: file.name, file_size: file.size,
      row_count: toInsert.length, valid_count: toInsert.length - issues.length,
      error_count: issues.length, status: 'processing',
      errors: issues.map((iss) => ({ row: toInsert[iss.row - 1]?.rowIdx || iss.row, issues: iss.issues })),
    }).select('id').single()

    let imported = 0; let errors = 0
    for (const r of toInsert) {
      try {
        await supabase.from('energy_readings_raw').upsert({
          measurement_point_id: r.mp.id, timestamp: r.timestamp,
          value: r.value, unit: r.unit, source: 'csv_import',
          import_batch_id: batch?.id,
        }, { onConflict: 'measurement_point_id, timestamp' })
        imported++
      } catch { errors++ }
    }

    if (batch?.id) {
      await supabase.from('energy_import_batches').update({ status: errors > 0 ? 'completed' : 'completed', valid_count: imported, error_count: errors }).eq('id', batch.id)
    }
    setBatchIssues(issues.map((i) => ({ row: toInsert[i.row - 1]?.rowIdx || i.row, issues: i.issues })))
    setStatus({ imported, errors })
    setLoading(false)
    onImportComplete()
  }

  const STATUS_BATCH: Record<string, { label: string; color: 'green' | 'gray' | 'orange' }> = {
    processing: { label: 'Procesando', color: 'orange' },
    completed:  { label: 'Completado', color: 'green' },
    failed:     { label: 'Fallido', color: 'orange' },
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Import wizard */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Importar CSV</h3>
        <div className="space-y-3">
          <input id="csv-file" type="file" accept=".csv,.txt" onChange={handleFile} className="text-sm" />

          {points.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Punto de medición por defecto</label>
              <select value={selectedMpId} onChange={(e) => setSelectedMpId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface cursor-pointer">
                <option value="">Seleccionar...</option>
                {points.map((p) => <option key={p.id} value={p.id}>{p.tag} — {p.name}</option>)}
              </select>
            </div>
          )}

          {headers.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'timestamp', label: 'Columna timestamp' },
                  { key: 'value',     label: 'Columna valor' },
                  { key: 'point',     label: 'Columna tag (opc.)' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <select value={mapping[key] || ''} onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                      className="w-full px-2 py-1.5 border border-border rounded text-xs cursor-pointer bg-surface">
                      <option value="">Seleccionar...</option>
                      {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-border rounded">
                  <thead><tr className="bg-gray-50">{headers.map((h, i) => <th key={i} className="px-2 py-1 text-left text-gray-600">{h}</th>)}</tr></thead>
                  <tbody>{preview.map((row, ri) => <tr key={ri}>{row.map((c, ci) => <td key={ci} className="px-2 py-1 border-t">{c}</td>)}</tr>)}</tbody>
                </table>
              </div>

              <Button size="sm" onClick={handleImport} loading={loading} leftIcon={<Upload size={13} />}
                disabled={!mapping.timestamp || !mapping.value}>
                Importar
              </Button>

              {status && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${status.errors > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {status.errors > 0 ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                  {status.imported} lecturas importadas · {status.errors} errores
                </div>
              )}

              {batchIssues.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-red-600">Issues detectados:</p>
                  {batchIssues.slice(0, 10).map((b) => (
                    <div key={b.row} className="text-xs bg-red-50 border border-red-100 rounded px-2 py-1">
                      <span className="font-mono font-bold text-red-700">Fila {b.row}:</span>{' '}
                      {b.issues.map((i) => i.message).join(' · ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Batch history */}
      <Card padding="none">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Historial de importaciones</p>
          <span className="text-xs text-gray-400">{batches.length} lotes</span>
        </div>
        {batches.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">Sin importaciones</div>
        ) : (
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {batches.map((b) => {
              const stCfg = STATUS_BATCH[b.status] || STATUS_BATCH.completed
              return (
                <div key={b.id} className="px-4 py-3 hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelectedBatch(b === selectedBatch ? null : b)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800 truncate max-w-[180px]">{b.file_name}</p>
                      <p className="text-xs text-gray-400">{new Date(b.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{b.valid_count}/{b.row_count}</span>
                      <Badge color={stCfg.color} size="sm">{stCfg.label}</Badge>
                      {b.error_count > 0 && <Badge color="orange" size="sm">{b.error_count} err</Badge>}
                    </div>
                  </div>
                  {selectedBatch?.id === b.id && (b.errors || []).length > 0 && (
                    <div className="mt-2 space-y-1">
                      {(b.errors || []).slice(0, 5).map((e) => (
                        <div key={e.row} className="text-[11px] bg-red-50 px-2 py-1 rounded text-red-700">
                          Fila {e.row}: {e.issues.map((i) => i.message).join(' · ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Tab: Calidad ─────────────────────────────────────────────────────────────

function QualityTab({ points, siteId, selectedPeriod }: { points: MP[]; siteId: string; selectedPeriod: string }) {
  const [qualityData, setQualityData] = useState<{
    mp: MP; count: number; validPct: number; gaps: number; lastTs: string | null
  }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!siteId || points.length === 0) return
    setLoading(true)
    const { startIso, endIso } = getEnergyPeriodRange(selectedPeriod)

    Promise.all(points.map(async (mp) => {
      const { data } = await supabase.from('energy_readings_raw')
        .select('timestamp, value').eq('measurement_point_id', mp.id)
        .gte('timestamp', startIso).lt('timestamp', endIso)
        .order('timestamp')
      const readings = data || []
      const sorted = readings.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      const gaps = detectGaps(sorted, 24).length // 24h expected interval
      const validPct = readings.length > 0 ? 100 : 0
      const lastTs = sorted[sorted.length - 1]?.timestamp ?? null
      return { mp, count: readings.length, validPct, gaps, lastTs }
    })).then((results) => { setQualityData(results); setLoading(false) })
  }, [points, siteId, selectedPeriod])

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Analizando calidad...</div>

  function qualityScore(d: typeof qualityData[0]): 'ok' | 'warn' | 'bad' {
    if (d.count === 0) return 'bad'
    if (d.gaps > 2 || d.validPct < 80) return 'warn'
    return 'ok'
  }

  const scoreConfig = {
    ok:   { label: 'Buena', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', Icon: CheckCircle },
    warn: { label: 'Revisar', color: 'text-amber-600 bg-amber-50 border-amber-200', Icon: AlertTriangle },
    bad:  { label: 'Sin datos', color: 'text-red-600 bg-red-50 border-red-200', Icon: XCircle },
  }

  return (
    <Card padding="none">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-gray-700">Calidad de datos por punto de medición</p>
      </div>
      {qualityData.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          {siteId ? 'No hay puntos configurados' : 'Selecciona un sitio'}
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Tag</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Utility</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-600">Lecturas</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-600">Gaps</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Última lectura</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-600">Calidad</th>
            </tr>
          </thead>
          <tbody>
            {qualityData.map((d) => {
              const score = qualityScore(d)
              const { label, color, Icon } = scoreConfig[score]
              return (
                <tr key={d.mp.id} className="border-b border-border/50 hover:bg-gray-50/30">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-blue">{d.mp.tag}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{d.mp.utility}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{d.count}</td>
                  <td className="px-4 py-3 text-right">
                    {d.gaps > 0 ? <span className="text-amber-600 font-medium">{d.gaps}</span> : <span className="text-gray-400">0</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {d.lastTs ? new Date(d.lastTs).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${color}`}>
                      <Icon size={10} /> {label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Card>
  )
}

// ─── Tab: Validadas ───────────────────────────────────────────────────────────

function ValidatedTab({ readings, loading, point }: { readings: ValidatedReading[]; loading: boolean; point: MP | undefined }) {
  if (!point) return <EmptyState title="Selecciona un punto" />
  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
  if (readings.length === 0) return (
    <EmptyState
      title="Sin lecturas validadas"
      description="Las lecturas pasan a validadas desde el pipeline de importación o mediante validación manual."
      icon={<Table size={40} strokeWidth={1.5} />}
    />
  )

  const statusCfg: Record<string, { color: 'green' | 'orange' | 'gray'; label: string }> = {
    valid:      { color: 'green', label: 'Válida' },
    suspicious: { color: 'orange', label: 'Sospechosa' },
    rejected:   { color: 'gray', label: 'Rechazada' },
  }

  return (
    <Card padding="none">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Lecturas validadas</p>
        <div className="flex items-center gap-2">
          <Badge color="green" size="sm">{readings.filter((r) => r.status === 'valid').length} válidas</Badge>
          <Badge color="orange" size="sm">{readings.filter((r) => r.status === 'suspicious').length} sospechosas</Badge>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-gray-50/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Fecha</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-600">Valor</th>
            {point.measurement_type === 'accumulator' && (
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-600">Delta</th>
            )}
            <th className="text-center px-4 py-3 text-xs font-medium text-gray-600">Estado</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((r) => {
            const stCfg = statusCfg[r.status] || statusCfg.valid
            return (
              <tr key={r.id} className="border-b border-border/50 hover:bg-gray-50/30">
                <td className="px-4 py-3 text-gray-600 text-xs">{new Date(r.timestamp).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono font-medium text-gray-800 text-right">{Number(r.value).toLocaleString()} {r.unit}</td>
                {point.measurement_type === 'accumulator' && (
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {r.delta_value != null
                      ? <span className={r.delta_value >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                          {r.delta_value >= 0 ? '+' : ''}{r.delta_value.toFixed(3)}
                        </span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                )}
                <td className="px-4 py-3 text-center">
                  <Badge color={stCfg.color} size="sm">{stCfg.label}</Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}
