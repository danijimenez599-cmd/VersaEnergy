import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Factory,
  Gauge,
  LayoutDashboard,
  LineChart,
  Network,
  ShieldAlert,
  TrendingUp,
  Zap,
} from 'lucide-react'
import {
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/shared/PageHeader'
import { EmptyState } from '@/shared/EmptyState'
import { Card } from '@/shared/Card'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import {
  OperationalContextBanner,
  OperationalContextSummary,
  getUtilityLabel,
} from '@/shared/OperationalContext'
import { useUIStore } from '@/store/uiStore'
import { loadCockpitData, type CockpitData, type CockpitAlert } from '@/services/cockpit'

const tabs = [
  { id: 'ahora', label: 'Ahora', icon: LayoutDashboard },
  { id: 'utilities', label: 'Utilities', icon: Zap },
  { id: 'riesgo', label: 'Riesgo', icon: ShieldAlert },
  { id: 'acciones', label: 'Acciones', icon: ClipboardList },
  { id: 'tendencias', label: 'Tendencias', icon: LineChart },
] as const

type TabId = (typeof tabs)[number]['id']

const alertStyles: Record<CockpitAlert['severity'], { color: 'red' | 'orange' | 'blue'; label: string }> = {
  critical: { color: 'red', label: 'Critico' },
  warning: { color: 'orange', label: 'Atencion' },
  info: { color: 'blue', label: 'Info' },
}

export default function InicioPage() {
  const navigate = useNavigate()
  const { selectedSiteId, selectedUtilityType, selectedPeriod } = useUIStore()
  const [activeTab, setActiveTab] = useState<TabId>('ahora')
  const [data, setData] = useState<CockpitData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      if (!selectedSiteId) {
        setData(null)
        return
      }

      setLoading(true)
      const cockpit = await loadCockpitData({
        siteId: selectedSiteId,
        utilityType: selectedUtilityType,
        period: selectedPeriod,
      })
      setData(cockpit)
      setLoading(false)
    }

    load()
  }, [selectedPeriod, selectedSiteId, selectedUtilityType])

  return (
    <div>
      <PageHeader
        title="Cockpit Energy & Utilities"
        description="Salud energetica, datos vivos, alertas y acciones del sitio"
      />

      <OperationalContextSummary />
      <OperationalContextBanner />

      {!selectedSiteId && (
        <EmptyState
          icon={<Factory size={48} strokeWidth={1.5} />}
          title="Selecciona o crea un sitio"
          description="El cockpit necesita un sitio global para leer modelo, medicion, balances, EnPI y acciones."
        />
      )}

      {selectedSiteId && loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['Salud', 'Cobertura', 'No explicado', 'Acciones'].map((item) => (
            <div key={item} className="h-28 rounded-(--radius-card) border border-border bg-surface p-5 shadow-card animate-pulse">
              <div className="h-3 w-24 rounded bg-gray-200" />
              <div className="mt-4 h-7 w-20 rounded bg-gray-200" />
              <div className="mt-3 h-3 w-32 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {selectedSiteId && data && !loading && (
        <div className="space-y-5">
          <KpiGrid data={data} />

          <div className="border-b border-border">
            <nav className="flex gap-1 -mb-px overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-brand-blue text-brand-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === 'ahora' && <NowTab data={data} onNavigate={navigate} />}
          {activeTab === 'utilities' && <UtilitiesTab data={data} />}
          {activeTab === 'riesgo' && <RiskTab data={data} onNavigate={navigate} />}
          {activeTab === 'acciones' && <ActionsTab data={data} onNavigate={navigate} />}
          {activeTab === 'tendencias' && <TrendsTab data={data} />}
        </div>
      )}
    </div>
  )
}

