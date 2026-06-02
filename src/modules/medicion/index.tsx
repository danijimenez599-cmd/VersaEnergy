import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabase'
import { PageHeader } from '@/shared/PageHeader'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { Card } from '@/shared/Card'
import { EmptyState } from '@/shared/EmptyState'
import { Plus, Save, Upload, Gauge, Table } from 'lucide-react'

interface Reading {
  id: string; timestamp: string; value: number; unit: string; source: string;
}

interface MP {
  id: string; tag: string; name: string; utility: string; measurement_type: string; quantity: string; unit: string;
}

const tabs = [
  { id: 'manual', label: 'Manual', icon: Plus },
  { id: 'list', label: 'Lecturas', icon: Table },
  { id: 'import', label: 'Importar CSV', icon: Upload },
]

export default function MedicionPage() {
  const [activeTab, setActiveTab] = useState('manual')
  const [siteId, setSiteId] = useState<string | null>(null)
  const [sites, setSites] = useState<{ id: string; name: string }[]>([])
  const [points, setPoints] = useState<MP[]>([])
  const [selectedPoint, setSelectedPoint] = useState<string>('')
  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('sites').select('id, name').order('name').then(({ data }) => {
      setSites(data || [])
      if (data && data.length > 0) {
        setSiteId(data[0].id)
      }
    })
  }, [])

  useEffect(() => {
    if (!siteId) return
    supabase.from('measurement_points').select('*').eq('site_id', siteId).order('tag').then(({ data }) => {
      setPoints(data || [])
    })
  }, [siteId])

  const loadReadings = useCallback(async () => {
    if (!selectedPoint) return
    setLoading(true)
    const { data } = await supabase.from('energy_readings_raw')
      .select('*').eq('measurement_point_id', selectedPoint)
      .order('timestamp', { ascending: false }).limit(50)
    setReadings(data || [])
    setLoading(false)
  }, [selectedPoint])

  useEffect(() => { loadReadings() }, [loadReadings])

  async function addManualReading(value: number, unit: string) {
    if (!selectedPoint) return
    await supabase.from('energy_readings_raw').upsert({
      measurement_point_id: selectedPoint,
      timestamp: new Date().toISOString(),
      value,
      unit,
      source: 'manual',
    }, { onConflict: 'measurement_point_id, timestamp' })
    loadReadings()
  }

  const point = points.find((p) => p.id === selectedPoint)

  return (
    <div>
      <PageHeader title="Medici\u00f3n" description="Lecturas, importaci\u00f3n CSV y calidad de datos" />

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-600">Sitio:</label>
        <select value={siteId || ''} onChange={(e) => setSiteId(e.target.value)}
          className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface cursor-pointer">
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="text-sm text-gray-600 ml-4">Punto medici\u00f3n:</label>
        <select value={selectedPoint} onChange={(e) => setSelectedPoint(e.target.value)}
          className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface cursor-pointer max-w-[300px]">
          <option value="">Seleccionar...</option>
          {points.map((p) => (
            <option key={p.id} value={p.id}>{p.tag} — {p.name} ({p.utility})</option>
          ))}
        </select>
      </div>

      {point && (
        <div className="flex items-center gap-2 mb-4">
          <Gauge size={16} className="text-brand-blue" />
          <span className="text-sm font-medium">{point.tag}</span>
          <Badge color="blue" size="sm">{point.measurement_type}</Badge>
          <Badge color="teal" size="sm">{point.utility}</Badge>
          <span className="text-xs text-gray-500">{point.quantity} · {point.unit}</span>
        </div>
      )}

      <div className="border-b border-border mb-4">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ' +
                (activeTab === t.id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'manual' && <ManualEntry point={point} onSave={addManualReading} />}
      {activeTab === 'list' && <ReadingsList readings={readings} loading={loading} point={point} />}
      {activeTab === 'import' && <CsvImport points={points} onImportComplete={loadReadings} />}
    </div>
  )
}

function ManualEntry({ point, onSave }: { point: MP | undefined; onSave: (v: number, u: string) => Promise<void> }) {
  const [value, setValue] = useState('')
  const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16))
  const [saving, setSaving] = useState(false)

  if (!point) return <EmptyState title="Selecciona un punto" description="Elige un punto de medici\u00f3n para ingresar lecturas." />

  async function handleSave() {
    const v = parseFloat(value)
    if (isNaN(v)) return
    setSaving(true)
    await supabase.from('energy_readings_raw').upsert({
      measurement_point_id: point!.id,
      timestamp: new Date(timestamp).toISOString(),
      value: v,
      unit: point!.unit,
      source: 'manual',
    }, { onConflict: 'measurement_point_id, timestamp' })
    setValue('')
    setSaving(false)
    onSave(v, point!.unit)
  }

  return (
    <Card>
      <div className="space-y-3 max-w-md">
        <h3 className="text-sm font-semibold text-gray-700">Nueva lectura — {point.unit}</h3>
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
        <Button size="sm" leftIcon={<Save size={14} />} onClick={handleSave} loading={saving}>Guardar lectura</Button>
      </div>
    </Card>
  )
}

