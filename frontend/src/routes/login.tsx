import { useEffect, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  BookOpenTextIcon,
  Clock3Icon,
  SparklesIcon,
  ZapIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { PublicInfoLinks } from '#/components/public-info-links'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '#/components/ui/input-otp'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { requireGuest } from '#/lib/route-auth'
import { useAuth } from '#/lib/auth-context'

type LoginSearch = {
  redirect?: string
}

export const Route = createFileRoute('/login')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: async () => {
    await requireGuest()
  },
  component: LoginPage,
})

const OTP_LENGTH = 6
const RESEND_SECONDS = 50

const TESTIMONIALS = [
  {
    quote:
      'Before every Community Day I fork my best catch filters, tweak them for the event, and hand them to my whole group.',
    initials: 'DP',
    name: 'Diego Park',
    title: 'Community Leader',
  },
  {
    quote:
      'I keep one clean PvP string for every league and update each fork as the meta shifts. PokeQuery saves me hours each week.',
    initials: 'AL',
    name: 'Avery Lee',
    title: 'PvP Grinder',
  },
  {
    quote:
      'Our raid crew shares one event-ready string, then everyone forks it for their own goals. It keeps prep simple and consistent.',
    initials: 'MK',
    name: 'Mina Kato',
    title: 'Raid Organizer',
  },
  {
    quote:
      'I publish polished strings after each rotation so new trainers can jump in fast and still understand why each filter is there.',
    initials: 'RJ',
    name: 'Rory James',
    title: 'Guide Creator',
  },
  {
    quote:
      'I have one base filter for shadow raids and fork it by boss rotation. The team always knows which string is current.',
    initials: 'SN',
    name: 'Sonia Nguyen',
    title: 'Raid Captain',
  },
  {
    quote:
      'PokeQuery makes onboarding easy. New trainers can browse proven strings, then fork and learn from real examples right away.',
    initials: 'TL',
    name: 'Theo Lin',
    title: 'Community Mentor',
  },
  {
    quote:
      'Our tournament prep is smoother now. We keep matchup-specific forks organized and update them between every cup.',
    initials: 'CP',
    name: 'Cam Patel',
    title: 'Tournament Organizer',
  },
  {
    quote:
      'The best part is continuity. I can revisit old event strings, compare changes, and publish a cleaner version each season.',
    initials: 'EM',
    name: 'Elena Martinez',
    title: 'Longtime Trainer',
  },
] as const

