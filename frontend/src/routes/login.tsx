import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AuthContainer, OTPForm, useAuth } from '@authabase/react'
import type { OTPRequestPayload, OTPVerifyPayload } from '@authabase/react'
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CompassIcon,
  GitForkIcon,
  HeartIcon,
} from 'lucide-react'
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
    <main className="relative isolate overflow-hidden bg-background px-2 py-8 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_20%,hsl(var(--primary)/0.2),transparent_38%),radial-gradient(circle_at_85%_15%,hsl(var(--accent)/0.24),transparent_42%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--muted)/0.45))]" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
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

        <div className="space-y-6">
          <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">
                Your trainer profile awaits
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Build and save Pokemon GO search strings, fork what the
                community shares, and keep your best PvP and raid filters in one
                place.
              </p>
            </div>

            <AuthContainer
              title="Log in"
              subtitle="Enter your email to receive a one-time login code"
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
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur">
                <CompassIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">Discover strings</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Browse what the community has shared
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur">
                <BookOpenIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">Your library</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Save your own PvP and raid filters
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur">
                <GitForkIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">Fork &amp; remix</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Build on proven strings from others
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur">
                <HeartIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">Favorites</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Keep the strings you reach for most
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              No password needed &mdash; just your email.{' '}
              <a
                href="/discover"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Browse without an account
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
