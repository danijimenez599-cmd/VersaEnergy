import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Building2, CheckCircle2, Flame, Map,
  Snowflake, Wind, Zap, Droplets, Sun,
} from 'lucide-react'
import { Button } from './Button'
import { supabase } from '@/services/supabase'

interface OnboardingWizardProps {
  siteId: string
  siteName: string
  onComplete: () => void
}

type WizardStep = 1 | 2 | 3 | 4

interface WizardState {
  areaName: string
  areaCode: string
  utility: string
  createDiagram: boolean
}

const UTILITY_OPTIONS = [
  { value: 'electricity',    label: 'Electricidad',     icon: Zap,      color: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' },
  { value: 'natural_gas',   label: 'Gas natural',      icon: Flame,    color: 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100' },
  { value: 'steam',         label: 'Vapor',            icon: Droplets, color: 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100' },
  { value: 'compressed_air',label: 'Aire comprimido',  icon: Wind,     color: 'border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100' },
  { value: 'chilled_water', label: 'Agua helada',      icon: Snowflake,color: 'border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100' },
  { value: 'solar_generation',label: 'Solar',          icon: Sun,      color: 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100' },
]

const STEP_LABELS = [
  'Tu primera área',
  'Utility principal',
  'Primer diagrama',
  '¡Listo!',
]

export function OnboardingWizard({ siteId, siteName, onComplete }: OnboardingWizardProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState<WizardStep>(1)
  const [state, setState] = useState<WizardState>({
    areaName: '', areaCode: '', utility: 'electricity', createDiagram: true,
  })
  const [loading, setLoading] = useState(false)

  function set(partial: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...partial }))
  }

  async function handleFinish() {
    setLoading(true)
    try {
      // Create area
      const { data: area, error: areaErr } = await supabase
        .from('energy_areas')
        .insert({
          site_id: siteId,
          name: state.areaName || 'Mi primera área',
          code: state.areaCode || 'AREA-01',
          description: 'Área creada durante la configuración inicial',
        })
        .select('id')
        .single()

      if (areaErr) throw areaErr

      // Create utility system
      await supabase.from('utility_systems').insert({
        site_id: siteId,
        code: `${state.utility.toUpperCase().slice(0, 4)}-MAIN`,
        name: `Sistema de ${UTILITY_OPTIONS.find((u) => u.value === state.utility)?.label ?? state.utility}`,
        utility_type: state.utility,
        area_id: area?.id ?? null,
      })

      // Create diagram if requested
      if (state.createDiagram) {
        await supabase.from('energy_diagrams').insert({
          site_id: siteId,
          name: `Red de ${UTILITY_OPTIONS.find((u) => u.value === state.utility)?.label ?? state.utility}`,
          utility_type: state.utility,
          status: 'draft',
          canvas_state: {},
        })
      }

      setStep(4)
    } catch (err) {
      console.error('Onboarding error', err)
    } finally {
      setLoading(false)
    }
  }

  const canAdvanceStep1 = state.areaName.trim().length > 0

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gradient-to-br from-brand/20 to-brand-dark/30 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-lg bg-white rounded-[--radius-2xl] shadow-modal overflow-hidden animate-slide-up">
        {/* Top gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-brand to-brand-dark" />

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 pt-5 pb-0">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = (idx + 1) as WizardStep
            const done = step > stepNum
            const active = step === stepNum
            return (
              <div key={label} className="flex items-center gap-2 flex-1 min-w-0">
                <div className={[
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-all',
                  done ? 'bg-brand text-white' : active ? 'bg-brand/15 text-brand border-2 border-brand' : 'bg-gray-100 text-gray-400',
                ].join(' ')}>
                  {done ? <CheckCircle2 size={12} /> : stepNum}
                </div>
                <span className={`text-[10px] font-semibold truncate ${active ? 'text-brand' : done ? 'text-gray-500' : 'text-gray-300'}`}>
                  {label}
                </span>
                {idx < STEP_LABELS.length - 1 && (
                  <div className={`flex-1 h-px ${done ? 'bg-brand' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        <div className="px-6 py-5">
          {/* Step 1 — First area */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center mb-3">
                  <Building2 size={22} className="text-brand" />
                </div>
                <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
                  Bienvenido a {siteName}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Vamos a configurar tu árbol de activos en 4 pasos. Primero, nombra tu primera área de la planta.
                </p>
              </div>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-700">Nombre del área <span className="text-danger">*</span></span>
                  <input
                    autoFocus
                    value={state.areaName}
                    onChange={(e) => set({ areaName: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && canAdvanceStep1 && setStep(2)}
                    placeholder="Ej. Sala eléctrica, Producción, Servicios..."
                    className="mt-1 w-full rounded-[--radius-md] border border-[--color-border-strong] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/25"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-700">Código / TAG</span>
                  <input
                    value={state.areaCode}
                    onChange={(e) => set({ areaCode: e.target.value.toUpperCase() })}
                    placeholder="Ej. SALA-ELEC"
                    className="mt-1 w-full rounded-[--radius-md] border border-[--color-border-strong] bg-white px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/25"
                  />
                </label>
              </div>
              <div className="flex justify-end">
                <Button disabled={!canAdvanceStep1} rightIcon={<ArrowRight size={15} />} onClick={() => setStep(2)}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 — Primary utility */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
                  ¿Qué utility gestionas primero?
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Puedes agregar más utilities después. Empieza por el más importante.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {UTILITY_OPTIONS.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    onClick={() => set({ utility: value })}
                    className={[
                      'flex items-center gap-2.5 px-3 py-3 rounded-[--radius-lg] border-2 text-sm font-semibold transition-all cursor-pointer',
                      state.utility === value ? color.replace('hover:', '') : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                      state.utility === value ? 'ring-2 ring-offset-1 ring-current/20' : '',
                    ].join(' ')}
                  >
                    <Icon size={16} className="shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>Atrás</Button>
                <Button rightIcon={<ArrowRight size={15} />} onClick={() => setStep(3)}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Create diagram? */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center mb-3">
                  <Map size={22} className="text-brand" />
                </div>
                <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
                  ¿Crear tu primer diagrama?
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Se creará un diagrama en borrador para la red de{' '}
                  <strong>{UTILITY_OPTIONS.find((u) => u.value === state.utility)?.label ?? state.utility}</strong>.
                  Podrás dibujarlo cuando quieras.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => set({ createDiagram: true })}
                  className={[
                    'flex flex-col items-center gap-2 p-4 rounded-[--radius-lg] border-2 text-sm font-semibold transition-all cursor-pointer',
                    state.createDiagram ? 'border-brand bg-brand/5 text-brand' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <Map size={22} />
                  Sí, crear diagrama
                </button>
                <button
                  onClick={() => set({ createDiagram: false })}
                  className={[
                    'flex flex-col items-center gap-2 p-4 rounded-[--radius-lg] border-2 text-sm font-semibold transition-all cursor-pointer',
                    !state.createDiagram ? 'border-brand bg-brand/5 text-brand' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <ArrowRight size={22} />
                  Después
                </button>
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>Atrás</Button>
                <Button
                  loading={loading}
                  rightIcon={<CheckCircle2 size={15} />}
                  onClick={handleFinish}
                >
                  Crear y continuar
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 — Done */}
          {step === 4 && (
            <div className="space-y-5 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-[--color-ok-bg] flex items-center justify-center">
                  <CheckCircle2 size={30} className="text-[--color-ok]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
                    ¡{siteName} está lista!
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Tu área y sistema están configurados. Puedes empezar a dibujar tu red energética o agregar más activos.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="rounded-[--radius-lg] border border-[--color-border-strong] bg-gray-50 p-3">
                  <p className="text-xs font-bold text-gray-700">Siguiente paso sugerido</p>
                  <p className="text-xs text-gray-500 mt-0.5">Dibuja tu red en el Mapa Energy & Utilities</p>
                </div>
                <div className="rounded-[--radius-lg] border border-[--color-border-strong] bg-gray-50 p-3">
                  <p className="text-xs font-bold text-gray-700">O agrega equipos</p>
                  <p className="text-xs text-gray-500 mt-0.5">Ve a Equipos y construye el árbol de activos</p>
                </div>
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="secondary"
                  onClick={() => { onComplete(); navigate('/equipos') }}
                >
                  Ir a Equipos
                </Button>
                <Button
                  rightIcon={<Map size={15} />}
                  onClick={() => { onComplete(); navigate('/mapa') }}
                >
                  Ir al Mapa
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
