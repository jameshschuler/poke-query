import { Link, useRouter } from '@tanstack/react-router'
import {
  CheckIcon,
  Clock3Icon,
  CompassIcon,
  CopyIcon,
  HomeIcon,
  LifeBuoyIcon,
  LogInIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldAlertIcon,
  SparklesIcon,
  ServerCrashIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button'

function getFriendlyPathname() {
  if (typeof window === 'undefined') {
    return '/unknown'
  }

  return window.location.pathname
}

type NotFoundContext = {
  title: string
  message: string
  ctaLabel: string
  ctaTo: string
}

function getNotFoundContext(pathname: string): NotFoundContext {
  if (pathname.startsWith('/queries/')) {
    return {
      title: 'That query is out of range',
      message:
        'This query might have been deleted, made private, or the link was copied incorrectly.',
      ctaLabel: 'Browse discover',
      ctaTo: '/discover',
    }
  }

  if (pathname.startsWith('/trainers/')) {
    return {
      title: 'Trainer profile not visible',
      message:
        'This trainer may have changed their username, switched to private mode, or does not exist.',
      ctaLabel: 'Find trainers in discover',
      ctaTo: '/discover',
    }
  }

  if (pathname.startsWith('/forks/')) {
    return {
      title: 'Fork record went missing',
      message:
        'This fork could have been removed or disconnected from its original source.',
      ctaLabel: 'Open your forks',
      ctaTo: '/forks',
    }
  }

  if (pathname.startsWith('/library/')) {
    return {
      title: 'Library page not found',
      message:
        'That library route is unavailable right now. Your saved strings should still be accessible from the main library screen.',
      ctaLabel: 'Open library',
      ctaTo: '/library',
    }
  }

  if (
    pathname.startsWith('/account') ||
    pathname.startsWith('/notifications')
  ) {
    return {
      title: 'Settings route not found',
      message:
        'This account route may no longer exist. Try returning to your dashboard and opening settings again.',
      ctaLabel: 'Go to account settings',
      ctaTo: '/account',
    }
  }

  return {
    title: 'This path fled into tall grass',
    message:
      'Try heading back to your dashboard, or jump into discover to hunt for a new string.',
    ctaLabel: 'Explore discover',
    ctaTo: '/discover',
  }
}

export function AppNotFoundPage() {
  const pathname = getFriendlyPathname()
  const context = getNotFoundContext(pathname)

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-chart-2/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-chart-3/20 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-4 py-1 text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          <CompassIcon className="size-3.5" />
          Wild Route Encounter
        </div>

        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          404: {context.title}
        </h1>

        <p className="max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
          We could not find{' '}
          <span className="font-medium text-foreground">{pathname}</span>.{' '}
          {context.message}
        </p>

        <div className="mt-2 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <Button
            size="lg"
            nativeButton={false}
            render={<Link to="/dashboard" />}
          >
            <HomeIcon />
            Go to dashboard
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link to={context.ctaTo} />}
          >
            <SearchIcon />
            {context.ctaLabel}
          </Button>
        </div>

        <div className="mt-4 grid w-full gap-3 text-left sm:grid-cols-2">
          <article className="rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
              Quick Recovery
            </p>
            <p className="mt-2 text-sm text-foreground">
              If you followed an old share link, the query might be private,
              deleted, or moved.
            </p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
              Need Help?
            </p>
            <p className="mt-2 text-sm text-foreground">
              Open the docs for API and app guidance if something looks out of
              date.
            </p>
            <Button
              className="mt-3"
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link to="/docs" target="_blank" rel="noreferrer" />}
            >
              <LifeBuoyIcon />
              Open docs
            </Button>
          </article>
        </div>
      </section>
    </main>
  )
}

type AppErrorPageProps = {
  error: unknown
}

type ErrorContext = {
  badgeLabel: string
  title: string
  message: string
  ctaLabel: string
  ctaTo: string
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'An unexpected issue occurred while loading this page.'
}

function getErrorStack(error: unknown) {
  if (error instanceof Error) {
    return error.stack
  }

  return undefined
}

function getErrorStatus(error: unknown): number | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status
  }

  return null
}

function getErrorRequestId(error: unknown): string | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'requestId' in error &&
    typeof error.requestId === 'string'
  ) {
    return error.requestId
  }

  return null
}

function buildErrorReport(error: unknown, pathname: string) {
  const timestamp = new Date().toISOString()
  const message = getErrorMessage(error)
  const status = getErrorStatus(error)
  const requestId = getErrorRequestId(error)
  const stack = getErrorStack(error)

  return [
    'PokeQuery Error Report',
    `Time: ${timestamp}`,
    `Path: ${pathname}`,
    `Status: ${status ?? 'unknown'}`,
    `Request ID: ${requestId ?? 'unknown'}`,
    `Message: ${message}`,
    stack ? `Stack:\n${stack}` : 'Stack: unavailable',
  ].join('\n')
}

