import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AuthContainer, OTPForm, useAuth } from '@authabase/react'
import type { OTPRequestPayload, OTPVerifyPayload } from '@authabase/react'
import {
  ArrowLeftIcon,
  BookOpenTextIcon,
  QuoteIcon,
  ZapIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { login, verify } from '#/lib/poke-query-api'
import { requireGuest } from '#/lib/route-auth'
import '@authabase/react/styles.css'

type LoginSearch = {
  redirect?: string
}

type PlayerQuote = {
  quote: string
  author: string
  role: string
}

const PLAYER_QUOTES: PlayerQuote[] = [
  {
    quote:
      'I can prep my Great League and Ultra League strings in one spot, then share them with my local raid crew in seconds.',
    author: 'Maya Chen',
    role: 'PvP Grinder',
  },
  {
    quote:
      'Before every Community Day I fork my best catch filters, tweak them for the event, and hand them to my whole group.',
    author: 'Diego Park',
    role: 'Community Leader',
  },
  {
    quote:
      'I use saved strings for Rocket battles, raid prep, and transfer cleanup. It saves me so much time between events.',
    author: 'Rina Flores',
    role: 'Daily Player',
  },
  {
    quote:
      'Forking top strings and adding my own rules is the fastest way I have found to build consistent team prep.',
    author: 'Alex Romero',
    role: 'Tournament Trainer',
  },
  {
    quote:
      'Our group now keeps event filters organized in one place, so new trainers can jump in without guessing query syntax.',
    author: 'Noah Patel',
    role: 'Raid Organizer',
  },
]

function getInitials(name: string): string {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return 'PQ'
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
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
  const docsUrl = import.meta.env.VITE_DOCS_URL ?? '/docs'
  const [quoteIndex, setQuoteIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % PLAYER_QUOTES.length)
    }, 8000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  const redirectTo = useMemo(
    () => search.redirect ?? '/dashboard',
    [search.redirect],
  )
  const activeQuote = PLAYER_QUOTES[quoteIndex]

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
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,hsl(var(--primary)/0.12),transparent_38%),radial-gradient(circle_at_88%_82%,hsl(var(--accent)/0.2),transparent_42%)]" />

      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4">
          <p className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <span className="rounded-md bg-primary/15 p-1 text-primary">
              <ZapIcon className="size-3.5" />
            </span>
            PokeQuery
          </p>

          <a
            href={docsUrl}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/85 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <BookOpenTextIcon className="size-3.5" />
            Documentation
          </a>
        </header>

        <div className="grid flex-1 lg:grid-cols-2">
          <section className="flex items-center justify-center border-b border-border/70 px-6 py-10 sm:px-6 lg:border-r lg:border-b-0 lg:px-12 lg:py-12">
            <div className="w-full max-w-md space-y-5">
              <div className="flex items-center justify-between">
                <a
                  href="/"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeftIcon className="size-3.5" />
                  Back to home
                </a>
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  Welcome back
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sign in to your account.
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-sm">
                <AuthContainer title="" subtitle="" className="min-h-72! px-0!">
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

              <p className="text-center text-xs text-muted-foreground">
                Want to look around first?{' '}
                <a
                  href="/discover"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Browse without an account
                </a>
              </p>
            </div>
          </section>

          <aside className="relative items-center justify-center bg-muted/20 px-6 py-8 sm:px-8 sm:py-10 lg:flex lg:px-14 lg:py-12">
            <div className="max-w-md">
              <QuoteIcon className="mb-5 size-10 text-muted-foreground/45" />
              <p
                key={activeQuote.quote}
                className="animate-in fade-in-0 text-3xl font-medium leading-tight tracking-tight text-foreground duration-700"
              >
                {activeQuote.quote}
              </p>
              <p className="mt-5 text-sm text-muted-foreground">
                The docs button in the top-right is ready for your API docs
                site. Set
                <span className="mx-1 font-medium text-foreground">
                  VITE_DOCS_URL
                </span>
                when you deploy docs.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full border border-border/70 bg-card text-sm font-semibold text-foreground">
                  {getInitials(activeQuote.author)}
                </span>
                <div>
                  <p
                    key={activeQuote.author}
                    className="text-sm font-medium text-foreground"
                  >
                    {activeQuote.author}
                  </p>
                  <p
                    key={activeQuote.role}
                    className="text-xs text-muted-foreground"
                  >
                    {activeQuote.role}
                  </p>
                </div>
              </div>

              <div
                className="mt-5 flex items-center gap-2"
                aria-label="Quote progress"
              >
                {PLAYER_QUOTES.map((quote, index) => {
                  const isActive = index === quoteIndex

                  return (
                    <span
                      key={`${quote.author}-${index}`}
                      className={`inline-block h-1.5 rounded-full transition-all ${isActive ? 'w-6 bg-foreground/80' : 'w-1.5 bg-foreground/25'}`}
                      aria-current={isActive ? 'true' : undefined}
                    />
                  )
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
