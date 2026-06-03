import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LogOut,
  Menu,
  LayoutDashboard,
  Gauge,
  Scale,
  Network,
  Database,
  TrendingUp,
  Zap,
  Shield,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from './AuthProvider'
import { signOut } from '@/services/auth'
import { supabase } from '@/services/supabase'
import { useUIStore } from '@/store/uiStore'
import { OnboardingWizard } from '@/shared/OnboardingWizard'
import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Navigation Menu Setup ────────────────────────────────────────────────────

const MODULES = [
  { id: 'resumen', label: 'Inicio', path: '/resumen', icon: <LayoutDashboard size={18} /> },
  { id: 'medicion', label: 'Medición', path: '/medicion', icon: <Gauge size={18} /> },
  { id: 'balances', label: 'Balances', path: '/balances', icon: <Scale size={18} /> },
  { id: 'mapa', label: 'Mapa Energy', path: '/mapa', icon: <Network size={18} /> },
  { id: 'equipos', label: 'Equipos y Activos', path: '/equipos', icon: <Database size={18} /> },
  { id: 'desempeno', label: 'Desempeño', path: '/desempeno', icon: <TrendingUp size={18} /> },
  { id: 'acciones', label: 'Acciones / Proyectos', path: '/acciones', icon: <Zap size={18} /> },
  { id: 'iso50001', label: 'SGEn', path: '/iso50001', icon: <Shield size={18} /> },
  { id: 'reportes', label: 'Reportes', path: '/reportes', icon: <FileText size={18} /> },
  { id: 'admin', label: 'Administración', path: '/admin', icon: <Settings size={18} /> },
] as const

const NAV_GROUPS = [
  { label: 'Monitoreo Diario', ids: ['resumen', 'medicion', 'balances'] },
  { label: 'Ingeniería de Planta', ids: ['mapa', 'equipos', 'desempeno'] },
  { label: 'Mejora Continua', ids: ['acciones', 'iso50001'] },
  { label: 'Control y Admin', ids: ['reportes', 'admin'] },
] as const

export function AppShell() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    sidebarOpen,
    toggleSidebar,
    availableSites,
    selectedSiteId,
    setAvailableSites,
  } = useUIStore()

  // Sidebar Layout States
  const [isHovered, setIsHovered] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768)

  const [showOnboarding, setShowOnboarding] = useState(false)
  const onboardingChecked = useRef<string | null>(null)

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const isExpanded = sidebarOpen || (isHovered && isDesktop)

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  useEffect(() => {
    async function loadSites() {
      const { data } = await supabase.from('sites').select('id, name').order('name')
      setAvailableSites(data || [])
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



  const visibleModuleGroups = useMemo(() => {
    return NAV_GROUPS.map((group) => ({
      ...group,
      modules: group.ids
        .map((id) => MODULES.find((m) => m.id === id))
        .filter(Boolean) as typeof MODULES[number][],
    })).filter((group) => group.modules.length > 0)
  }, [])

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
    <div className="flex h-[100dvh] bg-surface-muted overflow-hidden font-sans">
      {/* ── MOBILE BACKDROP ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── 1. LEFT SIDEBAR (NAVIGATION MODULES) ── */}
      <motion.aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{ width: isExpanded ? 240 : 72 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 shadow-xl md:shadow-none overflow-hidden transition-transform duration-300 md:static md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`h-14 flex items-center shrink-0 border-b border-slate-100 ${
            isExpanded ? 'px-5 gap-3.5' : 'justify-center px-0'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-brand-blue flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md shadow-brand-blue/20">
            VE
          </div>
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-bold text-slate-900 text-sm tracking-tight"
            >
              Versa<span className="text-brand-blue">Energy</span>
            </motion.span>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 scrollbar-none space-y-4">
          {visibleModuleGroups.map((group, groupIndex) => (
            <div key={group.label} className={groupIndex > 0 ? 'pt-3 border-t border-slate-50' : ''}>
              {isExpanded ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] px-3 mb-2"
                >
                  {group.label}
                </motion.p>
              ) : groupIndex > 0 ? (
                <div className="mx-auto mb-2 h-px w-6 bg-slate-100" />
              ) : null}

              <div className="space-y-0.5">
                {group.modules.map((mod) => {
                  const isActive =
                    location.pathname.startsWith(mod.path) ||
                    (mod.id === 'resumen' && location.pathname === '/')

                  return (
                    <button
                      key={mod.id}
                      onClick={() => {
                        navigate(mod.path)
                        setIsMobileMenuOpen(false)
                      }}
                      title={!isExpanded ? mod.label : undefined}
                      aria-label={mod.label}
                      className={`w-full flex items-center rounded-xl transition-all duration-200 relative group ${
                        isExpanded ? 'px-3.5 py-2.5 gap-3.5' : 'justify-center h-10 w-10 mx-auto'
                      } ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active-indicator"
                          className="absolute left-0 w-1 h-5 bg-brand-blue rounded-r-full"
                        />
                      )}
                      <span
                        className={`shrink-0 transition-transform duration-200 ${
                          isActive ? 'scale-110' : 'group-hover:scale-110'
                        }`}
                      >
                        {mod.icon}
                      </span>
                      {isExpanded && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-[12px] font-bold tracking-normal flex-1 text-left"
                        >
                          {mod.label}
                        </motion.span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Collapse Toggle & User Profile */}
        <div className="p-3 border-t border-slate-100 space-y-3">
          {/* Collapse Button (Desktop Only) */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex w-full items-center justify-center h-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
            title={sidebarOpen ? 'Colapsar menú' : 'Expandir menú'}
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>

          {/* User Profile */}
          {isExpanded ? (
            <div className="w-full flex items-center gap-2 p-1.5 rounded-xl border border-slate-100 bg-slate-50/60">
              <div className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                {profile?.full_name?.charAt(0)?.toUpperCase() ||
                  user?.email?.charAt(0)?.toUpperCase() ||
                  '?'}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[11px] font-bold text-slate-900 truncate leading-tight">
                  {profile?.full_name || user?.email?.split('@')[0]}
                </p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="shrink-0 size-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <div className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {profile?.full_name?.charAt(0)?.toUpperCase() ||
                  user?.email?.charAt(0)?.toUpperCase() ||
                  '?'}
              </div>
              <button
                onClick={handleLogout}
                className="size-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* ── MAIN CONTENT WORKSPACE (HEADER + OPTIONAL TREE + OUTLET) ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Topbar / Header */}
        <header className="h-14 flex items-center justify-between gap-3 px-4 border-b border-slate-200 bg-white/80 backdrop-blur-md shrink-0 z-40 relative shadow-sm">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Mobile Menu Button for Navigation Sidebar */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer border border-slate-100"
            >
              <Menu size={18} />
            </button>

            {/* Desktop Navigation Sidebar Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer border border-slate-100"
              title="Toggle Menú"
            >
              <Menu size={18} />
            </button>

            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:block">
              {MODULES.find((m) =>
                location.pathname.startsWith(m.path) || (m.id === 'resumen' && location.pathname === '/')
              )?.label || 'VersaEnergy'}
            </span>

          </div>

          {/* Right Topbar Profile Avatar */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {profile?.full_name?.charAt(0)?.toUpperCase() ||
                user?.email?.charAt(0)?.toUpperCase() ||
                '?'}
            </div>
          </div>
        </header>

        {/* Lower Workspace (main outlet) */}
        <div className="flex flex-1 min-h-0">
          {/* Actual Feature Content Router Outlet */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-hidden relative">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Onboarding wizard ─ triggered for sites with no areas */}
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