function getErrorContext(error: unknown, pathname: string): ErrorContext {
  const status = getErrorStatus(error)

  if (status === 401) {
    return {
      badgeLabel: 'Session Needed',
      title: 'Your session evolved and ran away',
      message:
        'Please sign in again to continue. If this happened during normal use, your session likely expired.',
      ctaLabel: 'Sign in again',
      ctaTo: '/login',
    }
  }

  if (status === 403) {
    return {
      badgeLabel: 'Access Blocked',
      title: 'This area is trainer-locked',
      message:
        'You do not have permission to access this route or action. Check ownership and profile visibility rules.',
      ctaLabel: 'Go to dashboard',
      ctaTo: '/dashboard',
    }
  }

  if (status === 404) {
    const notFoundContext = getNotFoundContext(pathname)

    return {
      badgeLabel: 'Missing Resource',
      title: notFoundContext.title,
      message: notFoundContext.message,
      ctaLabel: notFoundContext.ctaLabel,
      ctaTo: notFoundContext.ctaTo,
    }
  }

  if (status === 429) {
    return {
      badgeLabel: 'Rate Limited',
      title: 'Slow down, trainer',
      message:
        'Too many requests were sent in a short window. Wait a moment, then try again.',
      ctaLabel: 'Back to discover',
      ctaTo: '/discover',
    }
  }

  if (status !== null && status >= 500) {
    return {
      badgeLabel: 'Server Trouble',
      title: 'Our Pokedex backend needs a revive',
      message:
        'The server hit an unexpected issue. Try reloading now or check back in a minute.',
      ctaLabel: 'Open dashboard',
      ctaTo: '/dashboard',
    }
  }

  if (
    pathname.startsWith('/account') ||
    pathname.startsWith('/notifications')
  ) {
    return {
      badgeLabel: 'Settings Failure',
      title: 'Could not load account data',
      message:
        'Your account route failed to load. Retry the request, then return to settings if needed.',
      ctaLabel: 'Go to account settings',
      ctaTo: '/account',
    }
  }

  return {
    badgeLabel: 'Unexpected Error',
    title: 'Team Rocket broke this page',
    message: getErrorMessage(error),
    ctaLabel: 'Back to dashboard',
    ctaTo: '/dashboard',
  }
}

export function AppErrorPage({ error }: AppErrorPageProps) {
  const router = useRouter()
  const pathname = getFriendlyPathname()
  const context = getErrorContext(error, pathname)
  const status = getErrorStatus(error)
  const stack = getErrorStack(error)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  )

  async function handleCopyDetails() {
    const report = buildErrorReport(error, pathname)

    try {
      await navigator.clipboard.writeText(report)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -top-20 right-8 h-64 w-64 rounded-full bg-destructive/20 blur-3xl" />
        <div className="absolute bottom-6 left-8 h-56 w-56 rounded-full bg-chart-4/20 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-1 text-xs font-semibold tracking-[0.2em] uppercase text-destructive">
          {status === 401 ? (
            <LogInIcon className="size-3.5" />
          ) : status === 403 ? (
            <ShieldAlertIcon className="size-3.5" />
          ) : status === 429 ? (
            <Clock3Icon className="size-3.5" />
          ) : status !== null && status >= 500 ? (
            <ServerCrashIcon className="size-3.5" />
          ) : (
            <TriangleAlertIcon className="size-3.5" />
          )}
          {context.badgeLabel}
        </div>

        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          {context.title}
        </h1>

        <p className="max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
          {context.message}
        </p>

        {status !== null ? (
          <p className="text-xs font-medium tracking-[0.18em] uppercase text-muted-foreground">
            Status {status}
          </p>
        ) : null}

        <div className="mt-2 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <Button size="lg" onClick={() => router.invalidate()}>
            <RefreshCwIcon />
            Reload data
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link to={context.ctaTo} />}
          >
            {context.ctaTo === '/login' ? <LogInIcon /> : <HomeIcon />}
            {context.ctaLabel}
          </Button>
          <Button size="lg" variant="ghost" onClick={handleCopyDetails}>
            {copyState === 'copied' ? <CheckIcon /> : <CopyIcon />}
            {copyState === 'copied' ? 'Copied details' : 'Copy error details'}
          </Button>
        </div>

        {copyState === 'failed' ? (
          <p className="text-xs text-destructive">
            Could not access your clipboard. Open technical details and copy
            manually.
          </p>
        ) : null}

        {stack ? (
          <details className="mt-2 w-full rounded-2xl border border-border/70 bg-card/85 p-4 text-left shadow-sm">
            <summary className="cursor-pointer text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
              Technical details
            </summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-muted/60 p-3 text-xs leading-relaxed">
              {stack}
            </pre>
          </details>
        ) : null}

        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <SparklesIcon className="size-3.5" />
          If this keeps happening, share what you were doing right before the
          crash.
        </p>
      </section>
    </main>
  )
}
