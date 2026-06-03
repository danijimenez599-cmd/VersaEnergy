import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LogOut,
  Menu,
} from 'lucide-react'
import { useAuth } from './AuthProvider'
import { signOut } from '@/services/auth'
import { supabase } from '@/services/supabase'
import { useUIStore } from '@/store/uiStore'
import {
  OperationalStatusBadge,
  formatEnergyPeriod,
  utilityOptions,
} from '@/shared/OperationalContext'
import { OnboardingWizard } from '@/shared/OnboardingWizard'
import { AssetTree } from '@/shared/AssetTree'
import { loadEnergyAssetTree, type EnergyAssetTreeResult } from '@/services/asset-tree'
import { useEffect, useRef, useState } from 'react'

export function AppShell() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    sidebarOpen,
    toggleSidebar,
    availableSites,
    selectedSiteId,
    selectedUtilityType,
    selectedPeriod,
    selectedAssetId,
    setAvailableSites,
    setSelectedSiteId,
    setSelectedUtilityType,
    setSelectedPeriod,
    setSelectedAsset,
  } = useUIStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [sitesLoading, setSitesLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [treeResult, setTreeResult] = useState<EnergyAssetTreeResult | null>(null)
  const [treeLoading, setTreeLoading] = useState(false)
  const onboardingChecked = useRef<string | null>(null)

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  useEffect(() => {
    async function loadSites() {
      setSitesLoading(true)
      const { data } = await supabase.from('sites').select('id, name').order('name')
      setAvailableSites(data || [])
      setSitesLoading(false)
    }
    loadSites()
  }, [setAvailableSites])

  // Onboarding trigger: muestra wizard si el sitio seleccionado no tiene áreas
  useEffect(() => {
    if (!selectedSiteId || onboardingChecked.current === selectedSiteId) return
    onboardingChecked.current = selectedSiteId
    supabase
      .from('energy_areas')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', selectedSiteId)
      .then(({ count }) => {
        if ((count ?? 0) === 0) setShowOnboarding(true)
      })
  }, [selectedSiteId])

  useEffect(() => {
    async function loadTree() {
      if (!selectedSiteId) {
        setTreeResult(null)
        return
      }
      setTreeLoading(true)
      const result = await loadEnergyAssetTree(selectedSiteId, selectedUtilityType)
      setTreeResult(result)
      setTreeLoading(false)
    }
    loadTree()
  }, [selectedSiteId, selectedUtilityType])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-surface-muted overflow-hidden">
      {/* Topbar */}
      <header className="min-h-14 flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-surface shrink-0 z-10 relative shadow-sm">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2.5 h-full px-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center text-white text-sm font-bold shrink-0">
              VE
            </div>
            <span className="text-sm font-semibold text-gray-900 hidden sm:block">
              VersaEnergy
            </span>
          </div>

          <div className="w-px h-6 bg-border mx-2 hidden sm:block" />

          <select
            value={selectedSiteId || ''}
            onChange={(e) => setSelectedSiteId(e.target.value || null)}
            className="max-w-[180px] px-3 py-1.5 text-xs font-semibold border border-transparent hover:border-border rounded-lg bg-transparent hover:bg-surface
                       text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 cursor-pointer transition-colors"
            disabled={sitesLoading}
          >
            {availableSites.length === 0 && (
              <option value="">Sin sitios</option>
            )}
            {availableSites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>

          {/* Utility filter */}
          <select
            value={selectedUtilityType || ''}
            onChange={(e) =>
              setSelectedUtilityType(
                e.target.value ? e.target.value : null,
              )
            }
            className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-surface
                       text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 cursor-pointer"
          >
            {utilityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="hidden items-center gap-2 md:flex">
            <input
              type="month"
              value={selectedPeriod}
              onChange={(event) => setSelectedPeriod(event.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-surface
                         text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 cursor-pointer"
            />
            <span className="max-w-[160px] truncate text-xs text-gray-400">
              {formatEnergyPeriod(selectedPeriod)}
            </span>
          </div>

          <div className="hidden lg:block ml-4">
            <OperationalStatusBadge />
          </div>
        </div>

        {/* Right Topbar items */}
        <div className="flex items-center gap-4">
          <button
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-border rounded-lg bg-surface hover:bg-gray-50 cursor-pointer"
            onClick={() => navigate('/operacion')}
          >
            Operación ▾
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-medium">
                {profile?.full_name?.charAt(0)?.toUpperCase() ||
                  user?.email?.charAt(0)?.toUpperCase() ||
                  '?'}
              </div>
              <span className="text-sm text-gray-700 hidden sm:inline max-w-[140px] truncate">
                {profile?.full_name || user?.email || 'Usuario'}
              </span>
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-56 bg-surface border border-border rounded-xl shadow-modal z-20 py-1">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {profile?.full_name || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <LogOut size={16} />
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar (AssetTree) */}
        <aside
          className={`flex flex-col bg-surface border-r border-border transition-all duration-200 shrink-0 overflow-hidden ${sidebarOpen ? 'w-80' : 'w-0 hidden lg:flex lg:w-0'}`}
        >
          {treeResult?.root ? (
            <AssetTree
              root={treeResult.root}
              loading={treeLoading}
              selectedId={selectedAssetId}
              onSelect={(id, node) => {
                setSelectedAsset(id, node.sourceId, node.type)
                if (location.pathname === '/operacion' || location.pathname.startsWith('/admin')) {
                  navigate('/')
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full p-4 text-center">
              {treeLoading ? (
                <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
              ) : (
                <p className="text-sm text-gray-500">Selecciona o crea un sitio para ver sus activos</p>
              )}
            </div>
          )}
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-surface-muted overflow-hidden relative">
          <Outlet />
        </main>
      </div>

      {/* Onboarding wizard — triggered for sites with no areas */}
      {showOnboarding && selectedSiteId && (
        <OnboardingWizard
          siteId={selectedSiteId}
          siteName={availableSites.find((s) => s.id === selectedSiteId)?.name ?? 'tu planta'}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </div>
  )
}