function ReadingsList({ readings, loading, point }: { readings: Reading[]; loading: boolean; point: MP | undefined }) {
  if (!point) return <EmptyState title="Selecciona un punto" />
  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
  if (readings.length === 0) return <EmptyState title="Sin lecturas" description="Ingresa lecturas manuales o importa un CSV." />

  return (
    <Card padding="none">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-gray-50/50">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Valor</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Unidad</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Fuente</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((r) => (
            <tr key={r.id} className="border-b border-border/50 hover:bg-gray-50/30">
              <td className="px-4 py-3 text-gray-600">{new Date(r.timestamp).toLocaleString()}</td>
              <td className="px-4 py-3 font-mono font-medium text-gray-800">{Number(r.value).toLocaleString()}</td>
              <td className="px-4 py-3 text-gray-500">{r.unit}</td>
              <td className="px-4 py-3">
                <Badge color={r.source === 'manual' ? 'blue' : r.source === 'csv_import' ? 'teal' : 'gray'} size="sm">{r.source}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function CsvImport({ points, onImportComplete }: { points: MP[]; onImportComplete: () => void }) {
  const [preview, setPreview] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = text.split('\n').slice(0, 10).map((r) => r.split(',').map((c) => c.trim().replace(/"/g, '')))
      setHeaders(rows[0])
      setPreview(rows.slice(1, 6))
      setMapping({})
      setStatus('')
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!mapping.timestamp || !mapping.value) return
    setLoading(true)
    const file = (document.getElementById('csv-file') as HTMLInputElement)?.files?.[0]
    if (!file) return
    const text = await file.text()
    const rows = text.split('\n').slice(1).map((r) => r.split(',').map((c) => c.trim().replace(/"/g, '')))
    const tsIdx = parseInt(mapping.timestamp)
    const valIdx = parseInt(mapping.value)
    const mpTagIdx = mapping.point ? parseInt(mapping.point) : -1

    let imported = 0
    let errors = 0
    for (const row of rows) {
      if (!row[tsIdx] || !row[valIdx]) { errors++; continue }
      const mpTag = mpTagIdx >= 0 ? row[mpTagIdx] : null
      const point = mpTag ? points.find((p) => p.tag === mpTag) : points[0]
      if (!point) { errors++; continue }
      try {
        await supabase.from('energy_readings_raw').upsert({
          measurement_point_id: point.id,
          timestamp: new Date(row[tsIdx]).toISOString(),
          value: parseFloat(row[valIdx]),
          unit: point.unit,
          source: 'csv_import',
          raw_data: { row },
        }, { onConflict: 'measurement_point_id, timestamp' })
        imported++
      } catch { errors++ }
    }

    setStatus(imported + ' lecturas importadas, ' + errors + ' errores')
    setLoading(false)
    onImportComplete()
  }

  return (
    <Card>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Importar CSV</h3>
        <input id="csv-file" type="file" accept=".csv" onChange={handleFile}
          className="text-sm" />

        {headers.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Columna timestamp</label>
                <select value={mapping.timestamp || ''} onChange={(e) => setMapping({ ...mapping, timestamp: e.target.value })}
                  className="w-full px-2 py-1.5 border border-border rounded text-xs cursor-pointer">
                  <option value="">Seleccionar...</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Columna valor</label>
                <select value={mapping.value || ''} onChange={(e) => setMapping({ ...mapping, value: e.target.value })}
                  className="w-full px-2 py-1.5 border border-border rounded text-xs cursor-pointer">
                  <option value="">Seleccionar...</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Columna tag (opcional)</label>
                <select value={mapping.point || ''} onChange={(e) => setMapping({ ...mapping, point: e.target.value })}
                  className="w-full px-2 py-1.5 border border-border rounded text-xs cursor-pointer">
                  <option value="">Usar seleccionado</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </div>
            </div>

            <p className="text-xs text-gray-400">Preview ({preview.length} filas):</p>
            <table className="w-full text-xs border border-border rounded">
              <thead>
                <tr className="bg-gray-50">{headers.map((h, i) => <th key={i} className="px-2 py-1 text-left text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.map((row, ri) => (
                  <tr key={ri}>{row.map((c, ci) => <td key={ci} className="px-2 py-1 border-t">{c}</td>)}</tr>
                ))}
              </tbody>
            </table>

            <Button size="sm" onClick={handleImport} loading={loading}>Importar</Button>
            {status && <p className="text-sm text-gray-600">{status}</p>}
          </div>
        )}
      </div>
    </Card>
  )
}
