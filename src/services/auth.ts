import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || email },
    },
  })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export type AuthChangeCallback = (session: Session | null) => void

export function onAuthStateChange(callback: AuthChangeCallback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
}