function KpiGrid({ data }: { data: CockpitData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard
        label="Salud del sitio"
        value={data.siteHealthScore}
        unit="/100"
        icon={<Activity size={18} />}
        color={data.siteHealthScore >= 80 ? 'green' : data.siteHealthScore >= 60 ? 'orange' : 'red'}
        detail="Combina cobertura, balances, EnPI y alertas"
      />
      <KpiCard
        label="Cobertura medicion"
        value={data.kpis.measurementCoverage}
        unit="%"
        icon={<Gauge size={18} />}
        color={data.kpis.measurementCoverage >= 80 ? 'green' : 'orange'}
        detail={`${data.kpis.readingCount} lecturas en el periodo`}
      />
      <KpiCard
        label="No explicado"
        value={data.kpis.worstUnaccountedPercent === null ? 'N/D' : data.kpis.worstUnaccountedPercent.toFixed(1)}
        unit={data.kpis.worstUnaccountedPercent === null ? undefined : '%'}
        icon={<AlertTriangle size={18} />}
        color={(data.kpis.worstUnaccountedPercent || 0) > 10 ? 'red' : 'blue'}
        detail="Peor balance del periodo"
      />
      <KpiCard
        label="Ahorro potencial"
        value={formatCurrency(data.kpis.potentialCostSavings)}
        icon={<CircleDollarSign size={18} />}
        color="teal"
        detail={`${data.kpis.openActionCount} acciones abiertas, ${data.kpis.projectCount} proyecto(s)`}
      />
    </div>
  )
}

