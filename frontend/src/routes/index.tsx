import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@authabase/react'
import {
  ArrowRightIcon,
  BookOpenTextIcon,
  CompassIcon,
  FlameIcon,
  SparklesIcon,
  SwordsIcon,
  UsersIcon,
  ZapIcon,
} from 'lucide-react'

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
  const { user, isLoading } = useAuth()
  const docsUrl = import.meta.env.VITE_DOCS_URL ?? '/docs'

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
        <div className="absolute right-[-4rem] top-8 h-80 w-80 rounded-full bg-[#22c55e]/16 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/3 h-96 w-96 rounded-full bg-[#f59e0b]/16 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-7xl space-y-6 sm:space-y-10 md:space-y-12">
        <section className="flex min-h-[78vh] flex-col rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur sm:min-h-[calc(100vh-4rem)] sm:p-10 md:p-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              PokeQuery
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <a
                href={docsUrl}
                className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="inline-flex items-center gap-1.5">
                  <BookOpenTextIcon className="size-3.5" />
                  Documentation
                </span>
              </a>
              <a
                href="/discover"
                className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                Explore
              </a>
              <a
                href={user ? '/discover' : '/login'}
                className="rounded-full border border-primary/35 bg-primary/10 px-3 py-1 font-medium text-foreground transition-colors hover:bg-primary/20"
              >
                {user ? 'Open Workspace' : 'Log in'}
              </a>
            </div>
          </div>

          <div className="mt-8 grid flex-1 items-center gap-8 sm:mt-12 sm:gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="flex flex-col lg:pr-6">
              <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#f59e0b]/45 bg-[#f59e0b]/12 px-3 py-1 text-xs font-semibold text-foreground sm:mb-6">
                <FlameIcon className="size-3.5" />
                Your next event prep starts here
              </p>

              <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Build, share, and fork
                <span className="bg-gradient-to-r from-[#38bdf8] via-[#22c55e] to-[#f59e0b] bg-clip-text text-transparent">
                  {' '}
                  Pokemon GO raid and PvP strings
                </span>
                .
              </h1>

              <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:mt-6 sm:text-lg">
                PokeQuery helps you discover proven search strings for PvP,
                raids, and events, then remix them into your own repeatable
                playbook. Keep your strings organized, share what works, and
                make raid and PvP knowledge easier for everyone to use.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-9 sm:gap-4">
                <a href={user ? '/discover' : '/login'}>
                  <Button className="rounded-full px-6">
                    {user ? 'Open My Strings' : 'Create My First String'}
                    <ArrowRightIcon className="size-4" />
                  </Button>
                </a>
                <a href="/discover">
                  <Button variant="outline" className="rounded-full px-6">
                    <CompassIcon className="size-4" />
                    Browse Shared Strings
                  </Button>
                </a>
              </div>
            </div>

            <div className="grid gap-3 rounded-3xl border border-border/60 bg-background/80 p-4 sm:gap-4 sm:p-6">
              <div className="rounded-2xl border border-[#38bdf8]/35 bg-[#38bdf8]/10 p-4 sm:p-5">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Why PokeQuery
                </p>
                <p className="mt-2 text-lg font-semibold leading-tight">
                  Keep your best strings organized and easy to share.
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/80 p-4 sm:p-5">
                <p className="text-sm font-semibold">
                  Start your shared library
                </p>
                <div className="mt-3 flex flex-wrap gap-2 sm:mt-4 sm:gap-3">
                  <a href={user ? '/discover' : '/login'}>
                    <Button size="sm" className="rounded-full">
                      {user ? 'Open Dashboard' : 'Create Account'}
                    </Button>
                  </a>
                  <a href="/discover">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                    >
                      View Community Examples
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <a
            href="#social-proof"
            className="mt-6 inline-flex w-fit items-center gap-2 self-center rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:mt-8"
          >
            <SparklesIcon className="size-3.5" />
            Scroll to see how it works
          </a>
        </section>

        <section
          id="social-proof"
          className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-10 md:p-12"
        >
          <p className="mb-5 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Community Benefits
          </p>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="rounded-2xl border border-[#38bdf8]/35 bg-[#38bdf8]/10 px-4 py-3 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:px-5 sm:py-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Trusted workflow
              </p>
              <p className="mt-1 text-sm font-medium">
                Organize your raid and PvP strings in one place.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 border-t-4 border-t-[#22c55e] bg-card/90 px-4 py-3 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:px-5 sm:py-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Community-first
              </p>
              <p className="mt-1 text-sm font-medium">
                Discover, fork, and improve top trainer strings.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 border-t-4 border-t-[#f59e0b] bg-card/90 px-4 py-3 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:px-5 sm:py-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Shared knowledge
              </p>
              <p className="mt-1 text-sm font-medium">
                Share reliable strings so others can use them right away.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-10 md:p-12">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            <SparklesIcon className="size-4" />
            How It Works
          </p>
          <div className="mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Start with a string you trust, shape it for the moment, then share
            the final version so the next trainer does not need to start from
            zero.
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="rounded-2xl border border-[#22c55e]/35 bg-[#22c55e]/10 p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Step 1
              </p>
              <p className="mt-1 text-sm font-semibold">Discover</p>
              <p className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                You do
              </p>
              <p className="mt-1 text-sm text-foreground/90">
                Browse tags, favorites, and forks until you find a string that
                matches your raid or PvP use case.
              </p>
              <p className="mt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                PokeQuery does
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Surfaces the most relevant community strings and keeps them easy
                to scan.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 border-t-4 border-t-[#22c55e] bg-card/90 p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Step 2
              </p>
              <p className="mt-1 text-sm font-semibold">Adapt</p>
              <p className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                You do
              </p>
              <p className="mt-1 text-sm text-foreground/90">
                Fork the string, adjust the filters, and organize it for your
                local raid group, league, or event prep.
              </p>
              <p className="mt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                PokeQuery does
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Keeps your edits connected to the original so you can compare
                versions and revisit them later.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 border-t-4 border-t-[#22c55e] bg-card/90 p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Step 3
              </p>
              <p className="mt-1 text-sm font-semibold">Share</p>
              <p className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                You do
              </p>
              <p className="mt-1 text-sm text-foreground/90">
                Publish the finished string with notes so other trainers can use
                it, improve it, or fork it again.
              </p>
              <p className="mt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                PokeQuery does
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Makes the shared version easy to find and easy to reuse.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border/60 bg-background/80 p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Typical flow
            </p>
            <p className="mt-2 text-sm text-foreground/90">
              Discover a raid or PvP string → fork it for your group → organize
              your notes → share the final version back to the community.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur sm:p-10 md:p-12">
          <p className="mb-5 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Feature Highlights
          </p>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="rounded-2xl border border-[#f59e0b]/35 bg-[#f59e0b]/10 p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <SwordsIcon className="size-4" />
                PvP-ready filters
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep league-specific strings organized so your best setups are
                easy to revisit and share.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 border-t-4 border-t-[#f59e0b] bg-card/90 p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <ZapIcon className="size-4" />
                Raid and event organization
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Save event-focused strings for legendary, mega, and shadow
                rotations so your community has one source of truth.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 border-t-4 border-t-[#f59e0b] bg-card/90 p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <UsersIcon className="size-4" />
                Community collaboration
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Copy, fork, and improve what works. Shared knowledge gets
                stronger when trainers build together.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-dashed border-border/70 bg-card/60 p-5 shadow-sm backdrop-blur sm:p-10 md:p-12">
          <p className="mb-5 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Coming Soon
          </p>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Developer platform
              </p>
              <p className="mt-1 text-lg font-semibold">Direct API access</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A developer page with API access, docs, and examples for tools
                built around raids, PvP strings, and community workflows.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Community rewards
              </p>
              <p className="mt-1 text-lg font-semibold">
                Badges and achievements
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Lightweight badges for sharing, forking, and contributing useful
                strings to the community.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
