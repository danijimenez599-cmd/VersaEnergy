import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthProvider'
import { AppShell } from './AppShell'
import { AuthPage } from './pages/AuthPage'

const InicioPage = lazy(() => import('@/modules/inicio'))
const MapaPage = lazy(() => import('@/modules/mapa'))
const ModeloPage = lazy(() => import('@/modules/modelo'))
const MedicionPage = lazy(() => import('@/modules/medicion'))
const BalancesPage = lazy(() => import('@/modules/balances'))
const DesempenoPage = lazy(() => import('@/modules/desempeno'))
const AccionesPage = lazy(() => import('@/modules/acciones'))
const Iso50001Page = lazy(() => import('@/modules/iso50001'))
const ReportesPage = lazy(() => import('@/modules/reportes'))
const AdminPage = lazy(() => import('@/modules/admin'))
const AssetDetail = lazy(() => import('@/shared/AssetLenses/AssetDetail').then((m) => ({ default: m.AssetDetail })))
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
          <Route
            path="/login"
            element={
              <PublicRoute>
                <AuthPage mode="login" />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <AuthPage mode="register" />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route
              element={
                <Suspense fallback={<PageLoader />}>
                  <AssetDetail />
                </Suspense>
              }
            >
              <Route index element={<Navigate to="resumen" replace />} />
              <Route path="resumen" element={<InicioPage />} />
              <Route path="mapa" element={<MapaPage />} />
              <Route path="equipos" element={<ModeloPage />} />
              <Route path="modelo" element={<Navigate to="/equipos" replace />} />
              <Route path="mantenimiento" element={<AssetMaintenance />} />
              <Route path="medicion" element={<MedicionPage />} />
              <Route path="balances" element={<BalancesPage />} />
              <Route path="desempeno" element={<DesempenoPage />} />
              <Route path="acciones" element={<AccionesPage />} />
              <Route path="docs" element={<div className="p-8 text-center text-gray-500">Módulo Documentos en construcción</div>} />
            </Route>

            {/* Transversal Flows */}
            <Route
              path="operacion"
              element={
                <div className="p-8 text-center text-gray-500">Espacio de Operación Transversal</div>
              }
            />
            <Route
              path="iso50001"
              element={
                <Suspense fallback={<PageLoader />}>
                  <Iso50001Page />
                </Suspense>
              }
            />
            <Route
              path="reportes"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ReportesPage />
                </Suspense>
              }
            />
            <Route
              path="admin"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminPage />
                </Suspense>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
