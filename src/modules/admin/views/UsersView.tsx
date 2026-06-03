import { Card } from '@/shared/Card'
import { Shield, User, Search, Mail } from 'lucide-react'

export function UsersView() {
  const users = [
    { id: '1', name: 'Ana Rodríguez', email: 'ana@versa.com', role: 'admin', lastActive: 'Hace 2 horas' },
    { id: '2', name: 'Carlos Mendoza', email: 'carlos@versa.com', role: 'manager', lastActive: 'Ayer' },
    { id: '3', name: 'Luis García', email: 'luis@versa.com', role: 'engineer', lastActive: 'Hace 3 días' },
    { id: '4', name: 'Elena Torres', email: 'elena@versa.com', role: 'viewer', lastActive: 'Hace 1 semana' },
  ]

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-md">Administrador</span>
      case 'manager': return <span className="px-2.5 py-1 bg-brand-blue/10 text-brand-blue text-xs font-medium rounded-md">Gestor Energético</span>
      case 'engineer': return <span className="px-2.5 py-1 bg-cyan-100 text-cyan-700 text-xs font-medium rounded-md">Técnico</span>
      case 'viewer': return <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">Visor</span>
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Usuarios y Roles (VersaEnergy)</h2>
          <p className="text-sm text-gray-500">Gestiona los permisos y accesos específicos para esta aplicación.</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
          <Mail size={16} />
          <span>Invitar Usuario</span>
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o correo..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            />
          </div>
        </div>
        
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="px-5 py-3 font-semibold text-gray-900">Usuario</th>
              <th className="px-5 py-3 font-semibold text-gray-900">Rol Energy (app_memberships)</th>
              <th className="px-5 py-3 font-semibold text-gray-900">Última Actividad</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  {getRoleBadge(user.role)}
                </td>
                <td className="px-5 py-3 text-gray-500">
                  {user.lastActive}
                </td>
                <td className="px-5 py-3 text-right">
                  <button className="text-gray-400 hover:text-brand-blue cursor-pointer p-1">
                    <Shield size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
