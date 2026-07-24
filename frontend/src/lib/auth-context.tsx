import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { User } from '@supabase/supabase-js'

import { supabase } from '#/lib/supabase-client'

type SignInWithOtpPayload = Parameters<typeof supabase.auth.signInWithOtp>[0]
type VerifyOtpPayload = Parameters<typeof supabase.auth.verifyOtp>[0]
type UpdateUserPayload = Parameters<typeof supabase.auth.updateUser>[0]

let anonymousSessionPromise: Promise<void> | null = null

export async function startAnonymousSession(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.user) {
    return
  }

  if (anonymousSessionPromise) {
    return anonymousSessionPromise
  }

  anonymousSessionPromise = (async () => {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      throw error
    }
  })()

  try {
    await anonymousSessionPromise
  } finally {
    anonymousSessionPromise = null
  }
}

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  refreshSession: () => Promise<void>
  startAnonymousSession: () => Promise<void>
  requestAccountUpgrade: (payload: UpdateUserPayload) => Promise<void>
  signOut: () => Promise<void>
  signInWithOtp: (payload: SignInWithOtpPayload) => Promise<void>
  verifyAccountUpgrade: (payload: VerifyOtpPayload) => Promise<void>
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
      startAnonymousSession,
      requestAccountUpgrade: async (payload) => {
        const { error } = await supabase.auth.updateUser(payload)
        if (error) {
          throw error
        }
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
      verifyAccountUpgrade: async (payload) => {
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