function KpiCard({
  label,
  value,
  unit,
  icon,
  color,
  detail,
}: {
  label: string
  value: string | number
  unit?: string
  icon: React.ReactNode
  color: 'blue' | 'teal' | 'orange' | 'red' | 'green'
  detail: string
}) {
  const colorStyles = {
    blue: 'bg-brand-blue',
    teal: 'bg-brand-teal',
    orange: 'bg-brand-orange',
    red: 'bg-brand-red',
    green: 'bg-emerald-600',
  }

  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-gray-900">{value}</span>
            {unit && <span className="text-sm text-gray-400">{unit}</span>}
          </div>
          <p className="mt-1 text-xs text-gray-500">{detail}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${colorStyles[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

function NowTab({ data, onNavigate }: { data: CockpitData; onNavigate: (path: string) => void }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
      <div className="space-y-4">
        <SectionHeader title="Prioridad operacional" />
        {data.alerts.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={44} strokeWidth={1.5} />}
            title="Sin alertas abiertas"
            description="El sitio no tiene alertas relevantes para el contexto seleccionado."
          />
        ) : (
          <div className="space-y-2">
            {data.alerts.slice(0, 5).map((alert) => (
              <button
                key={alert.id}
                onClick={() => onNavigate(alert.path)}
                className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-left shadow-card transition-shadow hover:shadow-md cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge color={alertStyles[alert.severity].color} size="sm">
                        {alertStyles[alert.severity].label}
                      </Badge>
                      <span className="text-xs text-gray-400">{alert.module}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-gray-800">{alert.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{alert.detail}</p>
                  </div>
                  <span className="text-xs font-medium text-brand-blue">Abrir</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <SectionHeader title="Estado del flujo" />
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Areas', value: data.moduleStatus.areas, icon: Factory },
            { label: 'Equipos', value: data.moduleStatus.equipment, icon: Activity },
            { label: 'Puntos', value: data.moduleStatus.measurementPoints, icon: Gauge },
            { label: 'Diagramas', value: data.moduleStatus.diagrams, icon: Network },
            { label: 'Balances', value: data.moduleStatus.balances, icon: BarChart3 },
            { label: 'EnPI', value: data.moduleStatus.enpis, icon: TrendingUp },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center gap-2">
                <item.icon size={14} className="text-brand-blue" />
                <span className="text-xs text-gray-500">{item.label}</span>
              </div>
              <p className="mt-1 text-xl font-semibold text-gray-800">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function UtilitiesTab({ data }: { data: CockpitData }) {
  if (data.utilityRows.length === 0) {
    return (
      <EmptyState
        icon={<Zap size={44} strokeWidth={1.5} />}
        title="Sin utilities con medicion"
        description="Crea puntos de medicion para ver cobertura y consumo por utility."
      />
    )
  }

  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50/70">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Utility</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Consumo medido</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Cobertura</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Puntos</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Lecturas</th>
            </tr>
          </thead>
          <tbody>
            {data.utilityRows.map((row) => (
              <tr key={row.utility} className="border-b border-border/60 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge color="teal" size="sm">{getUtilityLabel(row.utility)}</Badge>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-800">
                  {formatNumber(row.measuredDelta)} <span className="text-xs text-gray-400">{row.unit}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Badge color={row.coveragePercent >= 80 ? 'green' : 'orange'} size="sm">
                    {row.coveragePercent}%
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{row.pointsWithReadings}/{row.pointCount}</td>
                <td className="px-4 py-3 text-right text-gray-600">{row.readingCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function RiskTab({ data, onNavigate }: { data: CockpitData; onNavigate: (path: string) => void }) {
  return (
    <div className="space-y-3">
      {data.alerts.length === 0 ? (
        <EmptyState title="Sin riesgos visibles" description="No hay riesgos calculados para el contexto actual." />
      ) : (
        data.alerts.map((alert) => (
          <Card key={alert.id} padding="md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge color={alertStyles[alert.severity].color} size="sm">{alertStyles[alert.severity].label}</Badge>
                <h3 className="mt-2 text-sm font-semibold text-gray-800">{alert.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{alert.detail}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => onNavigate(alert.path)}>
                Revisar
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}

function ActionsTab({ data, onNavigate }: { data: CockpitData; onNavigate: (path: string) => void }) {
  if (data.actions.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList size={44} strokeWidth={1.5} />}
        title="Sin acciones abiertas"
        description="Las desviaciones relevantes deben convertirse en oportunidades, acciones o proyectos."
        action={<Button size="sm" onClick={() => onNavigate('/acciones')}>Abrir acciones</Button>}
      />
    )
  }

  return (
    <div className="space-y-3">
      {data.actions.map((action) => (
        <Card key={action.id} padding="md" onClick={() => onNavigate('/acciones')}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge color={action.workType === 'project' ? 'purple' : 'blue'} size="sm">
                  {action.workType === 'project' ? 'Proyecto' : 'Accion rapida'}
                </Badge>
                <Badge color={action.priority === 'high' || action.priority === 'critical' ? 'red' : 'gray'} size="sm">
                  {action.priority}
                </Badge>
                {action.utility && <Badge color="teal" size="sm">{getUtilityLabel(action.utility)}</Badge>}
              </div>
              <h3 className="mt-2 text-sm font-semibold text-gray-800">{action.title}</h3>
              <p className="mt-1 text-xs text-gray-500">
                {formatNumber(action.estimatedEnergySavings)} {action.savingsUnit || ''} estimados · {formatCurrency(action.estimatedCostSavings)}
              </p>
            </div>
            <span className="text-xs text-gray-400">{action.status}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}

function TrendsTab({ data }: { data: CockpitData }) {
  if (data.trends.length === 0) {
    return (
      <EmptyState
        icon={<LineChart size={44} strokeWidth={1.5} />}
        title="Sin tendencia calculable"
        description="Se necesitan lecturas acumuladas consecutivas para estimar tendencia de consumo."
      />
    )
  }

  return (
    <Card padding="md">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-800">Tendencia medida</h2>
        <p className="text-xs text-gray-500">Suma de deltas de medidores acumulados en los ultimos periodos con datos.</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data.trends}>
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => compactNumber(Number(value))} />
            <Tooltip formatter={(value) => formatNumber(Number(value))} />
            <Line type="monotone" dataKey="value" stroke="#1e40af" strokeWidth={2} dot={{ r: 3 }} />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es', { maximumFractionDigits: 0 }).format(value)
}

function compactNumber(value: number) {
  return new Intl.NumberFormat('es', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