export function LoginPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { signInWithOtp, verifyOtp } = useAuth()
  const docsUrl = import.meta.env.VITE_DOCS_URL ?? '/docs'

  const [identifier, setIdentifier] = useState('')
  const [token, setToken] = useState('')
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [isPending, setIsPending] = useState(false)
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [deliveryTarget, setDeliveryTarget] = useState('')
  const isVerifyStep = step === 'verify'

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveTestimonialIndex(
        (currentIndex) => (currentIndex + 1) % TESTIMONIALS.length,
      )
    }, 5000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (!isVerifyStep || resendCountdown <= 0) {
      return
    }

    const intervalId = window.setInterval(() => {
      setResendCountdown((seconds) => (seconds > 0 ? seconds - 1 : 0))
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isVerifyStep, resendCountdown])

  const activeTestimonial = TESTIMONIALS[activeTestimonialIndex]

  async function handleRequestOtp() {
    const trimmed = identifier.trim()

    if (!trimmed) {
      toast.error('Enter your email address.')
      return
    }

    setIsPending(true)
    try {
      await signInWithOtp({ email: trimmed })
      setDeliveryTarget(trimmed)

      toast.success('OTP sent. Enter the code to finish signing in.')
      setToken('')
      setStep('verify')
      setResendCountdown(RESEND_SECONDS)
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Could not send OTP.'
      toast.error(message)
    } finally {
      setIsPending(false)
    }
  }

  async function handleVerifyOtp() {
    const trimmedIdentifier = identifier.trim()
    const trimmedToken = token.trim()

    if (!trimmedToken) {
      toast.error('Enter the verification code.')
      return
    }

    setIsPending(true)
    try {
      await verifyOtp({
        email: trimmedIdentifier,
        token: trimmedToken,
        type: 'email',
      })

      toast.success('Signed in successfully.')
      await navigate({ to: search.redirect || '/dashboard', replace: true })
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Could not verify OTP.'
      toast.error(message)
    } finally {
      setIsPending(false)
    }
  }

  async function handleResendOtp() {
    if (isPending || resendCountdown > 0) {
      return
    }

    const trimmed = identifier.trim()

    if (!trimmed) {
      return
    }

    setIsPending(true)
    try {
      await signInWithOtp({ email: trimmed })
      setDeliveryTarget(trimmed)

      toast.success('A new OTP code was sent.')
      setResendCountdown(RESEND_SECONDS)
      setToken('')
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Could not resend OTP.'
      toast.error(message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground hover:opacity-80"
        >
          <ZapIcon className="size-5" />
          PokeQuery
        </Link>
        <a
          href={docsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <BookOpenTextIcon className="size-3.5" />
          Documentation
        </a>
      </header>

      <main className="grid min-h-[calc(100vh-76px)] w-full grid-cols-1 gap-10 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:gap-0 lg:px-0 lg:py-0">
        <section className="flex items-center justify-center border-border lg:border-r lg:px-10">
          <div className="w-full max-w-md space-y-8">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="size-3.5" />
              Back to home
            </Link>

            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight">
                Welcome back
              </h1>
              <p className="text-muted-foreground">Sign in to your account.</p>
            </div>

            <div className="rounded-3xl border border-border p-4 sm:p-8">
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
                <div className="space-y-3">
                  <label
                    className="text-sm font-medium text-foreground"
                    htmlFor="otp-identifier"
                  >
                    Email
                  </label>
                  <Input
                    id="otp-identifier"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    value={identifier}
                    disabled={isPending || isVerifyStep}
                    onChange={(event) => setIdentifier(event.target.value)}
                  />
                </div>

                <div className="mt-6 space-y-3">
                  {isVerifyStep ? (
                    <>
                      <div className="space-y-6 rounded-xl border border-border/80 bg-card p-5 sm:p-6">
                        <p className="rounded-lg bg-green-100 px-4 py-3 text-sm font-medium text-green-900">
                          Check your email for the OTP code
                        </p>

                        <div className="space-y-4">
                          <p className="text-2xl font-semibold tracking-tight text-foreground">
                            Enter OTP Code
                          </p>
                          <InputOTP
                            maxLength={OTP_LENGTH}
                            value={token}
                            onChange={setToken}
                            disabled={isPending}
                            containerClassName="justify-center"
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                          <p className="text-sm text-muted-foreground">
                            A code has been sent to{' '}
                            {deliveryTarget || identifier.trim()}.
                          </p>
                        </div>

                        <Button
                          className="w-full"
                          disabled={
                            isPending || token.trim().length < OTP_LENGTH
                          }
                          onClick={handleVerifyOtp}
                        >
                          {isPending ? 'Verifying...' : 'Verify OTP'}
                        </Button>

                        <div className="flex items-center justify-between pt-1 text-sm">
                          <button
                            type="button"
                            className="font-medium text-foreground underline-offset-2 hover:underline"
                            disabled={isPending}
                            onClick={() => {
                              setStep('request')
                              setToken('')
                              setResendCountdown(0)
                            }}
                          >
                            Change email
                          </button>
                          {resendCountdown > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                              <Clock3Icon className="size-4" />
                              Resend in {resendCountdown}s
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="font-medium text-foreground underline-offset-2 hover:underline"
                              disabled={isPending}
                              onClick={handleResendOtp}
                            >
                              Resend code
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <Button
                      className="w-full"
                      disabled={isPending}
                      onClick={handleRequestOtp}
                    >
                      {isPending ? 'Sending OTP...' : 'Send OTP'}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <p className="pt-1 text-center text-sm text-muted-foreground">
              Want to look around first?{' '}
              <Link to="/discover" className="underline underline-offset-2">
                Browse without an account
              </Link>
            </p>
            <PublicInfoLinks />
          </div>
        </section>

        <section className="hidden items-center justify-center px-4 lg:flex lg:px-10">
          <div className="max-w-md space-y-8">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <SparklesIcon className="size-4" />
              Trainer Stories
            </p>
            <blockquote className="text-4xl font-semibold leading-tight tracking-tight">
              {activeTestimonial.quote}
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-xs font-semibold">
                {activeTestimonial.initials}
              </div>
              <div>
                <p className="text-sm font-medium">{activeTestimonial.name}</p>
                <p className="text-xs text-muted-foreground">
                  {activeTestimonial.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              {TESTIMONIALS.map((_item, index) =>
                index === activeTestimonialIndex ? (
                  <span
                    key={index}
                    className="h-1.5 w-6 rounded-full bg-foreground/80"
                  />
                ) : (
                  <span
                    key={index}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                  />
                ),
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
