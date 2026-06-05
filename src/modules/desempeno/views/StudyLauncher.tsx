import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  FileText,
  Factory,
  FlaskConical,
  Gauge,
  Layers,
  Lightbulb,
  LineChart as LineChartIcon,
  Link2,
  Scale,
  Search,
  Target,
  Zap,
} from 'lucide-react'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge, utilityBadgeVariant } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Card } from '@/shared/Card'
import { EmptyState } from '@/shared/EmptyState'
import { getUtilityLabel } from '@/shared/OperationalContext'
import type { BalanceSide, NumeratorType } from '@/services/enpi-engine'
import {
  createProjectFromStudyCandidate,
  createQuickActionFromStudyCandidate,
  createSgenEvidenceFromStudyCandidate,
  listRecentStudies,
  resolveStudyCandidate,
  saveStudyCandidate,
} from '@/services/energy-study-engine'
import type { PersistedEnergyStudy, StudyCandidateResult, StudyScopeType, StudyType } from '@/services/energy-study-engine'
import { supabase } from '@/services/supabase'
import { useUIStore } from '@/store/uiStore'

interface MeasurementPointOption {
  id: string
  tag: string
  name: string
  utility: string
  measurement_type: string
  quantity: string
  unit: string
  source_type: string
}

interface BalanceSheetOption {
  id: string
  name: string
  period_start: string
  utility: string | null
}

interface RelevantVariableOption {
  id: string
  name: string
  unit: string
}

interface ScopeOption {
  id: string
  type: StudyScopeType
  label: string
  code?: string | null
  utility?: string | null
}

interface Props {
  siteId: string | null
  selectedUtilityType: string | null
  measurementPoints: MeasurementPointOption[]
  balanceSheets: BalanceSheetOption[]
  relevantVars: RelevantVariableOption[]
  onPromoteCandidate: (candidate: StudyCandidateResult) => void
}

