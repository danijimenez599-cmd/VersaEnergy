import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Network,
  Database,
  Gauge,
  Scale,
  TrendingUp,
  Zap,
  Shield,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
} from 'lucide-react'
import { useAuth } from './AuthProvider'
import { signOut } from '@/services/auth'
import { useUIStore } from '@/store/uiStore'
import { MODULES } from '@/modules'

const iconMap: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard,
  Network,
  Database,
  Gauge,
  Scale,
  TrendingUp,
  Zap,
  Shield,
  FileText,
  Settings,
}

export function AppShell() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const { sidebarOpen, toggleSidebar, selectedUtilityType, setSelectedUtilityType } =
    useUIStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

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

  const utilityOptions = [
    { value: '', label: 'Todos los utilities' },
    { value: 'electricity', label: 'Electricidad' },
    { value: 'natural_gas', label: 'Gas natural' },
    { value: 'steam', label: 'Vapor' },
    { value: 'compressed_air', label: 'Aire comprimido' },
    { value: 'chilled_water', label: 'Agua helada' },
    { value: 'hot_water', label: 'Agua caliente' },
    { value: 'industrial_water', label: 'Agua industrial' },
    { value: 'diesel', label: 'Diésel' },
    { value: 'lpg', label: 'GLP' },
  ]

  return (
    <div className="flex h-screen bg-surface-muted overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-surface border-r border-border transition-all duration-200 ${sidebarOpen ? 'w-60' : 'w-[68px]'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 h-14 px-4 border-b border-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center text-white text-sm font-bold shrink-0">
            VE
          </div>
          {sidebarOpen && (
            <span className="text-sm font-semibold text-gray-900 truncate">
              VersaEnergy
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {MODULES.map((mod) => {
            const Icon = iconMap[mod.icon]
            return (
              <NavLink
                key={mod.id}
                to={mod.path}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-brand-blue/8 text-brand-blue' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`
                }
              >
                {Icon && <Icon size={18} strokeWidth={1.75} />}
                {sidebarOpen && <span className="truncate">{mod.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center h-10 border-t border-border text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
        >
          {sidebarOpen ? (
            <ChevronLeft size={18} />
          ) : (
            <ChevronRight size={18} />
          )}
        </button>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer"
            >
              <Menu size={18} />
            </button>

            {/* Utility filter */}
            <select
              value={selectedUtilityType || ''}
              onChange={(e) =>
                setSelectedUtilityType(
                  e.target.value ? e.target.value : null,
                )
              }
              className="px-3 py-1.5 text-xs border border-border rounded-lg bg-surface
                         text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 cursor-pointer"
            >
              {utilityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Site selector placeholder — will be implemented fully in Fase 2 */}
            <span className="text-xs text-gray-400 hidden sm:inline">
              Selecciona un sitio
            </span>
          </div>

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
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
