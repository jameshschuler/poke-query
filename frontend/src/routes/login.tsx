import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AuthContainer, OTPForm, useAuth } from '@authabase/react'
import type { OTPRequestPayload, OTPVerifyPayload } from '@authabase/react'
import { ArrowLeftIcon } from 'lucide-react'
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
    <main className="bg-background px-3 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to home
          </a>
          <p className="text-sm font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            PokeQuery
          </p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-sm sm:p-8">
          <div className="mb-5">
            <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email and we&apos;ll send a one-time code. No password
              required.
            </p>
          </div>

          <AuthContainer
            title="Welcome back"
            subtitle="Use your email to continue"
            className="min-h-72! px-0!"
          >
            <OTPForm
              events={{
                onVerified: () => {
                  void navigate({ to: redirectTo, replace: true })
                },
              }}
              strategy={{
                mode: 'custom',
                requestOTP: handleRequestOTP,
                verifyOTP: async (payload) => {
                  await handleVerifyOTP(payload)
                },
              }}
            />
          </AuthContainer>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Want to look around first?{' '}
            <a
              href="/discover"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Browse without an account
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
