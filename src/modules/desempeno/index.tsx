import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Database,
  FlaskConical,
  Gauge,
  LineChart as LineChartIcon,
  Link2,
  Plus,
  Save,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  Variable,
  X,
  Zap,
} from 'lucide-react'
import { SignificantVariablesWorkbench } from './views/SignificantVariablesWorkbench'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '@/services/supabase'
import { computeEnPITrend } from '@/services/enpi-engine'
import type { EnPITrendPoint } from '@/services/enpi-engine'
import { Badge, utilityBadgeVariant } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Card } from '@/shared/Card'
import { ConfirmDialog } from '@/shared/ConfirmDialog'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import { getUtilityLabel } from '@/shared/OperationalContext'
import { getTariffUnits } from '@/services/measurement-engine/unitCatalog'
import { useUIStore } from '@/store/uiStore'

interface EnPI {
  id: string
  name: string
  utility: string
  unit: string
  scope: string
  frequency: string
  is_active: boolean
  description?: string | null
  formula?: EnPIFormula | null
  // F2 — referential sources
  numerator_type?: 'formula' | 'balance_sheet' | 'measurement_point'
  numerator_ref_id?: string | null
  numerator_side?: 'input' | 'output' | 'net' | null
  denominator_type?: 'formula' | 'relevant_variable'
  denominator_ref_id?: string | null
  primary_group_id?: string | null
  baselines?: Baseline[]
  targets?: TargetRow[]
  results?: PerformanceResult[]
  linkedImprovements?: LinkedImprovement[]
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

interface EnPIGroup {
  id: string
  name: string
  group_type: string
  utility_type: string | null
  sort_order: number
}

interface EnPIGroupMember {
  group_id: string
  enpi_id: string
  membership_role: string
}

interface EnPIFormula {
  numerator?: FormulaTerm
  denominator?: FormulaTerm
  variables?: SignificantVariable[]
  period_alignment?: string
  method?: string
  notes?: string
}

interface FormulaTerm {
  label?: string
  source_type?: 'meter' | 'manual' | 'calculated'
  measurement_point_id?: string
  unit?: string
  aggregation?: 'sum' | 'avg' | 'last' | 'max' | 'min'
  expression?: string
}

interface SignificantVariable {
  name: string
  unit: string
  source_type: 'meter' | 'manual' | 'calculated'
  expected_impact: 'positive' | 'negative' | 'neutral'
  description?: string
}

interface Baseline {
  id: string
  value: number
  version: number
  method: string
  reference_period_start?: string | null
  reference_period_end?: string | null
  period_start?: string | null
  period_end?: string | null
  unit: string
}

interface TargetRow {
  id: string
  name: string
  target_type: string
  target_value: number
  unit: string
  status: string
  deadline?: string | null
}

interface PerformanceResult {
  id: string
  period_start: string
  period_end?: string | null
  actual_value: number
  baseline_value: number | null
  target_value: number | null
  deviation_percent: number | null
}

interface MeasurementPoint {
  id: string
  tag: string
  name: string
  utility: string
  measurement_type: string
  quantity: string
  unit: string
  source_type: string
}

interface LinkedImprovement {
  id: string
  title: string
  status: string
  priority: string
  estimated_energy_savings: number | null
  savings_unit: string | null
  estimated_cost_savings: number | null
}

type EnPIFormModal = { open: boolean; enpiId: string | null }
const EMPTY_ENPI = {
  name: 'kWh por libra producida',
  utility: 'electricity',
  unit: 'kWh/lb',
  scope: 'site',
  frequency: 'monthly',
  description: '',
  numerator_label: 'Energía eléctrica consumida',
  numerator_source_type: 'meter' as FormulaTerm['source_type'],
  numerator_measurement_point_id: '',
  numerator_unit: 'kWh',
  numerator_aggregation: 'sum' as FormulaTerm['aggregation'],
  numerator_expression: '',
  denominator_label: 'Libras producidas',
  denominator_source_type: 'manual' as FormulaTerm['source_type'],
  denominator_measurement_point_id: '',
  denominator_unit: 'lb',
  denominator_aggregation: 'sum' as FormulaTerm['aggregation'],
  denominator_expression: '',
  variables: [
    { name: 'Mezcla de producto', unit: '%', source_type: 'manual', expected_impact: 'neutral', description: 'Variable significativa del periodo' },
    { name: 'Horas de operación', unit: 'h', source_type: 'manual', expected_impact: 'negative', description: 'Normaliza carga y utilización' },
  ] as SignificantVariable[],
  method: 'ratio',
  // F2 — referential mode
  numerator_mode: 'formula' as 'formula' | 'referential',
  ref_numerator_type: 'measurement_point' as 'balance_sheet' | 'measurement_point',
  ref_numerator_ref_id: '',
  ref_numerator_side: 'input' as 'input' | 'output' | 'net',
  ref_denominator_ref_id: '',
  primary_group_id: '',
}

const EMPTY_BASELINE = { value: '', method: 'average', period_start: '', period_end: '' }
const EMPTY_TARGET = { name: '', target_type: 'absolute_value', target_value: '', deadline: '' }

const UTILITY_OPTIONS = [
  'electricity',
  'natural_gas',
  'steam',
  'compressed_air',
  'chilled_water',
  'hot_water',
  'industrial_water',
  'diesel',
  'lpg',
  'solar_generation',
]

const DRIVER_UNITS = ['lb', 'ton', 'kg', 'unidad', 'batch', 'h', 'm2', 'm3', 'hab', 'pieza']

const SOURCE_LABELS: Record<string, string> = {
  meter: 'Medidor',
  manual: 'Captura operacional',
  calculated: 'Cálculo',
}

const AGGREGATION_LABELS: Record<string, string> = {
  sum: 'Suma del periodo',
  avg: 'Promedio',
  last: 'Último valor',
  max: 'Máximo',
  min: 'Mínimo',
}

export default function DesempenoPage() {
  const [enpis, setEnpis] = useState<EnPI[]>([])
  const [measurementPoints, setMeasurementPoints] = useState<MeasurementPoint[]>([])
  const [balanceSheets, setBalanceSheets] = useState<BalanceSheetOption[]>([])
  const [relevantVars, setRelevantVars] = useState<RelevantVariableOption[]>([])
  const [enpiGroups, setEnpiGroups] = useState<EnPIGroup[]>([])
  const [enpiGroupMembers, setEnpiGroupMembers] = useState<EnPIGroupMember[]>([])
  const [selectedEnpiGroup, setSelectedEnpiGroup] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [showEnPIForm, setShowEnPIForm] = useState(false)
  const [enpiDraft, setEnpiDraft] = useState<Partial<typeof EMPTY_ENPI> | null>(null)
  const [variablesWorkbench, setVariablesWorkbench] = useState<{ open: boolean; enpiId: string | null }>({ open: false, enpiId: null })
  const [baselineModal, setBaselineModal] = useState<EnPIFormModal>({ open: false, enpiId: null })
  const [targetModal, setTargetModal] = useState<EnPIFormModal>({ open: false, enpiId: null })
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })

  const { selectedSiteId, selectedUtilityType } = useUIStore()

  function openBlankEnPIForm() {
    setEnpiDraft(null)
    setShowEnPIForm(true)
  }

  const loadEnpis = useCallback(async () => {
    if (!selectedSiteId) {
      setEnpis([])
      setMeasurementPoints([])
      setEnpiGroups([])
      setEnpiGroupMembers([])
      return
    }

    setLoading(true)
    let enpiQuery = supabase.from('energy_enpis').select('*').eq('site_id', selectedSiteId).order('name')
    let pointsQuery = supabase
      .from('measurement_points')
      .select('id,tag,name,utility,measurement_type,quantity,unit,source_type')
      .eq('site_id', selectedSiteId)
      .eq('is_active', true)
      .order('tag')

    if (selectedUtilityType) {
      enpiQuery = enpiQuery.eq('utility', selectedUtilityType)
      pointsQuery = pointsQuery.eq('utility', selectedUtilityType)
    }

    const [
      { data: enpiRows },
      { data: pointRows },
      { data: improvementRows },
      { data: sheetsRows },
      { data: relevantRows },
      { data: groupRows },
      { data: memberRows },
    ] = await Promise.all([
      enpiQuery,
      pointsQuery,
      supabase
        .from('energy_improvements')
        .select('id,title,status,priority,source_enpi_id,estimated_energy_savings,savings_unit,estimated_cost_savings')
        .eq('site_id', selectedSiteId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false }),
      supabase
        .from('energy_balance_sheets')
        .select('id,name,period_start,utility')
        .eq('site_id', selectedSiteId)
        .order('period_start', { ascending: false }),
      supabase
        .from('relevant_variables')
        .select('id,name,unit')
        .eq('site_id', selectedSiteId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('energy_enpi_groups')
        .select('id,name,group_type,utility_type,sort_order')
        .eq('site_id', selectedSiteId)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('energy_enpi_group_members')
        .select('group_id,enpi_id,membership_role'),
    ])
    setBalanceSheets((sheetsRows ?? []) as BalanceSheetOption[])
    setRelevantVars((relevantRows ?? []) as RelevantVariableOption[])
    setEnpiGroups((groupRows ?? []) as EnPIGroup[])
    setEnpiGroupMembers((memberRows ?? []) as EnPIGroupMember[])
    setMeasurementPoints((pointRows || []) as MeasurementPoint[])

    if (!enpiRows) {
      setLoading(false)
      return
    }

    const enriched: EnPI[] = await Promise.all(enpiRows.map(async (enpi) => {
      const [{ data: baselines }, { data: targets }, { data: results }] = await Promise.all([
        supabase.from('energy_baselines').select('*').eq('enpi_id', enpi.id).order('version', { ascending: false }).limit(4),
        supabase.from('energy_targets').select('*').eq('enpi_id', enpi.id).order('created_at', { ascending: false }),
        supabase.from('energy_performance_results').select('*').eq('enpi_id', enpi.id).order('period_start', { ascending: false }).limit(18),
      ])

      return {
        ...enpi,
        formula: normalizeFormula(enpi.formula),
        baselines: (baselines || []) as Baseline[],
        targets: (targets || []) as TargetRow[],
        results: (results || []) as PerformanceResult[],
        linkedImprovements: ((improvementRows || []) as Array<LinkedImprovement & { source_enpi_id: string | null }>)
          .filter((item) => item.source_enpi_id === enpi.id),
      }
    }))

    setEnpis(enriched)
    if (!selected && enriched[0]) setSelected(enriched[0].id)
    setLoading(false)
  }, [selected, selectedSiteId, selectedUtilityType])

  useEffect(() => { loadEnpis() }, [loadEnpis])

  const selectedEnpi = enpis.find((item) => item.id === selected) || enpis[0] || null
  const portfolio = useMemo(() => buildPortfolioStats(enpis), [enpis])
  const visibleEnpis = useMemo(() => {
    if (selectedEnpiGroup === 'all') return enpis
    const allowed = new Set(enpiGroupMembers.filter((member) => member.group_id === selectedEnpiGroup).map((member) => member.enpi_id))
    return enpis.filter((enpi) => allowed.has(enpi.id) || enpi.primary_group_id === selectedEnpiGroup)
  }, [enpiGroupMembers, enpis, selectedEnpiGroup])

  async function handleCreateEnPI(form: typeof EMPTY_ENPI) {
    if (!selectedSiteId || !form.name) return
    const formula = buildFormulaFromForm(form)
    const isReferential = form.numerator_mode === 'referential'

    const relevantVar = isReferential ? relevantVars.find((v) => v.id === form.ref_denominator_ref_id) : null
    const refPoint = isReferential && form.ref_numerator_type === 'measurement_point'
      ? measurementPoints.find((point) => point.id === form.ref_numerator_ref_id)
      : null
    const numeratorUnit = isReferential
      ? (form.ref_numerator_type === 'measurement_point' ? refPoint?.unit : 'kWh-eq')
      : form.numerator_unit
    const unit = isReferential
      ? `${numeratorUnit ?? 'energia'}/${relevantVar?.unit ?? 'prod'}`
      : `${form.numerator_unit}/${form.denominator_unit}`

    const { data: created } = await supabase.from('energy_enpis').insert({
      site_id: selectedSiteId,
      name: form.name,
      utility: form.utility,
      unit,
      scope: form.scope,
      frequency: form.frequency,
      description: form.description,
      primary_group_id: form.primary_group_id || null,
      formula,
      ...(isReferential && {
        numerator_type: form.ref_numerator_type,
        numerator_ref_id: form.ref_numerator_ref_id || null,
        numerator_side: form.ref_numerator_type === 'balance_sheet' ? form.ref_numerator_side : null,
        denominator_type: form.ref_denominator_ref_id ? 'relevant_variable' : 'formula',
        denominator_ref_id: form.ref_denominator_ref_id || null,
      }),
    }).select('id').single()

    if (created?.id && form.primary_group_id) {
      await supabase.from('energy_enpi_group_members').insert({
        group_id: form.primary_group_id,
        enpi_id: created.id,
        membership_role: 'primary',
      })
    }
    setShowEnPIForm(false)
    setEnpiDraft(null)
    loadEnpis()
  }

  async function handleAddBaseline(enpiId: string, form: typeof EMPTY_BASELINE) {
    const enpi = enpis.find((item) => item.id === enpiId)
    if (!enpi || !form.value) return
    const maxVersion = Math.max(0, ...(enpi.baselines?.map((baseline) => baseline.version) || []))

    await supabase.from('energy_baselines').insert({
      enpi_id: enpiId,
      method: form.method,
      value: Number.parseFloat(form.value),
      unit: enpi.unit,
      version: maxVersion + 1,
      reference_period_start: form.period_start || null,
      reference_period_end: form.period_end || null,
    })
    setBaselineModal({ open: false, enpiId: null })
    loadEnpis()
  }

  async function handleAddTarget(enpiId: string, form: typeof EMPTY_TARGET) {
    const enpi = enpis.find((item) => item.id === enpiId)
    if (!enpi || !form.name || !form.target_value) return

    await supabase.from('energy_targets').insert({
      enpi_id: enpiId,
      name: form.name,
      target_type: form.target_type,
      target_value: Number.parseFloat(form.target_value),
      unit: enpi.unit,
      deadline: form.deadline || null,
    })
    setTargetModal({ open: false, enpiId: null })
    loadEnpis()
  }

  async function confirmDeleteEnPI() {
    if (!deleteConfirm.id) return
    setDeleteConfirm({ open: false, id: null })
    await supabase.from('energy_enpis').delete().eq('id', deleteConfirm.id)
    if (selected === deleteConfirm.id) setSelected(null)
    loadEnpis()
  }

  return (
    <div className="space-y-3">
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950 px-4 py-2 text-white shadow-sm">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_30%,rgba(34,197,94,0.22),transparent_34%),radial-gradient(circle_at_42%_70%,rgba(14,165,233,0.18),transparent_30%)]" />
        <div className="relative z-10 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-1 hidden flex-wrap items-center gap-1.5 sm:flex">
              <Badge variant="info" className="border-sky-400/30 bg-sky-400/10 text-sky-100">Método técnico</Badge>
              <Badge variant="neutral" className="border-white/15 bg-white/10 text-white">Periodo común</Badge>
              <Badge variant="neutral" className="border-white/15 bg-white/10 text-white">Variables significativas</Badge>
            </div>
            <h1 className="text-base font-black tracking-tight sm:text-lg">Centro técnico de EnPIs</h1>
            <p className="mt-0.5 hidden max-w-2xl text-[11px] leading-4 text-slate-300 lg:block">
              Define indicadores como una relación energética trazable: consumo, variable relevante del mismo periodo, contexto operativo, baseline, objetivo y resultado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={openBlankEnPIForm}
              disabled={!selectedSiteId}
              className="bg-white text-slate-950 hover:bg-slate-100"
            >
              Nuevo EnPI técnico
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <PortfolioTile label="EnPIs activos" value={portfolio.total} icon={<Gauge size={15} />} />
        <PortfolioTile label="Con baseline" value={`${portfolio.baselineCoverage}%`} icon={<BarChart3 size={15} />} />
        <PortfolioTile label="Sobre baseline" value={portfolio.deviated} icon={<TrendingUp size={15} />} tone={portfolio.deviated > 0 ? 'warn' : 'ok'} />
        <PortfolioTile label="Mejorando" value={portfolio.improving} icon={<TrendingDown size={15} />} tone="ok" />
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm font-semibold text-slate-400">Cargando centro de desempeño...</div>
      ) : visibleEnpis.length === 0 ? (
        <EmptyState
          icon={<LineChartIcon size={48} strokeWidth={1.5} />}
          title="Sin EnPIs técnicos"
          description={`No hay indicadores para ${getUtilityLabel(selectedUtilityType)} en esta planta. Crea uno como kWh/lb, kWh/ton o kWh/unidad con periodo y variables controladas.`}
          action={selectedSiteId && (
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={openBlankEnPIForm}>Crear primer EnPI</Button>
          )}
        />
      ) : (
        <div className="grid min-h-0 grid-cols-1 gap-3 md:h-[calc(100dvh-13rem)] md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
          <EnPILibrary
            enpis={visibleEnpis}
            groups={enpiGroups}
            selectedGroup={selectedEnpiGroup}
            onGroup={setSelectedEnpiGroup}
            selectedId={selectedEnpi?.id || null}
            onSelect={setSelected}
            onCreate={openBlankEnPIForm}
          />
          {selectedEnpi && (
            <>
              <EnPIWorkbench
                enpi={selectedEnpi}
                measurementPoints={measurementPoints}
                relevantVars={relevantVars}
                onBaseline={() => setBaselineModal({ open: true, enpiId: selectedEnpi.id })}
                onTarget={() => setTargetModal({ open: true, enpiId: selectedEnpi.id })}
                onDelete={() => setDeleteConfirm({ open: true, id: selectedEnpi.id })}
                onVariables={() => setVariablesWorkbench({ open: true, enpiId: selectedEnpi.id })}
              />
              {variablesWorkbench.open && variablesWorkbench.enpiId === selectedEnpi.id && (
                <Modal
                  open
                  onClose={() => setVariablesWorkbench({ open: false, enpiId: null })}
                  title="Variables significativas y análisis de regresión"
                  size="xl"
                >
                  <SignificantVariablesWorkbench
                    enpi={{ id: selectedEnpi.id, name: selectedEnpi.name, unit: selectedEnpi.unit }}
                    measurementPoints={measurementPoints}
                    onClose={() => setVariablesWorkbench({ open: false, enpiId: null })}
                  />
                </Modal>
              )}
            </>
          )}
        </div>
      )}

      <Modal
        open={showEnPIForm}
        onClose={() => {
          setShowEnPIForm(false)
          setEnpiDraft(null)
        }}
        title="Definir EnPI técnico"
        size="xl"
      >
        <EnPIForm
          onSave={handleCreateEnPI}
          onCancel={() => {
            setShowEnPIForm(false)
            setEnpiDraft(null)
          }}
          utilityType={selectedUtilityType}
          measurementPoints={measurementPoints}
          balanceSheets={balanceSheets}
          relevantVars={relevantVars}
          enpiGroups={enpiGroups}
          initial={enpiDraft ?? undefined}
        />
      </Modal>

      <Modal
        open={baselineModal.open}
        onClose={() => setBaselineModal({ open: false, enpiId: null })}
        title="Registrar baseline"
      >
        {baselineModal.enpiId && (
          <BaselineForm
            enpi={enpis.find((item) => item.id === baselineModal.enpiId)!}
            onSave={(form) => handleAddBaseline(baselineModal.enpiId!, form)}
            onCancel={() => setBaselineModal({ open: false, enpiId: null })}
          />
        )}
      </Modal>

      <Modal
        open={targetModal.open}
        onClose={() => setTargetModal({ open: false, enpiId: null })}
        title="Nuevo objetivo"
      >
        {targetModal.enpiId && (
          <TargetForm
            enpi={enpis.find((item) => item.id === targetModal.enpiId)!}
            onSave={(form) => handleAddTarget(targetModal.enpiId!, form)}
            onCancel={() => setTargetModal({ open: false, enpiId: null })}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Eliminar EnPI"
        description="Se eliminaran el indicador y todos sus datos historicos. Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onConfirm={confirmDeleteEnPI}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
      />
    </div>
  )
}

