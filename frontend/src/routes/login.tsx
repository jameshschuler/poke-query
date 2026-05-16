import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AuthContainer, OTPForm, useAuth } from '@authabase/react'
import type { OTPRequestPayload, OTPVerifyPayload } from '@authabase/react'
import { useMemo } from 'react'
import { login, verify } from '#/lib/poke-query-api'
import { requireGuest } from '#/lib/route-auth'
import '@authabase/react/styles.css'

type LoginSearch = {
  redirect?: string
}

export const Route = createFileRoute('/login')({
  ssr: false,
  validateSearch: (search): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: async () => {
    await requireGuest()
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { refreshSession } = useAuth()
  const search = Route.useSearch()
  const redirectTo = useMemo(
    () => search.redirect ?? '/dashboard',
    [search.redirect],
  )

  async function handleRequestOTP({ email }: OTPRequestPayload) {
    if (!email) throw new Error('Email is required')
    await login({ email })
  }

  async function handleVerifyOTP({ email, token }: OTPVerifyPayload) {
    if (!email) throw new Error('Email is required')
    await verify({ email, token })
    await refreshSession()
  }

  return (
    <main className="space-y-6">
      <AuthContainer
        title="Welcome to PokeQuery"
        subtitle="Enter your email to receive a one-time login code"
      >
        <OTPForm
          events={{
            onVerified: () => {
              // redirect to /dashboard
              void navigate({ to: redirectTo, replace: true })
            },
          }}
          strategy={{
            mode: 'custom',
            requestOTP: handleRequestOTP,
            verifyOTP: async (payload) => {
              await handleVerifyOTP(payload)
              // return { email: payload.email }
            },
          }}
        />
      </AuthContainer>
    </main>
  )
}
