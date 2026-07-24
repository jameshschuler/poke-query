import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '#/lib/auth-context'
import { BookOpenTextIcon, CompassIcon } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { requireGuest } from '#/lib/route-auth'

export const Route = createFileRoute('/')({
  ssr: false,
  beforeLoad: async () => {
    await requireGuest()
  },
  component: LandingPage,
})

function LandingPage() {
  const { isLoading } = useAuth()
  const docsUrl = import.meta.env.VITE_DOCS_URL ?? '/docs'
  const repoUrl = 'https://github.com/jameshschuler/poke-query'

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="rounded-xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur">
          Loading PokeQuery...
        </div>
      </main>
    )
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background px-4 py-6 sm:px-6 sm:py-10 md:px-10 md:py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgb(56_189_248/0.18),transparent_40%),radial-gradient(circle_at_85%_16%,rgb(34_197_94/0.14),transparent_42%),radial-gradient(circle_at_70%_82%,rgb(245_158_11/0.12),transparent_38%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.55))]" />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#38bdf8]/20 blur-3xl motion-safe:animate-pulse" />
        <div className="absolute -right-16 top-8 h-80 w-80 rounded-full bg-[#22c55e]/16 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-[#f59e0b]/16 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-7xl space-y-6 sm:space-y-10 md:space-y-12">
        <section className="flex min-h-[78vh] flex-col rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur sm:min-h-[calc(100vh-4rem)] sm:p-10 md:p-14">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase sm:text-sm">
              PokeQuery
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:gap-3 sm:text-sm">
              <a
                href="/discover"
                className="rounded-full border border-border/70 bg-background/70 px-2 py-1 text-muted-foreground transition-colors hover:text-foreground sm:px-3"
              >
                Discover
              </a>
              <a
                href="/about"
                className="rounded-full border border-border/70 bg-background/70 px-2 py-1 text-muted-foreground transition-colors hover:text-foreground sm:px-3"
              >
                About
              </a>
              <a
                href="/dashboard"
                className="rounded-full border border-[#f59e0b]/45 bg-[#f59e0b]/18 px-2 py-1 font-medium text-foreground transition-colors hover:bg-[#f59e0b]/28 sm:px-3"
              >
                Log in
              </a>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-6 sm:mt-12 sm:gap-10 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="flex flex-col lg:pr-6">
              <p className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[#22c55e]/45 bg-[#22c55e]/12 px-2 py-0.5 text-xs font-semibold text-foreground sm:mb-5 sm:px-3 sm:py-1">
                <CompassIcon className="size-3 sm:size-3.5" />
                <span className="hidden sm:inline">
                  No account needed — start sharing right away
                </span>
                <span className="sm:hidden">No account needed</span>
              </p>

              <h1 className="max-w-4xl text-2xl font-semibold leading-snug tracking-tight sm:text-3xl lg:text-6xl">
                Find, save, and share
                <span className="bg-linear-to-r from-[#38bdf8] via-[#22c55e] to-[#f59e0b] bg-clip-text text-transparent">
                  {' '}
                  Pokemon GO search strings
                </span>
                .
              </h1>

              <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:mt-6 sm:text-base">
                Browse community strings for raids, PvP, and events. Fork what
                works, make it your own, and keep your best versions organized.
              </p>

              <p className="mt-2 max-w-2xl text-xs font-medium text-foreground/85 sm:mt-3 sm:text-sm">
                No sign-up needed now. Add an email later to sign in on any
                device and keep your saved strings.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-7 sm:gap-3">
                <a href="/dashboard">
                  <Button className="rounded-full border border-cyan-300/70 bg-cyan-500 px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(6,182,212,0.35)] transition hover:bg-cyan-400 sm:px-6">
                    <CompassIcon className="size-3.5 sm:size-4" />
                    Open App
                  </Button>
                </a>
                <a
                  href="/discover"
                  className="px-2 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                >
                  Get Started
                </a>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 rounded-3xl border border-border/60 bg-background/80 p-3 sm:gap-4 sm:p-6">
              <div className="rounded-2xl border border-border/70 bg-card/90 p-3 shadow-sm sm:p-5">
                <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Sample String
                  </p>
                  <span className="rounded-full border border-emerald-300/70 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200 whitespace-nowrap">
                    Public
                  </span>
                </div>

                <h2 className="mt-3 text-sm font-semibold leading-snug sm:text-base">
                  Quick Daily Trash Filter
                </h2>

                <pre className="mt-3 overflow-x-auto rounded-lg border border-border/70 bg-background px-2 py-1.5 text-xs text-foreground/90 sm:rounded-xl sm:px-3 sm:py-2">
                  0*,1*,2*&!shiny&!legendary&!mythical&!shadow&!purified&!costume&!#
                </pre>

                <div className="mt-4 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs text-sky-800 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200 sm:px-2.5 sm:py-1">
                    pvp
                  </span>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs text-sky-800 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200 sm:px-2.5 sm:py-1">
                    great-league
                  </span>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs text-sky-800 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200 sm:px-2.5 sm:py-1">
                    ranked
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-1 text-xs text-muted-foreground sm:flex sm:items-center sm:justify-between">
                  <span className="text-center">1.8k copies</span>
                  <span className="text-center">236 forks</span>
                  <span className="text-center whitespace-nowrap">2d ago</span>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/90 p-3 shadow-sm sm:p-5">
                <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Sample String
                  </p>
                  <span className="rounded-full border border-amber-300/70 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200 whitespace-nowrap">
                    Draft
                  </span>
                </div>

                <h2 className="mt-3 text-sm font-semibold leading-snug sm:text-base">
                  Potential Great / Ultra League PvP Candidates
                </h2>

                <pre className="mt-3 overflow-x-auto rounded-lg border border-border/70 bg-background px-2 py-1.5 text-xs text-foreground/90 sm:rounded-xl sm:px-3 sm:py-2">
                  0-1attack&3-4defense&3-4hp&!#
                </pre>

                <div className="mt-4 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs text-sky-800 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200 sm:px-2.5 sm:py-1">
                    raid
                  </span>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs text-sky-800 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200 sm:px-2.5 sm:py-1">
                    shadow
                  </span>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs text-sky-800 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200 sm:px-2.5 sm:py-1">
                    event
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-1 text-xs text-muted-foreground sm:flex sm:items-center sm:justify-between">
                  <span className="text-center text-xs">Private</span>
                  <span className="text-center text-xs">Saved</span>
                  <span className="text-center text-xs">6h ago</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4 text-xs sm:mt-8 sm:gap-3 sm:pt-6 sm:text-sm">
            <a
              href={docsUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-muted-foreground transition-colors hover:text-foreground sm:px-3 sm:py-1"
            >
              <span className="inline-flex items-center gap-1.5">
                <BookOpenTextIcon className="size-3 sm:size-3.5" />
                <span className="hidden sm:inline">Docs</span>
                <span className="sm:hidden">Docs</span>
              </span>
            </a>
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-muted-foreground transition-colors hover:text-foreground sm:px-3 sm:py-1"
            >
              GitHub
            </a>
            <a
              href="/privacy"
              className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-muted-foreground transition-colors hover:text-foreground sm:px-3 sm:py-1"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-muted-foreground transition-colors hover:text-foreground sm:px-3 sm:py-1"
            >
              Terms
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
