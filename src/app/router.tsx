import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthProvider'
import { AppShell } from './AppShell'
import { AuthPage } from './pages/AuthPage'

const InicioPage     = lazy(() => import('@/modules/inicio'))
const MapaPage       = lazy(() => import('@/modules/mapa'))
const ModeloPage     = lazy(() => import('@/modules/modelo'))
const MedicionPage   = lazy(() => import('@/modules/medicion'))
const BalancesPage   = lazy(() => import('@/modules/balances'))
const DesempenoPage  = lazy(() => import('@/modules/desempeno'))
const EstudiosPage   = lazy(() => import('@/modules/estudios'))
const AccionesPage   = lazy(() => import('@/modules/acciones'))
const SgenPage       = lazy(() => import('@/modules/sgen'))
const ReportesPage   = lazy(() => import('@/modules/reportes'))
const AdminPage      = lazy(() => import('@/modules/admin'))
const AssetDetail    = lazy(() => import('@/shared/AssetLenses/AssetDetail').then((m) => ({ default: m.AssetDetail })))
const AssetMaintenance = lazy(() => import('@/shared/AssetLenses/AssetMaintenance').then((m) => ({ default: m.AssetMaintenance })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <PageLoader />
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

export function Router() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login"    element={<PublicRoute><AuthPage mode="login" /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><AuthPage mode="register" /></PublicRoute>} />

          <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>

            {/* ── Top-level standalone routes ── */}
            <Route path="mapa"     element={<Suspense fallback={<PageLoader />}><MapaPage /></Suspense>} />
            <Route path="equipos"  element={<Suspense fallback={<PageLoader />}><ModeloPage /></Suspense>} />
            <Route path="modelo"   element={<Navigate to="/equipos" replace />} />
            <Route index element={<Navigate to="/resumen" replace />} />
            <Route path="resumen"   element={<Suspense fallback={<PageLoader />}><InicioPage /></Suspense>} />
            <Route path="medicion"  element={<Suspense fallback={<PageLoader />}><MedicionPage /></Suspense>} />
            <Route path="balances"  element={<Suspense fallback={<PageLoader />}><BalancesPage /></Suspense>} />
            <Route path="desempeno" element={<Suspense fallback={<PageLoader />}><DesempenoPage /></Suspense>} />
            <Route path="estudios" element={<Suspense fallback={<PageLoader />}><EstudiosPage /></Suspense>} />
            <Route path="acciones"  element={<Suspense fallback={<PageLoader />}><AccionesPage /></Suspense>} />
            <Route path="sgen" element={<Suspense fallback={<PageLoader />}><SgenPage /></Suspense>} />
            <Route path="reportes"  element={<Suspense fallback={<PageLoader />}><ReportesPage /></Suspense>} />
            <Route path="admin"     element={<Suspense fallback={<PageLoader />}><AdminPage /></Suspense>} />

            {/* ── Asset-scoped lenses (wrapped in AssetDetail header) ── */}
            <Route path="activo" element={<Suspense fallback={<PageLoader />}><AssetDetail /></Suspense>}>
              <Route path="mantenimiento" element={<AssetMaintenance />} />
              <Route path="medicion"     element={<MedicionPage />} />
              <Route path="balances"     element={<BalancesPage />} />
              <Route path="docs"         element={<div className="p-8 text-center text-gray-500">Módulo Documentos en construcción</div>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
