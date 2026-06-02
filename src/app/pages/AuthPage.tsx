import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn, signUp } from '@/services/auth'
import { Button } from '@/shared/Button'

interface AuthFormProps {
  mode: 'login' | 'register'
}

export function AuthPage({ mode }: AuthFormProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        await signUp(email, password, fullName || undefined)
      } else {
        await signIn(email, password)
      }
      navigate('/')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error de autenticación'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-blue text-white text-lg font-bold mb-3">
            VE
          </div>
          <h1 className="text-xl font-semibold text-gray-900">VersaEnergy</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login'
              ? 'Inicia sesión en tu cuenta'
              : 'Crea tu cuenta'}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-(--radius-modal) shadow-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nombre completo
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  placeholder="Tu nombre"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </Button>

            <p className="text-center text-sm text-gray-500">
              {mode === 'login' ? (
                <>
                  ¿No tienes cuenta?{' '}
                  <Link
                    to="/register"
                    className="text-brand-blue hover:underline font-medium"
                  >
                    Regístrate
                  </Link>
                </>
              ) : (
                <>
                  ¿Ya tienes cuenta?{' '}
                  <Link
                    to="/login"
                    className="text-brand-blue hover:underline font-medium"
                  >
                    Inicia sesión
                  </Link>
                </>
              )}
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