const STUDY_TYPES: Array<{
  id: StudyType
  title: string
  intent: string
  icon: ReactNode
  tone: string
}> = [
  {
    id: 'area_process_intensity',
    title: 'Area o proceso',
    intent: 'Explicar energia contra variable relevante, horas, mezcla o turnos.',
    icon: <Factory size={16} />,
    tone: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    id: 'equipment_efficiency',
    title: 'Equipo',
    intent: 'Comparar entrada, salida, carga y deterioro.',
    icon: <Gauge size={16} />,
    tone: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'multi_utility_normalization',
    title: 'Multi-utility',
    intent: 'Convertir varios utilities a una unidad comun por variable relevante.',
    icon: <Layers size={16} />,
    tone: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  {
    id: 'utility_choice',
    title: 'Elegir utility',
    intent: 'Comparar costo, energia equivalente y emisiones.',
    icon: <Scale size={16} />,
    tone: 'text-orange-600 bg-orange-50 border-orange-200',
  },
  {
    id: 'peak_detective',
    title: 'Pico de consumo',
    intent: 'Investigar demanda, simultaneidad y horarios criticos.',
    icon: <Zap size={16} />,
    tone: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    id: 'loss_hunt',
    title: 'Perdidas',
    intent: 'Abrir una investigacion desde no explicado, fugas o retornos.',
    icon: <Search size={16} />,
    tone: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  {
    id: 'baseline_model',
    title: 'Baseline',
    intent: 'Probar variables para un modelo defendible.',
    icon: <BarChart3 size={16} />,
    tone: 'text-slate-700 bg-slate-100 border-slate-200',
  },
  {
    id: 'mv_guardian',
    title: 'M&V guardian',
    intent: 'Vigilar que una mejora no pierda ahorro en el tiempo.',
    icon: <Target size={16} />,
    tone: 'text-teal-600 bg-teal-50 border-teal-200',
  },
]

const MONTHS_ES: Record<string, string> = {
  '01': 'Ene',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dic',
}

function fmtNum(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) return '-'
  return value.toLocaleString('es-MX', { maximumFractionDigits: digits })
}

export function StudyLauncher({
  siteId,
  selectedUtilityType,
  measurementPoints,
  balanceSheets,
  relevantVars,
  onPromoteCandidate,
}: Props) {
  const {
    selectedAssetSourceId,
    selectedAssetType,
    selectedAssetName,
    selectedAssetCode,
  } = useUIStore()

  const [studyType, setStudyType] = useState<StudyType>('area_process_intensity')
  const [scopeOptions, setScopeOptions] = useState<ScopeOption[]>([])
  const [scopeKey, setScopeKey] = useState('site:site')
  const [numeratorType, setNumeratorType] = useState<Exclude<NumeratorType, 'formula'>>('measurement_point')
  const [numeratorRefId, setNumeratorRefId] = useState('')
  const [numeratorSide, setNumeratorSide] = useState<BalanceSide>('input')
  const [denominatorRefId, setDenominatorRefId] = useState('')
  const [candidate, setCandidate] = useState<StudyCandidateResult | null>(null)
  const [loadingTrend, setLoadingTrend] = useState(false)
  const [recentStudies, setRecentStudies] = useState<PersistedEnergyStudy[]>([])
  const [savingStudy, setSavingStudy] = useState(false)
  const [savedStudyId, setSavedStudyId] = useState<string | null>(null)
  const [studySaveError, setStudySaveError] = useState<string | null>(null)
  const [decisionMessage, setDecisionMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!siteId) {
      setScopeOptions([])
      return
    }

    async function loadScopes() {
      const [{ data: areas }, { data: systems }, { data: equipment }] = await Promise.all([
        supabase.from('energy_areas').select('id,name,code').eq('site_id', siteId).eq('is_active', true).order('name'),
        supabase.from('utility_systems').select('id,name,utility_type').eq('site_id', siteId).eq('is_active', true).order('name'),
        supabase.from('energy_equipment').select('id,tag,name,utility_type').eq('site_id', siteId).eq('status', 'active').order('tag'),
      ])

      const loaded: ScopeOption[] = [
        { id: 'site', type: 'site', label: 'Planta completa' },
        ...(areas ?? []).map((area) => ({
          id: area.id,
          type: 'area' as const,
          label: area.name,
          code: area.code,
        })),
        ...(systems ?? []).map((system) => ({
          id: system.id,
          type: 'system' as const,
          label: system.name,
          utility: system.utility_type,
        })),
        ...(equipment ?? []).map((item) => ({
          id: item.id,
          type: 'equipment' as const,
          label: item.name,
          code: item.tag,
          utility: item.utility_type,
        })),
      ]

      setScopeOptions(loaded)
    }

    loadScopes()
  }, [siteId])

  useEffect(() => {
    if (!selectedAssetSourceId || !selectedAssetType) return
    if (!['area', 'system', 'equipment'].includes(selectedAssetType)) return
    setScopeKey(`${selectedAssetType}:${selectedAssetSourceId}`)
  }, [selectedAssetSourceId, selectedAssetType])

  useEffect(() => {
    if (!siteId) {
      setRecentStudies([])
      return
    }
    listRecentStudies(siteId)
      .then(setRecentStudies)
      .catch(() => setRecentStudies([]))
  }, [siteId, savedStudyId])

  const selectedStudyType = STUDY_TYPES.find((type) => type.id === studyType) ?? STUDY_TYPES[0]
  const selectedScope = useMemo(
    () => scopeOptions.find((scope) => `${scope.type}:${scope.id}` === scopeKey) ?? scopeOptions[0],
    [scopeKey, scopeOptions],
  )

  const filteredPoints = useMemo(() => {
    return measurementPoints.filter((point) => !selectedUtilityType || point.utility === selectedUtilityType)
  }, [measurementPoints, selectedUtilityType])

  const filteredSheets = useMemo(() => {
    return balanceSheets.filter((sheet) => !selectedUtilityType || !sheet.utility || sheet.utility === selectedUtilityType)
  }, [balanceSheets, selectedUtilityType])

  useEffect(() => {
    if (!numeratorRefId) {
      const first = numeratorType === 'measurement_point' ? filteredPoints[0]?.id : filteredSheets[0]?.id
      if (first) setNumeratorRefId(first)
    }
  }, [filteredPoints, filteredSheets, numeratorRefId, numeratorType])

  useEffect(() => {
    if (!denominatorRefId && relevantVars[0]) setDenominatorRefId(relevantVars[0].id)
  }, [denominatorRefId, relevantVars])

  useEffect(() => {
    if (!numeratorRefId || !denominatorRefId) {
      setCandidate(null)
      return
    }

    const selectedPoint = filteredPoints.find((point) => point.id === numeratorRefId)
    const selectedSheet = filteredSheets.find((sheet) => sheet.id === numeratorRefId)
    const selectedRelevantVariable = relevantVars.find((variable) => variable.id === denominatorRefId)
    const scopeLabelText = selectedScope ? `${scopeLabel(selectedScope.type)} - ${selectedScope.label}` : 'Planta completa'
    const numeratorLabel = numeratorType === 'measurement_point'
      ? selectedPoint ? `${selectedPoint.tag} - ${selectedPoint.name}` : 'Medidor sin seleccionar'
      : selectedSheet ? `${selectedSheet.name} - ${selectedSheet.period_start.slice(0, 7)}` : 'Balance sin seleccionar'

    setLoadingTrend(true)
    resolveStudyCandidate({
      config: {
        studyType,
        scopeType: selectedScope?.type ?? 'site',
        scopeId: selectedScope && selectedScope.type !== 'site' ? selectedScope.id : null,
        scopeLabel: scopeLabelText,
        utility: selectedUtilityType,
        numeratorType,
        numeratorRefId,
        numeratorSide: numeratorType === 'balance_sheet' ? numeratorSide : null,
        numeratorLabel,
        numeratorUnit: numeratorType === 'measurement_point' ? (selectedPoint?.unit ?? 'energia') : 'kWh-eq',
        denominatorRefId,
      denominatorLabel: selectedRelevantVariable?.name ?? 'Driver operacional',
      denominatorUnit: selectedRelevantVariable?.unit ?? 'variable relevante',
      },
      variableCandidates: relevantVars,
      months: 18,
    })
      .then(setCandidate)
      .finally(() => setLoadingTrend(false))
  }, [denominatorRefId, filteredPoints, filteredSheets, numeratorRefId, numeratorSide, numeratorType, relevantVars, selectedScope, selectedUtilityType, studyType])

  async function handleSaveStudy(decisionType?: 'promote_enpi' | 'request_measurement') {
    if (!siteId || !candidate) return
    setSavingStudy(true)
    setStudySaveError(null)
    setDecisionMessage(null)
    try {
      const saved = await saveStudyCandidate({
        siteId,
        candidate,
        decisionType,
        decisionNotes: decisionType === 'promote_enpi'
          ? 'Metrica candidata promovida desde el Centro de Estudios.'
          : decisionType === 'request_measurement'
            ? 'Brecha de medicion detectada desde el Centro de Estudios.'
          : undefined,
      })
      setSavedStudyId(saved.id)
      if (decisionType === 'promote_enpi') onPromoteCandidate(candidate)
      if (decisionType === 'request_measurement') setDecisionMessage('Solicitud de medicion registrada como decision del estudio.')
    } catch (error) {
      setStudySaveError(error instanceof Error ? error.message : 'No se pudo guardar el estudio.')
    } finally {
      setSavingStudy(false)
    }
  }

  async function handleCreateQuickAction() {
    if (!siteId || !candidate) return
    setSavingStudy(true)
    setStudySaveError(null)
    setDecisionMessage(null)
    try {
      const result = await createQuickActionFromStudyCandidate(siteId, candidate)
      setSavedStudyId(result.study.id)
      setDecisionMessage('Accion rapida creada desde el estudio y vinculada para M&V.')
    } catch (error) {
      setStudySaveError(error instanceof Error ? error.message : 'No se pudo crear la accion rapida.')
    } finally {
      setSavingStudy(false)
    }
  }

  async function handleCreateProject() {
    if (!siteId || !candidate) return
    setSavingStudy(true)
    setStudySaveError(null)
    setDecisionMessage(null)
    try {
      const result = await createProjectFromStudyCandidate(siteId, candidate)
      setSavedStudyId(result.study.id)
      setDecisionMessage('Proyecto creado con fases, tareas iniciales y vinculo M&V.')
    } catch (error) {
      setStudySaveError(error instanceof Error ? error.message : 'No se pudo crear el proyecto.')
    } finally {
      setSavingStudy(false)
    }
  }

  async function handleCreateSgenEvidence() {
    if (!siteId || !candidate) return
    setSavingStudy(true)
    setStudySaveError(null)
    setDecisionMessage(null)
    try {
      const result = await createSgenEvidenceFromStudyCandidate(siteId, candidate)
      setSavedStudyId(result.study.id)
      setDecisionMessage('Evidencia SGEn creada como snapshot tecnico del estudio.')
    } catch (error) {
      setStudySaveError(error instanceof Error ? error.message : 'No se pudo crear la evidencia SGEn.')
    } finally {
      setSavingStudy(false)
    }
  }

  const selectedPoint = filteredPoints.find((point) => point.id === numeratorRefId)
  const selectedSheet = filteredSheets.find((sheet) => sheet.id === numeratorRefId)
  const selectedRelevantVariable = relevantVars.find((variable) => variable.id === denominatorRefId)
  const sourceLabel = numeratorType === 'measurement_point'
    ? selectedPoint ? `${selectedPoint.tag} - ${selectedPoint.name}` : 'Medidor sin seleccionar'
    : selectedSheet ? `${selectedSheet.name} - ${selectedSheet.period_start.slice(0, 7)}` : 'Balance sin seleccionar'
  const sourceUnit = numeratorType === 'measurement_point' ? selectedPoint?.unit : 'kWh-eq'
  const candidateUnit = candidate?.unit ?? `${sourceUnit ?? 'energia'}/${selectedRelevantVariable?.unit ?? 'variable relevante'}`
  const chartData = (candidate?.points ?? []).map((point) => ({
    period: MONTHS_ES[point.period.slice(5)] ?? point.period.slice(5),
    value: point.value != null ? Number(point.value.toFixed(4)) : null,
  }))

  if (!siteId) {
    return (
      <EmptyState
        icon={<FlaskConical size={48} strokeWidth={1.5} />}
        title="Selecciona una planta"
        description="El Centro de Estudios necesita sitio, periodo y fuentes reales para preparar metricas candidatas."
      />
    )
  }

  return (
    <div className="space-y-3">
      <Card padding="none" className="overflow-hidden rounded-xl border-slate-200">
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Centro de Estudios Energeticos</p>
              <h2 className="text-lg font-black tracking-tight text-slate-950">Preguntar, probar y decidir antes de crear EnPIs</h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                Usa datos existentes: medidores, balance sheets y variables relevantes. El estudio conserva fuentes, modelos, hallazgos y decisiones antes de convertirse en EnPI, accion o evidencia.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">modelos comparables</Badge>
              <Badge variant="neutral">trazabilidad persistente</Badge>
              {selectedAssetName && (
                <Badge variant="brand">
                  {selectedAssetCode ? `${selectedAssetCode} - ` : ''}{selectedAssetName}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-0 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50 p-3 xl:border-b-0 xl:border-r">
            <div className="mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quiero estudiar</p>
              <h3 className="text-sm font-bold text-slate-900">Pregunta de ingenieria</h3>
            </div>
            <div className="space-y-1.5">
              {STUDY_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setStudyType(type.id)}
                  className={[
                    'w-full rounded-xl border px-3 py-2 text-left transition-all',
                    studyType === type.id ? 'border-slate-900 bg-white shadow-sm' : 'border-slate-200 bg-white/70 hover:bg-white',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 rounded-lg border p-1.5 ${type.tone}`}>{type.icon}</span>
                    <span className="min-w-0">
                      <span className="block text-xs font-black text-slate-900">{type.title}</span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{type.intent}</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <main className="min-w-0 space-y-3 p-3">
            <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1fr]">
              <Card padding="sm" className="rounded-xl border-slate-200">
                <div className="mb-2 flex items-center gap-2">
                  <Factory size={14} className="text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Frontera</p>
                </div>
                <select className={inputClass} value={scopeKey} onChange={(event) => setScopeKey(event.target.value)}>
                  {scopeOptions.map((scope) => (
                    <option key={`${scope.type}:${scope.id}`} value={`${scope.type}:${scope.id}`}>
                      {scopeLabel(scope.type)} - {scope.code ? `${scope.code} - ` : ''}{scope.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[11px] leading-4 text-slate-500">
                  {selectedScope ? `${scopeLabel(selectedScope.type)} seleccionado para acotar la pregunta tecnica.` : 'Usa la planta completa o un activo del arbol.'}
                </p>
              </Card>

              <Card padding="sm" className="rounded-xl border-slate-200">
                <div className="mb-2 flex items-center gap-2">
                  <Database size={14} className="text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fuente energetica</p>
                </div>
                <div className="mb-2 flex gap-1 rounded-xl border border-slate-200 p-0.5">
                  {(['measurement_point', 'balance_sheet'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setNumeratorType(type)
                        setNumeratorRefId('')
                      }}
                      className={[
                        'flex-1 rounded-lg px-2 py-1 text-[11px] font-bold transition-all',
                        numeratorType === type ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700',
                      ].join(' ')}
                    >
                      {type === 'measurement_point' ? 'Medidor' : 'Balance'}
                    </button>
                  ))}
                </div>
                {numeratorType === 'measurement_point' ? (
                  <select className={inputClass} value={numeratorRefId} onChange={(event) => setNumeratorRefId(event.target.value)}>
                    <option value="">Seleccionar medidor</option>
                    {filteredPoints.map((point) => (
                      <option key={point.id} value={point.id}>
                        {point.tag} - {point.name} ({point.unit})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <select className={inputClass} value={numeratorRefId} onChange={(event) => setNumeratorRefId(event.target.value)}>
                      <option value="">Seleccionar balance</option>
                      {filteredSheets.map((sheet) => (
                        <option key={sheet.id} value={sheet.id}>
                          {sheet.name} - {sheet.period_start.slice(0, 7)}
                        </option>
                      ))}
                    </select>
                    <select className={inputClass} value={numeratorSide} onChange={(event) => setNumeratorSide(event.target.value as BalanceSide)}>
                      <option value="input">Entrada</option>
                      <option value="output">Salida</option>
                      <option value="net">Neto entrada - salida</option>
                    </select>
                  </div>
                )}
              </Card>

              <Card padding="sm" className="rounded-xl border-slate-200">
                <div className="mb-2 flex items-center gap-2">
                  <Scale size={14} className="text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Driver operacional</p>
                </div>
                <select className={inputClass} value={denominatorRefId} onChange={(event) => setDenominatorRefId(event.target.value)}>
                  <option value="">Seleccionar variable relevante</option>
                  {relevantVars.map((variable) => (
                    <option key={variable.id} value={variable.id}>
                      {variable.name} ({variable.unit})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[11px] leading-4 text-slate-500">
                  La metrica candidata usa periodos donde energia y driver existen al mismo tiempo.
                </p>
              </Card>
            </section>

            <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.8fr]">
              <Card padding="none" className="overflow-hidden rounded-xl border-slate-200">
                <div className="border-b border-slate-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="brand">{selectedStudyType.title}</Badge>
                        {selectedUtilityType && <Badge variant={utilityBadgeVariant(selectedUtilityType)}>{getUtilityLabel(selectedUtilityType)}</Badge>}
                      </div>
                      <h3 className="text-sm font-black text-slate-900">Metrica candidata: {candidateUnit}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{sourceLabel} / {selectedRelevantVariable?.name ?? 'driver operacional'}</p>
                    </div>
                    <Button
                      size="sm"
                      leftIcon={<ArrowRight size={14} />}
                      disabled={!candidate?.canPromote}
                      loading={savingStudy}
                      onClick={() => handleSaveStudy('promote_enpi')}
                    >
                      Promover a EnPI
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-0 border-b border-slate-200 lg:grid-cols-4">
                  <StudyMetric label="Cobertura" value={`${candidate?.coverage ?? 0}%`} tone={candidate?.coverageTone ?? 'danger'} icon={<CheckCircle2 size={14} />} />
                  <StudyMetric label="Periodos utiles" value={candidate?.validPointCount ?? 0} icon={<LineChartIcon size={14} />} />
                  <StudyMetric label="Ultimo valor" value={fmtNum(candidate?.latestValue, 4)} unit={candidateUnit} icon={<Gauge size={14} />} />
                  <StudyMetric
                    label="Cambio vs anterior"
                    value={candidate?.deltaPercent == null ? '-' : `${candidate.deltaPercent > 0 ? '+' : ''}${candidate.deltaPercent.toFixed(1)}%`}
                    tone={candidate?.deltaPercent == null ? 'neutral' : candidate.deltaPercent > 0 ? 'warn' : 'ok'}
                    icon={<BarChart3 size={14} />}
                  />
                </div>

                <div className="p-4">
                  {(savedStudyId || studySaveError || decisionMessage) && (
                    <div className={[
                      'mb-3 rounded-xl border px-3 py-2 text-xs font-semibold',
                      savedStudyId || decisionMessage ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700',
                    ].join(' ')}>
                      {decisionMessage ?? (savedStudyId ? 'Estudio guardado con fuentes, modelos, hallazgos y decisiones.' : studySaveError)}
                    </div>
                  )}
                  {loadingTrend ? (
                    <div className="grid h-[260px] place-items-center text-sm font-semibold text-slate-400">Calculando metrica candidata...</div>
                  ) : (candidate?.validPointCount ?? 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                        <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={50} />
                        <Tooltip
                          contentStyle={{ borderRadius: 10, borderColor: '#e2e8f0', fontSize: 11 }}
                          formatter={(value) => [fmtNum(Number(value ?? 0), 4), candidateUnit]}
                        />
                        <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2.5} dot={{ r: 3, fill: '#0f172a' }} connectNulls={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="grid h-[260px] place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                      <div>
                        <AlertTriangle className="mx-auto mb-2 text-amber-400" size={34} />
                        <p className="text-sm font-bold text-slate-700">Aun no hay periodos comparables</p>
                        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                          Selecciona una fuente energetica y una variable relevante con datos en el mismo periodo.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <div className="space-y-3">
                <Card padding="sm" className="rounded-xl border-slate-200">
                  <div className="mb-3 flex items-center gap-2">
                    <BarChart3 size={14} className="text-slate-600" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Modelos candidatos</p>
                      <h3 className="text-sm font-bold text-slate-900">Comparar antes de decidir</h3>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(candidate?.modelComparisons ?? []).map((model) => (
                      <div
                        key={model.id}
                        className={[
                          'rounded-xl border px-3 py-2',
                          model.recommended ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-black text-slate-900">{model.label}</p>
                              {model.recommended && <Badge variant="info" size="sm">seleccionado</Badge>}
                            </div>
                            <p className="mt-1 text-[11px] leading-4 text-slate-500">{model.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-slate-900">{Math.round(model.qualityScore)}%</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">calidad</p>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                          <TraceRow label="Referencia" value={`${fmtNum(model.referenceValue, 4)} ${model.outputUnit}`} />
                          <TraceRow
                            label="Desv."
                            value={model.deltaPercent == null ? '-' : `${model.deltaPercent > 0 ? '+' : ''}${model.deltaPercent.toFixed(1)}%`}
                          />
                        </div>
                      </div>
                    ))}
                    {!candidate && (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                        Los modelos apareceran cuando existan periodos comparables.
                      </div>
                    )}
                  </div>
                </Card>

                <Card padding="sm" className="rounded-xl border-slate-200">
                  <div className="mb-3 flex items-center gap-2">
                    <Target size={14} className="text-emerald-500" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Variables relevantes</p>
                      <h3 className="text-sm font-bold text-slate-900">Driver antes de EnPI</h3>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(candidate?.variableCandidates ?? []).slice(0, 4).map((variable) => (
                      <div
                        key={variable.variableRefId ?? variable.label}
                        className={[
                          'rounded-xl border px-3 py-2',
                          variable.selected ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-xs font-black text-slate-900">{variable.label}</p>
                              {variable.selected && <Badge variant="ok" size="sm">usada</Badge>}
                            </div>
                            <p className="mt-1 text-[11px] leading-4 text-slate-500">{variable.physicalRationale}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-slate-900">{variable.relevanceScore}%</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">relev.</p>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-slate-500">
                          <span>Cob. {variable.coveragePercent}%</span>
                          <span>Corr. {variable.correlationScore == null ? '-' : variable.correlationScore.toFixed(2)}</span>
                          <span>Est. {variable.stabilityScore}%</span>
                        </div>
                      </div>
                    ))}
                    {!candidate?.variableCandidates.length && (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                        El ranking aparecera cuando existan variables relevantes comparables.
                      </div>
                    )}
                  </div>
                </Card>

                <Card padding="sm" className="rounded-xl border-slate-200">
                  <div className="mb-3 flex items-center gap-2">
                    <Lightbulb size={14} className="text-amber-500" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lectura del estudio</p>
                      <h3 className="text-sm font-bold text-slate-900">Primer criterio tecnico</h3>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(candidate?.findings ?? []).map((finding) => (
                      <FindingRow key={finding.id} ok={finding.ok} text={finding.text} />
                    ))}
                    {!candidate && (
                      <FindingRow ok={false} text="Selecciona fuente energetica y driver operacional para calcular la metrica." />
                    )}
                  </div>
                </Card>

                <Card padding="sm" className="rounded-xl border-slate-200">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText size={14} className="text-teal-500" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Playbook tecnico</p>
                      <h3 className="text-sm font-bold text-slate-900">{candidate?.playbook.title ?? 'Guia del estudio'}</h3>
                    </div>
                  </div>
                  <p className="mb-2 text-xs leading-5 text-slate-500">
                    {candidate?.playbook.intent ?? 'Selecciona una pregunta de ingenieria para recibir una ruta de decision.'}
                  </p>
                  <div className="space-y-2">
                    {(candidate?.playbook.steps ?? []).map((step) => (
                      <div key={step.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-black text-slate-900">{step.label}</p>
                          {step.decision && <Badge variant="neutral" size="sm">{step.decision}</Badge>}
                        </div>
                        <p className="mt-1 text-[11px] leading-4 text-slate-500">{step.detail}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card padding="sm" className="rounded-xl border-slate-200">
                  <div className="mb-3 flex items-center gap-2">
                    <Link2 size={14} className="text-blue-500" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trazabilidad</p>
                      <h3 className="text-sm font-bold text-slate-900">Fuentes usadas</h3>
                    </div>
                  </div>
                  <dl className="space-y-2 text-xs">
                    <TraceRow label="Estudio" value={selectedStudyType.title} />
                    <TraceRow label="Frontera" value={selectedScope ? `${scopeLabel(selectedScope.type)} - ${selectedScope.label}` : 'Planta'} />
                    <TraceRow label="Energia" value={sourceLabel} />
                    <TraceRow label="Driver" value={selectedRelevantVariable ? `${selectedRelevantVariable.name} (${selectedRelevantVariable.unit})` : 'Sin seleccionar'} />
                    <TraceRow label="Datos energia" value={`${candidate?.numeratorPointCount ?? 0}/18 periodos`} />
                    <TraceRow label="Datos driver" value={`${candidate?.denominatorPointCount ?? 0}/18 periodos`} />
                  </dl>
                </Card>

                <Card padding="sm" className="rounded-xl border-slate-200">
                  <div className="mb-3 flex items-center gap-2">
                    <FlaskConical size={14} className="text-purple-500" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Siguiente decision</p>
                      <h3 className="text-sm font-bold text-slate-900">Que hacer con esta metrica</h3>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {(candidate?.decisions ?? []).map((decision) => (
                      <DecisionButton
                        key={decision.id}
                        enabled={decision.enabled}
                        label={decision.label}
                        detail={decision.detail}
                        onClick={
                          decision.id === 'promote_enpi'
                            ? () => handleSaveStudy('promote_enpi')
                            : decision.id === 'request_measurement'
                              ? () => handleSaveStudy('request_measurement')
                              : decision.id === 'create_quick_action'
                                ? handleCreateQuickAction
                                : decision.id === 'create_project'
                                  ? handleCreateProject
                                : decision.id === 'create_sgen_evidence'
                                  ? handleCreateSgenEvidence
                                  : undefined
                        }
                      />
                    ))}
                    <DecisionButton
                      enabled={Boolean(candidate)}
                      label={savingStudy ? 'Guardando estudio...' : 'Guardar estudio'}
                      detail="Persistir fuentes, modelo ratio, hallazgos y confianza."
                      onClick={() => handleSaveStudy()}
                    />
                  </div>
                </Card>

                <Card padding="sm" className="rounded-xl border-slate-200">
                  <div className="mb-3 flex items-center gap-2">
                    <Database size={14} className="text-slate-500" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estudios guardados</p>
                      <h3 className="text-sm font-bold text-slate-900">Historial reciente</h3>
                    </div>
                  </div>
                  {recentStudies.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                      Guarda una metrica candidata para crear el primer estudio persistente.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentStudies.slice(0, 5).map((study) => (
                        <div key={study.id} className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-black leading-5 text-slate-900">{study.title}</p>
                            <Badge variant={study.status === 'promoted' || study.status === 'decided' ? 'ok' : 'neutral'} size="sm">
                              {study.status}
                            </Badge>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {scopeLabel((study.scope_type === 'meter' || study.scope_type === 'custom') ? 'site' : study.scope_type)} - {study.scope_label ?? 'Sin frontera'} · confianza {Math.round(Number(study.confidence_score ?? 0))}%
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </section>
          </main>
        </div>
      </Card>
    </div>
  )
}

function StudyMetric({
  label,
  value,
  unit,
  icon,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  unit?: string
  icon: ReactNode
  tone?: 'neutral' | 'ok' | 'warn' | 'danger'
}) {
  const toneClass = {
    neutral: 'text-slate-900',
    ok: 'text-emerald-600',
    warn: 'text-amber-600',
    danger: 'text-rose-600',
  }[tone]

  return (
    <div className="border-b border-slate-200 p-3 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
      <div className="mb-1 flex items-center gap-1.5 text-slate-400">{icon}<p className="text-[9px] font-black uppercase tracking-widest">{label}</p></div>
      <p className={`text-xl font-black tracking-tight ${toneClass}`}>{value}</p>
      {unit && <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">{unit}</p>}
    </div>
  )
}

function FindingRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={[
      'flex items-start gap-2 rounded-xl border px-3 py-2 text-xs font-semibold leading-5',
      ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700',
    ].join(' ')}>
      {ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
      {text}
    </div>
  )
}

function TraceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <dt className="font-bold text-slate-500">{label}</dt>
      <dd className="max-w-[190px] text-right font-semibold text-slate-800">{value}</dd>
    </div>
  )
}

function DecisionButton({
  enabled,
  label,
  detail,
  onClick,
}: {
  enabled: boolean
  label: string
  detail: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition-all hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="block text-xs font-black text-slate-900">{label}</span>
      <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{detail}</span>
    </button>
  )
}

function scopeLabel(scope: StudyScopeType) {
  const labels: Record<StudyScopeType, string> = {
    site: 'Planta',
    area: 'Area',
    system: 'Sistema',
    equipment: 'Equipo',
  }
  return labels[scope]
}

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'
