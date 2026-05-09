import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AuthContainer,
  OTPForm,
  useAuth,
  type OTPRequestPayload,
  type OTPVerifyPayload,
} from '@authabase/react'
import { useEffect, useMemo } from 'react'
import { login, verify } from '#/lib/poke-query-api'
import '@authabase/react/styles.css'

type LoginSearch = {
  redirect?: string
}

export const Route = createFileRoute('/login')({
  validateSearch: (search): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { user, isLoading } = useAuth()
  const redirectTo = useMemo(
    () => search.redirect ?? '/dashboard',
    [search.redirect],
  )

  useEffect(() => {
    if (!isLoading && user) {
      navigate({ to: redirectTo, replace: true })
    }
  }, [isLoading, user, navigate, redirectTo])

  async function handleRequestOTP({ email }: OTPRequestPayload) {
    if (!email) throw new Error('Email is required')
    await login({ email })
  }

  async function handleVerifyOTP({ email, token }: OTPVerifyPayload) {
    if (!email) throw new Error('Email is required')
    await verify({ email, token })
  }

  if (isLoading) {
    return null
  }

  return (
    <main className="space-y-6">
      <AuthContainer
        title="Welcome to PokeQuery"
        subtitle="Enter your email to receive a one-time login code"
      >
        <OTPForm
          onError={(err) => {
            console.error(err)
          }}
          enabledMethods={{ email: true, phone: false }}
          //onRequestOTP={handleRequestOTP}
          //onVerifyOTP={handleVerifyOTP}
          onSuccess={() => navigate({ to: redirectTo, replace: true })}
        />
      </AuthContainer>
    </main>
  )
}
