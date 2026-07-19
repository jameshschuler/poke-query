import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { User } from '@supabase/supabase-js'

import { supabase } from '#/lib/supabase-client'

type SignInWithOtpPayload = Parameters<typeof supabase.auth.signInWithOtp>[0]
type VerifyOtpPayload = Parameters<typeof supabase.auth.verifyOtp>[0]

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  refreshSession: () => Promise<void>
  signOut: () => Promise<void>
  signInWithOtp: (payload: SignInWithOtpPayload) => Promise<void>
  verifyOtp: (payload: VerifyOtpPayload) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (isMounted) {
        setUser(currentUser)
        setIsLoading(false)
      }
    }

    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return
      }

      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      refreshSession: async () => {
        const {
          data: { user: refreshedUser },
        } = await supabase.auth.getUser()

        setUser(refreshedUser)
      },
      signOut: async () => {
        await supabase.auth.signOut()
        setUser(null)
      },
      signInWithOtp: async (payload) => {
        const { error } = await supabase.auth.signInWithOtp(payload)
        if (error) {
          throw error
        }
      },
      verifyOtp: async (payload) => {
        const { error } = await supabase.auth.verifyOtp(payload)
        if (error) {
          throw error
        }
      },
    }),
    [isLoading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
