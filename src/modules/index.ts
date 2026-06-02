// Module registry — to be implemented in Fase 1
export const MODULES = [
  { id: 'inicio', label: 'Inicio', path: '/', icon: 'LayoutDashboard' },
  { id: 'mapa', label: 'Mapa Energy & Utilities', path: '/mapa', icon: 'Network' },
  { id: 'modelo', label: 'Modelo', path: '/modelo', icon: 'Database' },
  { id: 'medicion', label: 'Medición', path: '/medicion', icon: 'Gauge' },
  { id: 'balances', label: 'Balances', path: '/balances', icon: 'Scale' },
  { id: 'desempeno', label: 'Desempeño', path: '/desempeno', icon: 'TrendingUp' },
  { id: 'acciones', label: 'Acciones', path: '/acciones', icon: 'Zap' },
  { id: 'iso50001', label: 'ISO 50001', path: '/iso50001', icon: 'Shield' },
  { id: 'reportes', label: 'Reportes', path: '/reportes', icon: 'FileText' },
  { id: 'admin', label: 'Administración', path: '/admin', icon: 'Settings' },
] as const
