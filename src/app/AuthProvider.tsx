import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'
import { onAuthStateChange } from '@/services/auth'

interface Profile {
  id: string
  company_id: string
  email: string
  full_name: string | null
  role: string
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  loading: true,
})

export function useAuth() {
  return useContext(AuthContext)
}

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, company_id, email, full_name, role')
    .eq('auth_id', userId)
    .single()
  return data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      const { data } = await supabase.auth.getSession()

      if (!cancelled && data.session) {
        setSession(data.session)
        setUser(data.session.user)

        const p = await loadProfile(data.session.user.id)
        if (!cancelled) setProfile(p)
      }

      if (!cancelled) setLoading(false)
    }

    init()

    const { data: subData } = onAuthStateChange(async (newSession) => {
      setSession(newSession)
      setUser(newSession?.user || null)

      if (newSession?.user) {
        const p = await loadProfile(newSession.user.id)
        setProfile(p)
      } else {
        setProfile(null)
      }
    })

    return () => {
      cancelled = true
      subData?.subscription?.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