function ReferentialTrendPanel({ enpi, relevantVars }: { enpi: EnPI; relevantVars: RelevantVariableOption[] }) {
  const [trend, setTrend] = useState<EnPITrendPoint[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enpi.numerator_type || enpi.numerator_type === 'formula') return
    setLoading(true)
    computeEnPITrend({
      numerator_type: enpi.numerator_type,
      numerator_ref_id: enpi.numerator_ref_id ?? null,
      numerator_side: (enpi.numerator_side as 'input' | 'output' | 'net' | null) ?? null,
      denominator_type: enpi.denominator_type ?? 'formula',
      denominator_ref_id: enpi.denominator_ref_id ?? null,
    }, 18)
      .then(setTrend)
      .finally(() => setLoading(false))
  }, [enpi.id, enpi.numerator_type, enpi.numerator_ref_id, enpi.denominator_ref_id])

  const relevantVar = relevantVars.find((v) => v.id === enpi.denominator_ref_id)
  const chartData = trend.filter((p) => p.enpi_value != null).map((p) => ({
    period: p.period.slice(5),
    value: Number(p.enpi_value?.toFixed(3)),
    num: p.numerator_value,
    den: p.denominator_value,
  }))

  const MONTHS_ES: Record<string, string> = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
    '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
  }

  return (
    <Card padding="none" className="overflow-hidden rounded-xl border-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white px-4 py-3">
        <Database size={14} className="text-blue-500 shrink-0" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tendencia referencial</p>
          <h3 className="text-sm font-bold text-slate-900">
            Calculado desde {enpi.numerator_type === 'balance_sheet' ? 'balance sheet' : 'medidor'} ÷ {relevantVar?.name ?? 'variable relevante'}
          </h3>
        </div>
      </div>
      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!loading && chartData.length === 0 && (
        <div className="py-10 text-center text-xs text-slate-400 italic">
          Sin datos calculables en los últimos 18 meses — verifica que las lecturas energéticas y la variable relevante cubran el mismo período.
        </div>
      )}
      {!loading && chartData.length > 0 && (
        <div className="p-4">
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis dataKey="period" tickFormatter={(v) => MONTHS_ES[v] ?? v} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={44} />
              <Tooltip
                contentStyle={{ borderRadius: 10, borderColor: '#e2e8f0', fontSize: 11 }}
                formatter={(val, name) => [Number(val ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 3 }), String(name)]}
              />
              <Line type="monotone" dataKey="value" name={enpi.unit} stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: '#2563eb' }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
            <div>
              <p className="text-slate-400">Períodos con datos</p>
              <p className="font-black text-slate-900">{chartData.length}</p>
            </div>
            <div>
              <p className="text-slate-400">Último valor</p>
              <p className="font-black text-slate-900">{chartData[chartData.length - 1]?.value ?? '—'} <span className="text-slate-400">{enpi.unit}</span></p>
            </div>
            <div>
              <p className="text-slate-400">Denominador ({relevantVar?.unit ?? '—'})</p>
              <p className="font-black text-slate-900">{chartData[chartData.length - 1]?.den?.toLocaleString('es-MX', { maximumFractionDigits: 0 }) ?? '—'}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function EnPILibrary({
  enpis,
  groups,
  selectedGroup,
  onGroup,
  selectedId,
  onSelect,
  onCreate,
}: {
  enpis: EnPI[]
  groups: EnPIGroup[]
  selectedGroup: string
  onGroup: (id: string) => void
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  return (
    <Card padding="none" className="flex min-h-[360px] flex-col overflow-hidden rounded-xl border-slate-200 xl:h-full">
      <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Biblioteca EnPI</p>
            <h2 className="text-sm font-bold text-slate-900">Indicadores definidos</h2>
          </div>
          <Button size="xs" variant="secondary" icon={<Plus size={13} />} onClick={onCreate} aria-label="Nuevo EnPI" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => onGroup('all')}
            className={[
              'rounded-lg px-2 py-1 text-[10px] font-bold transition-colors',
              selectedGroup === 'all' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900',
            ].join(' ')}
          >
            Todos
          </button>
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => onGroup(group.id)}
              className={[
                'rounded-lg px-2 py-1 text-[10px] font-bold transition-colors',
                selectedGroup === group.id ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900',
              ].join(' ')}
            >
              {group.name}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {enpis.map((enpi) => {
          const latest = enpi.results?.[0]
          const deviation = Number(latest?.deviation_percent || 0)
          const selected = enpi.id === selectedId
          return (
            <button
              key={enpi.id}
              onClick={() => onSelect(enpi.id)}
              className={[
                'mb-1.5 w-full rounded-lg border px-2.5 py-2 text-left transition-all',
                selected ? 'border-brand-blue bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              ].join(' ')}
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-slate-900">{enpi.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">{enpi.unit}</p>
                </div>
                <Badge variant={utilityBadgeVariant(enpi.utility)} size="sm" className="shrink-0">
                  {getUtilityLabel(enpi.utility)}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{translateScope(enpi.scope)}</span>
                {latest ? (
                  <span className={['text-xs font-black', deviation > 0 ? 'text-rose-600' : 'text-emerald-600'].join(' ')}>
                    {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-600">sin resultado</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function EnPIWorkbench({
  enpi,
  measurementPoints,
  relevantVars,
  onBaseline,
  onTarget,
  onDelete,
  onVariables,
}: {
  enpi: EnPI
  measurementPoints: MeasurementPoint[]
  relevantVars: RelevantVariableOption[]
  onBaseline: () => void
  onTarget: () => void
  onDelete: () => void
  onVariables: () => void
}) {
  const baseline = enpi.baselines?.[0]
  const activeTargets = enpi.targets?.filter((target) => target.status === 'active') || []
  const latest = enpi.results?.[0]
  const chartData = buildChartData(enpi)
  const formulaHealth = getFormulaHealth(enpi, measurementPoints)
  const numerator = enpi.formula?.numerator
  const denominator = enpi.formula?.denominator
  const variables = enpi.formula?.variables || []
  const linkedImprovements = enpi.linkedImprovements || []

  return (
    <div className="min-h-0 space-y-3 overflow-y-auto pr-1 xl:h-full">
      <Card padding="none" className="overflow-hidden rounded-xl border-slate-200">
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant={utilityBadgeVariant(enpi.utility)}>{getUtilityLabel(enpi.utility)}</Badge>
                <Badge variant="neutral">{translateScope(enpi.scope)}</Badge>
                <Badge variant="neutral">{translateFrequency(enpi.frequency)}</Badge>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">{enpi.unit}</span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-slate-950">{enpi.name}</h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                {enpi.description || 'Indicador tecnico para conectar consumo energetico, una variable relevante del mismo periodo y variables explicativas de operacion.'}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button size="sm" variant="secondary" leftIcon={<BarChart3 size={14} />} onClick={onBaseline}>Baseline</Button>
              <Button size="sm" variant="secondary" leftIcon={<Target size={14} />} onClick={onTarget}>Objetivo</Button>
              <Button size="sm" variant="secondary" leftIcon={<FlaskConical size={14} />} onClick={onVariables}>Variables</Button>
              <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={onDelete} aria-label="Eliminar EnPI" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-0 border-b border-slate-200 lg:grid-cols-4">
          <MetricPanel label="Último resultado" value={latest ? latest.actual_value.toFixed(3) : '-'} unit={enpi.unit} icon={<Gauge size={15} />} />
          <MetricPanel label="Baseline" value={baseline ? Number(baseline.value).toFixed(3) : '-'} unit={enpi.unit} icon={<BarChart3 size={15} />} />
          <MetricPanel
            label="Desviación"
            value={latest?.deviation_percent != null ? `${latest.deviation_percent > 0 ? '+' : ''}${Number(latest.deviation_percent).toFixed(1)}%` : '-'}
            tone={Number(latest?.deviation_percent || 0) > 0 ? 'danger' : 'ok'}
            icon={Number(latest?.deviation_percent || 0) > 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
          />
          <MetricPanel label="Trazabilidad" value={`${formulaHealth.score}/4`} unit={formulaHealth.label} icon={<CheckCircle2 size={15} />} tone={formulaHealth.score >= 3 ? 'ok' : 'warn'} />
        </div>

        <div className="grid grid-cols-1 gap-3 p-3 2xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rendimiento normalizado</p>
                <h3 className="text-sm font-bold text-slate-900">EnPI vs baseline y objetivo</h3>
              </div>
              {latest && (
                <Badge variant={Number(latest.deviation_percent || 0) > 0 ? 'danger' : 'ok'}>
                  {Number(latest.deviation_percent || 0) > 0 ? 'sobre consumo' : 'mejor que baseline'}
                </Badge>
              )}
            </div>
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 12 }} />
                  {baseline && <ReferenceLine y={Number(baseline.value)} stroke="#f97316" strokeDasharray="5 4" />}
                  <Bar dataKey="deviation" name="Desviación %" fill="#fca5a5" radius={[4, 4, 0, 0]} yAxisId={0} opacity={0.25} />
                  <Line type="monotone" dataKey="actual" name={enpi.unit} stroke="#0f172a" strokeWidth={3} dot={{ r: 3, fill: '#0f172a' }} />
                  <Line type="monotone" dataKey="target" name="Objetivo" stroke="#059669" strokeWidth={2} dot={false} strokeDasharray="5 4" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-[220px] place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                <div>
                  <LineChartIcon className="mx-auto mb-2 text-slate-300" size={34} />
                  <p className="text-sm font-semibold text-slate-500">Aún no hay suficientes resultados</p>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">Cuando captures energía y variables relevantes del mismo periodo, aquí verás la tendencia del EnPI.</p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Definición técnica</p>
              <h3 className="text-sm font-bold text-slate-900">Cómo se calcula</h3>
            </div>
            <FormulaDiagram numerator={numerator} denominator={denominator} unit={enpi.unit} />
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SourceCard title="Numerador" term={numerator} measurementPoints={measurementPoints} />
              <SourceCard title="Denominador" term={denominator} measurementPoints={measurementPoints} />
            </div>
          </section>
        </div>
      </Card>

      {(enpi.numerator_type === 'measurement_point' || enpi.numerator_type === 'balance_sheet') && (
        <ReferentialTrendPanel enpi={enpi} relevantVars={relevantVars} />
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_340px]">
        <Card padding="sm" className="rounded-xl border-slate-200">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Variables significativas</p>
              <h3 className="text-sm font-bold text-slate-900">Condiciones que explican el periodo</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={variables.length > 0 ? 'ok' : 'warn'}>{variables.length} variables</Badge>
              <Button size="xs" variant="secondary" leftIcon={<FlaskConical size={12} />} onClick={onVariables}>
                Datos y análisis
              </Button>
            </div>
          </div>
          {variables.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Agrega variables como volumen producido, temperatura, mezcla, humedad, turnos, ocupación, m2 u horas de operación para explicar el rendimiento.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {variables.map((variable, index) => (
                <div key={`${variable.name}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{variable.name}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {SOURCE_LABELS[variable.source_type]} · {variable.unit}
                      </p>
                    </div>
                    <Badge variant={variable.expected_impact === 'negative' ? 'warn' : variable.expected_impact === 'positive' ? 'ok' : 'neutral'} size="sm">
                      {translateImpact(variable.expected_impact)}
                    </Badge>
                  </div>
                  {variable.description && <p className="mt-2 text-xs leading-5 text-slate-500">{variable.description}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="sm" className="rounded-xl border-slate-200">
          <div className="mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Checklist técnico</p>
            <h3 className="text-sm font-bold text-slate-900">Listo para control</h3>
          </div>
          <div className="space-y-2">
            {formulaHealth.items.map((item) => (
              <div
                key={item.label}
                className={[
                  'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold',
                  item.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700',
                ].join(' ')}
              >
                {item.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {item.label}
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-slate-200 pt-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones / proyectos</p>
              <Badge variant={linkedImprovements.length > 0 ? 'ok' : 'warn'} size="sm">{linkedImprovements.length}</Badge>
            </div>
            {linkedImprovements.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                Este EnPI todavía no tiene acciones de mejora vinculadas. Desde SGEn puedes crear un objetivo y generar su plan en Acciones / Proyectos.
              </div>
            ) : (
              <div className="space-y-2">
                {linkedImprovements.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold leading-5 text-slate-900">{item.title}</p>
                      <Badge variant={item.priority === 'high' || item.priority === 'critical' ? 'warn' : 'neutral'} size="sm">{item.priority}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {item.status} · {Number(item.estimated_energy_savings || 0).toLocaleString('es')} {item.savings_unit || ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {activeTargets.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Objetivos activos</p>
              <div className="space-y-2">
                {activeTargets.map((target) => (
                  <div key={target.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-sm font-bold text-slate-900">{target.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{target.target_value} {target.unit}</p>
                    {target.deadline && <p className="mt-2 text-[11px] text-slate-400">Fecha limite: {formatDate(target.deadline)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function EnPIForm({
  onSave,
  onCancel,
  utilityType,
  measurementPoints,
  balanceSheets,
  relevantVars,
  enpiGroups,
  initial,
}: {
  onSave: (form: typeof EMPTY_ENPI) => void
  onCancel: () => void
  utilityType: string | null
  measurementPoints: MeasurementPoint[]
  balanceSheets: BalanceSheetOption[]
  relevantVars: RelevantVariableOption[]
  enpiGroups: EnPIGroup[]
  initial?: Partial<typeof EMPTY_ENPI>
}) {
  const initialUtility = utilityType || 'electricity'
  const initialNumerator = getTariffUnits(initialUtility)[0] || 'kWh'
  const [form, setForm] = useState({ ...EMPTY_ENPI, utility: initialUtility, numerator_unit: initialNumerator, ...initial })
  const set = (partial: Partial<typeof EMPTY_ENPI>) => setForm({ ...form, ...partial })

  const numeratorUnits = getTariffUnits(form.utility)
  const compatiblePoints = measurementPoints.filter((point) => point.utility === form.utility)

  useEffect(() => {
    setForm({ ...EMPTY_ENPI, utility: initialUtility, numerator_unit: initialNumerator, ...initial })
  }, [initial, initialNumerator, initialUtility])

  useEffect(() => {
    const units = getTariffUnits(form.utility)
    if (units.length > 0 && !units.includes(form.numerator_unit)) {
      setForm((prev) => ({ ...prev, numerator_unit: units[0] }))
    }
  }, [form.numerator_unit, form.utility])

  function updateVariable(index: number, partial: Partial<SignificantVariable>) {
    const variables = [...form.variables]
    variables[index] = { ...variables[index], ...partial }
    set({ variables })
  }

  function addVariable() {
    set({
      variables: [
        ...form.variables,
        { name: '', unit: '', source_type: 'manual', expected_impact: 'neutral', description: '' },
      ],
    })
  }

  function removeVariable(index: number) {
    set({ variables: form.variables.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Calculator size={15} className="text-brand-blue" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Paso 1 · Identidad y propósito</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <LabeledField label="Nombre del EnPI" required>
            <input className={inputClass} value={form.name} onChange={(event) => set({ name: event.target.value })} autoFocus />
          </LabeledField>
          <LabeledField label="Utility">
            <select className={inputClass} value={form.utility} onChange={(event) => set({ utility: event.target.value, numerator_measurement_point_id: '' })}>
              {UTILITY_OPTIONS.map((utility) => <option key={utility} value={utility}>{getUtilityLabel(utility)}</option>)}
            </select>
          </LabeledField>
          <LabeledField label="Alcance">
            <select className={inputClass} value={form.scope} onChange={(event) => set({ scope: event.target.value })}>
              <option value="site">Planta</option>
              <option value="area">Área</option>
              <option value="utility_system">Sistema utility</option>
              <option value="equipment">Equipo</option>
              <option value="process">Proceso</option>
            </select>
          </LabeledField>
          <LabeledField label="Frecuencia / periodo común">
            <select className={inputClass} value={form.frequency} onChange={(event) => set({ frequency: event.target.value })}>
              <option value="hourly">Hora</option>
              <option value="daily">Día</option>
              <option value="weekly">Semana</option>
              <option value="monthly">Mes</option>
            </select>
          </LabeledField>
          <LabeledField label="Grupo principal">
            <select className={inputClass} value={form.primary_group_id} onChange={(event) => set({ primary_group_id: event.target.value })}>
              <option value="">Sin grupo principal</option>
              {enpiGroups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </LabeledField>
          <LabeledField label="Descripción" className="md:col-span-2">
            <textarea
              className={`${inputClass} min-h-[72px] resize-none`}
              value={form.description}
              onChange={(event) => set({ description: event.target.value })}
              placeholder="Ej. Evalúa la energía consumida por libra producida usando energía y variable relevante del mismo periodo."
            />
          </LabeledField>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link2 size={15} className="text-brand-blue" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Paso 2 · Fórmula y fuentes de datos</p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-0.5">
            {(['formula', 'referential'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => set({ numerator_mode: mode })}
                className={[
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer',
                  form.numerator_mode === mode ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-700',
                ].join(' ')}
              >
                {mode === 'formula' ? <><Calculator size={11} /> Fórmula</> : <><Database size={11} /> Referencial</>}
              </button>
            ))}
          </div>
        </div>

        {form.numerator_mode === 'formula' ? (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr]">
              <TermEditor
                title="Numerador energético"
                term="numerator"
                form={form}
                setForm={set}
                measurementPoints={compatiblePoints}
                unitOptions={numeratorUnits.length > 0 ? numeratorUnits : ['kWh', 'MWh', 'GJ']}
              />
              <div className="grid place-items-center text-2xl font-black text-slate-300">/</div>
              <TermEditor
                title="Denominador operacional"
                term="denominator"
                form={form}
                setForm={set}
                measurementPoints={measurementPoints}
                unitOptions={DRIVER_UNITS}
              />
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-950 p-4 text-white">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resultado esperado</p>
                  <p className="mt-1 font-mono text-xl font-black">{form.numerator_unit}/{form.denominator_unit}</p>
                </div>
                <p className="max-w-md text-xs leading-5 text-slate-300">
                  La energía y las variables relevantes deben capturarse para el mismo periodo: {translateFrequency(form.frequency).toLowerCase()}.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
              El EnPI se calcula automáticamente leyendo medidores o balances existentes ÷ variable relevante — sin captura manual de resultados.
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr]">
              {/* Numerador referencial */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-bold text-slate-900">Numerador energético</p>
                <LabeledField label="Tipo de fuente">
                  <select className={inputClass} value={form.ref_numerator_type} onChange={(e) => set({ ref_numerator_type: e.target.value as typeof form.ref_numerator_type })}>
                    <option value="measurement_point">Punto de medición (MP)</option>
                    <option value="balance_sheet">Balance sheet</option>
                  </select>
                </LabeledField>
                {form.ref_numerator_type === 'measurement_point' ? (
                  <LabeledField label="Medidor">
                    <select className={inputClass} value={form.ref_numerator_ref_id} onChange={(e) => set({ ref_numerator_ref_id: e.target.value })}>
                      <option value="">Seleccionar medidor…</option>
                      {compatiblePoints.map((p) => (
                        <option key={p.id} value={p.id}>{p.tag} · {p.name} ({p.unit})</option>
                      ))}
                    </select>
                  </LabeledField>
                ) : (
                  <>
                    <LabeledField label="Balance sheet">
                      <select className={inputClass} value={form.ref_numerator_ref_id} onChange={(e) => set({ ref_numerator_ref_id: e.target.value })}>
                        <option value="">Seleccionar balance…</option>
                        {balanceSheets.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} · {s.period_start.slice(0, 7)}</option>
                        ))}
                      </select>
                    </LabeledField>
                    <LabeledField label="Lado del balance">
                      <select className={inputClass} value={form.ref_numerator_side} onChange={(e) => set({ ref_numerator_side: e.target.value as typeof form.ref_numerator_side })}>
                        <option value="input">Entrada (kWh-eq)</option>
                        <option value="output">Salida (kWh-eq)</option>
                        <option value="net">Neto entrada − salida</option>
                      </select>
                    </LabeledField>
                  </>
                )}
              </div>
              <div className="grid place-items-center text-2xl font-black text-slate-300">/</div>
              {/* Denominador referencial */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-bold text-slate-900">Variable base</p>
                <LabeledField label="Variable relevante">
                  <select className={inputClass} value={form.ref_denominator_ref_id} onChange={(e) => set({ ref_denominator_ref_id: e.target.value })}>
                    <option value="">Seleccionar variable…</option>
                    {relevantVars.map((v) => (
                      <option key={v.id} value={v.id}>{v.name} ({v.unit})</option>
                    ))}
                  </select>
                </LabeledField>
                {relevantVars.find((v) => v.id === form.ref_denominator_ref_id) && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1.5 text-[11px] text-emerald-700 flex items-center gap-1.5">
                    <Scale size={11} />
                    Unidad: {relevantVars.find((v) => v.id === form.ref_denominator_ref_id)?.unit}
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-white">
              <div className="flex items-center gap-3">
                <Database size={16} className="text-blue-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unidad resultante</p>
                  <p className="mt-0.5 font-mono text-xl font-black">
                    kWh-eq / {relevantVars.find((v) => v.id === form.ref_denominator_ref_id)?.unit ?? 'prod'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Variable size={15} className="text-brand-blue" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Paso 3 · Variables significativas</p>
          </div>
          <Button size="xs" variant="secondary" leftIcon={<Plus size={12} />} onClick={addVariable}>Variable</Button>
        </div>
        <div className="space-y-3">
          {form.variables.map((variable, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[1fr_100px_140px_140px_auto]">
              <input className={inputClass} value={variable.name} onChange={(event) => updateVariable(index, { name: event.target.value })} placeholder="Variable significativa" />
              <input className={`${inputClass} font-mono`} value={variable.unit} onChange={(event) => updateVariable(index, { unit: event.target.value })} placeholder="unidad" />
              <select className={inputClass} value={variable.source_type} onChange={(event) => updateVariable(index, { source_type: event.target.value as SignificantVariable['source_type'] })}>
                <option value="manual">Manual</option>
                <option value="meter">Medidor</option>
                <option value="calculated">Cálculo</option>
              </select>
              <select className={inputClass} value={variable.expected_impact} onChange={(event) => updateVariable(index, { expected_impact: event.target.value as SignificantVariable['expected_impact'] })}>
                <option value="neutral">Contexto</option>
                <option value="positive">Mejora</option>
                <option value="negative">Eleva consumo</option>
              </select>
              <Button size="xs" variant="ghost" icon={<X size={13} />} onClick={() => removeVariable(index)} aria-label="Quitar variable" />
              <input
                className={`${inputClass} lg:col-span-5`}
                value={variable.description || ''}
                onChange={(event) => updateVariable(index, { description: event.target.value })}
                placeholder="Cómo afecta el EnPI durante el periodo"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name || !form.numerator_unit || !form.denominator_unit} leftIcon={<Save size={14} />}>
          Crear EnPI
        </Button>
      </div>
    </div>
  )
}

function TermEditor({
  title,
  term,
  form,
  setForm,
  measurementPoints,
  unitOptions,
}: {
  title: string
  term: 'numerator' | 'denominator'
  form: typeof EMPTY_ENPI
  setForm: (partial: Partial<typeof EMPTY_ENPI>) => void
  measurementPoints: MeasurementPoint[]
  unitOptions: string[]
}) {
  const prefix = term === 'numerator' ? 'numerator' : 'denominator'
  const sourceType = form[`${prefix}_source_type`]
  const unit = form[`${prefix}_unit`]

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-3 text-xs font-bold text-slate-900">{title}</p>
      <div className="space-y-3">
        <LabeledField label="Nombre técnico">
          <input className={inputClass} value={form[`${prefix}_label`]} onChange={(event) => setForm({ [`${prefix}_label`]: event.target.value })} />
        </LabeledField>
        <div className="grid grid-cols-2 gap-2">
          <LabeledField label="Fuente">
            <select className={inputClass} value={sourceType} onChange={(event) => setForm({ [`${prefix}_source_type`]: event.target.value as FormulaTerm['source_type'] })}>
              <option value="meter">Medidor</option>
              <option value="manual">Manual</option>
              <option value="calculated">Cálculo</option>
            </select>
          </LabeledField>
          <LabeledField label="Agregación">
            <select className={inputClass} value={form[`${prefix}_aggregation`]} onChange={(event) => setForm({ [`${prefix}_aggregation`]: event.target.value as FormulaTerm['aggregation'] })}>
              <option value="sum">Suma</option>
              <option value="avg">Promedio</option>
              <option value="last">Último</option>
              <option value="max">Máximo</option>
              <option value="min">Mínimo</option>
            </select>
          </LabeledField>
        </div>
        {sourceType === 'meter' && (
          <LabeledField label="Medidor vinculado">
            <select className={inputClass} value={form[`${prefix}_measurement_point_id`]} onChange={(event) => setForm({ [`${prefix}_measurement_point_id`]: event.target.value })}>
              <option value="">Seleccionar medidor</option>
              {measurementPoints.map((point) => (
                <option key={point.id} value={point.id}>{point.tag} · {point.name} · {point.unit}</option>
              ))}
            </select>
          </LabeledField>
        )}
        {sourceType === 'calculated' && (
          <LabeledField label="Expresión">
            <input className={`${inputClass} font-mono`} value={form[`${prefix}_expression`]} onChange={(event) => setForm({ [`${prefix}_expression`]: event.target.value })} placeholder="SUM(M1) - SUM(M2)" />
          </LabeledField>
        )}
        <LabeledField label="Unidad">
          <select className={`${inputClass} font-mono`} value={unit} onChange={(event) => setForm({ [`${prefix}_unit`]: event.target.value })}>
            {unitOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </LabeledField>
      </div>
    </div>
  )
}

function BaselineForm({ enpi, onSave, onCancel }: {
  enpi: EnPI
  onSave: (form: typeof EMPTY_BASELINE) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({ ...EMPTY_BASELINE })
  const set = (partial: Partial<typeof EMPTY_BASELINE>) => setForm({ ...form, ...partial })

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
        <strong>{enpi.name}</strong> · {enpi.unit}. Usa un periodo representativo con las mismas fronteras del numerador, denominador y variables.
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LabeledField label="Valor baseline" required>
          <input className={`${inputClass} font-mono`} type="number" step="any" value={form.value} onChange={(event) => set({ value: event.target.value })} autoFocus />
        </LabeledField>
        <LabeledField label="Método">
          <select className={inputClass} value={form.method} onChange={(event) => set({ method: event.target.value })}>
            <option value="average">Promedio histórico</option>
            <option value="linear_regression">Regresión lineal</option>
            <option value="moving_average">Promedio móvil</option>
          </select>
        </LabeledField>
        <LabeledField label="Inicio referencia">
          <input className={inputClass} type="date" value={form.period_start} onChange={(event) => set({ period_start: event.target.value })} />
        </LabeledField>
        <LabeledField label="Fin referencia">
          <input className={inputClass} type="date" value={form.period_end} onChange={(event) => set({ period_end: event.target.value })} />
        </LabeledField>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(form)} disabled={!form.value} leftIcon={<Save size={14} />}>Guardar baseline</Button>
      </div>
    </div>
  )
}

function TargetForm({ enpi, onSave, onCancel }: {
  enpi: EnPI
  onSave: (form: typeof EMPTY_TARGET) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({ ...EMPTY_TARGET })
  const set = (partial: Partial<typeof EMPTY_TARGET>) => setForm({ ...form, ...partial })
  const baseline = enpi.baselines?.[0]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
        Objetivo para <strong>{enpi.name}</strong>. Un valor menor suele indicar mejor desempeño cuando el EnPI es consumo por unidad de actividad, producción, área u otro driver.
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LabeledField label="Nombre" required className="sm:col-span-2">
          <input className={inputClass} value={form.name} onChange={(event) => set({ name: event.target.value })} placeholder="Ej. Reducir 8% contra baseline" autoFocus />
        </LabeledField>
        <LabeledField label="Tipo">
          <select className={inputClass} value={form.target_type} onChange={(event) => set({ target_type: event.target.value })}>
            <option value="absolute_value">Valor absoluto</option>
            <option value="reduction_percent">% reducción vs baseline</option>
          </select>
        </LabeledField>
        <LabeledField label={form.target_type === 'reduction_percent' ? 'Reducción (%)' : `Valor (${enpi.unit})`} required>
          <input className={`${inputClass} font-mono`} type="number" step="any" value={form.target_value} onChange={(event) => set({ target_value: event.target.value })} />
        </LabeledField>
        <LabeledField label="Fecha límite" className="sm:col-span-2">
          <input className={inputClass} type="date" value={form.deadline} onChange={(event) => set({ deadline: event.target.value })} />
        </LabeledField>
      </div>
      {form.target_type === 'reduction_percent' && baseline && form.target_value && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          <CheckCircle2 size={14} />
          Objetivo calculado: {(Number(baseline.value) * (1 - Number.parseFloat(form.target_value) / 100)).toFixed(3)} {enpi.unit}
        </div>
      )}
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name || !form.target_value} rightIcon={<ChevronRight size={14} />}>Crear objetivo</Button>
      </div>
    </div>
  )
}

function FormulaDiagram({ numerator, denominator, unit }: { numerator?: FormulaTerm; denominator?: FormulaTerm; unit: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3">
        <FormulaBox label={numerator?.label || 'Consumo'} unit={numerator?.unit || unit.split('/')[0]} icon={<Zap size={15} />} />
        <span className="text-xl font-black text-slate-300">/</span>
        <FormulaBox label={denominator?.label || 'Producción'} unit={denominator?.unit || unit.split('/')[1]} icon={<Activity size={15} />} />
        <span className="text-xl font-black text-slate-300">=</span>
        <div className="rounded-xl bg-slate-950 px-3 py-4 text-center text-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">EnPI</p>
          <p className="mt-1 font-mono text-sm font-black">{unit}</p>
        </div>
      </div>
    </div>
  )
}

function FormulaBox({ label, unit, icon }: { label: string; unit?: string; icon: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="mb-1 flex items-center gap-2 text-slate-500">{icon}<span className="truncate text-xs font-bold">{label}</span></div>
      <p className="font-mono text-[11px] font-semibold text-slate-400">{unit || '-'}</p>
    </div>
  )
}

function SourceCard({ title, term, measurementPoints }: { title: string; term?: FormulaTerm; measurementPoints: MeasurementPoint[] }) {
  const point = term?.measurement_point_id ? measurementPoints.find((item) => item.id === term.measurement_point_id) : null
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-900">{title}</p>
        <Badge variant={term?.source_type === 'meter' ? 'info' : term?.source_type === 'calculated' ? 'brand' : 'neutral'} size="sm">
          {SOURCE_LABELS[term?.source_type || 'manual']}
        </Badge>
      </div>
      <p className="text-sm font-semibold text-slate-700">{point ? `${point.tag} · ${point.name}` : term?.expression || term?.label || 'Sin fuente definida'}</p>
      <p className="mt-1 text-[11px] text-slate-400">{AGGREGATION_LABELS[term?.aggregation || 'sum']} · {term?.unit || '-'}</p>
    </div>
  )
}

function MetricPanel({ label, value, unit, icon, tone = 'neutral' }: {
  label: string
  value: string
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
      {unit && <p className="mt-1 text-[11px] font-semibold text-slate-400">{unit}</p>}
    </div>
  )
}

function PortfolioTile({ label, value, icon, tone = 'neutral' }: { label: string; value: string | number; icon: ReactNode; tone?: 'neutral' | 'ok' | 'warn' }) {
  const color = tone === 'ok' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-slate-900'
  return (
    <Card padding="sm" className="rounded-xl border-slate-200">
      <div className="mb-1.5 flex items-center gap-1.5 text-slate-400">{icon}<p className="text-[9px] font-black uppercase tracking-widest">{label}</p></div>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </Card>
  )
}

function LabeledField({ label, required, children, className = '' }: { label: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-bold text-slate-500">{label}{required && <span className="text-rose-500"> *</span>}</span>
      {children}
    </label>
  )
}

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

function normalizeFormula(raw: unknown): EnPIFormula {
  if (!raw || typeof raw !== 'object') return {}
  const formula = raw as Record<string, unknown>

  if (formula.numerator && typeof formula.numerator === 'object') {
    return formula as EnPIFormula
  }

  return {
    numerator: {
      label: String(formula.numerator || 'Consumo energético'),
      source_type: 'manual',
      aggregation: 'sum',
    },
    denominator: {
      label: String(formula.denominator || 'Driver operacional'),
      source_type: 'manual',
      aggregation: 'sum',
    },
    variables: [],
    method: 'ratio',
  }
}

function buildFormulaFromForm(form: typeof EMPTY_ENPI): EnPIFormula {
  return {
    method: form.method,
    period_alignment: form.frequency,
    numerator: {
      label: form.numerator_label,
      source_type: form.numerator_source_type,
      measurement_point_id: form.numerator_measurement_point_id || undefined,
      unit: form.numerator_unit,
      aggregation: form.numerator_aggregation,
      expression: form.numerator_expression || undefined,
    },
    denominator: {
      label: form.denominator_label,
      source_type: form.denominator_source_type,
      measurement_point_id: form.denominator_measurement_point_id || undefined,
      unit: form.denominator_unit,
      aggregation: form.denominator_aggregation,
      expression: form.denominator_expression || undefined,
    },
    variables: form.variables.filter((variable) => variable.name.trim()),
  }
}

function buildPortfolioStats(enpis: EnPI[]) {
  const withBaseline = enpis.filter((enpi) => (enpi.baselines || []).length > 0).length
  const latestResults = enpis.map((enpi) => enpi.results?.[0]).filter(Boolean) as PerformanceResult[]
  return {
    total: enpis.length,
    baselineCoverage: enpis.length > 0 ? Math.round((withBaseline / enpis.length) * 100) : 0,
    deviated: latestResults.filter((result) => Number(result.deviation_percent || 0) > 0).length,
    improving: latestResults.filter((result) => Number(result.deviation_percent || 0) <= 0).length,
  }
}

function buildChartData(enpi: EnPI) {
  const baseline = enpi.baselines?.[0]
  const target = enpi.targets?.find((item) => item.status === 'active')

  return (enpi.results || []).slice().reverse().map((result) => ({
    period: formatPeriod(result.period_start),
    actual: Number(result.actual_value),
    baseline: Number(result.baseline_value ?? baseline?.value ?? 0),
    target: Number(result.target_value ?? target?.target_value ?? 0) || undefined,
    deviation: Number(result.deviation_percent || 0),
  }))
}

function getFormulaHealth(enpi: EnPI, measurementPoints: MeasurementPoint[]) {
  const formula = enpi.formula || {}
  const numerator = formula.numerator
  const denominator = formula.denominator
  const hasNumerator = Boolean(numerator?.label || numerator?.measurement_point_id || numerator?.expression)
  const hasDenominator = Boolean(denominator?.label || denominator?.measurement_point_id || denominator?.expression)
  const hasVariables = Boolean((formula.variables || []).length)
  const hasResult = Boolean((enpi.results || []).length)
  const numeratorMeterOk = numerator?.source_type !== 'meter' || measurementPoints.some((point) => point.id === numerator.measurement_point_id)
  const denominatorMeterOk = denominator?.source_type !== 'meter' || measurementPoints.some((point) => point.id === denominator.measurement_point_id)
  const linked = numeratorMeterOk && denominatorMeterOk

  const items = [
    { label: 'Numerador energético definido', ok: hasNumerator },
    { label: 'Denominador del mismo periodo definido', ok: hasDenominator },
    { label: 'Fuentes/medidores trazables', ok: linked },
    { label: 'Variables significativas registradas', ok: hasVariables },
    { label: 'Resultados históricos disponibles', ok: hasResult },
  ]

  return {
    score: items.filter((item) => item.ok).slice(0, 4).length,
    label: linked ? 'trazable' : 'revisar fuentes',
    items,
  }
}

function formatPeriod(value: string) {
  return new Date(value).toLocaleDateString('es', { month: 'short', year: '2-digit' })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es')
}

function translateScope(scope: string) {
  const labels: Record<string, string> = {
    site: 'Planta',
    area: 'Área',
    equipment: 'Equipo',
    process: 'Proceso',
    utility_system: 'Sistema utility',
  }
  return labels[scope] || scope
}

function translateFrequency(frequency: string) {
  const labels: Record<string, string> = {
    hourly: 'Hora',
    daily: 'Día',
    weekly: 'Semana',
    monthly: 'Mes',
  }
  return labels[frequency] || frequency
}

function translateImpact(impact: string) {
  const labels: Record<string, string> = {
    positive: 'mejora',
    negative: 'eleva consumo',
    neutral: 'contexto',
  }
  return labels[impact] || impact
}
