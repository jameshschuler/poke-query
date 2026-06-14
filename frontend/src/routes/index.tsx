import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@authabase/react'
import {
  ArrowRightIcon,
  CompassIcon,
  SparklesIcon,
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
    <main className="relative isolate min-h-screen overflow-hidden bg-background px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_20%,hsl(var(--primary)/0.2),transparent_38%),radial-gradient(circle_at_85%_15%,hsl(var(--accent)/0.24),transparent_42%),radial-gradient(circle_at_60%_80%,hsl(var(--primary)/0.14),transparent_45%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--muted)/0.45))]" />

      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur sm:min-h-[calc(100vh-4rem)] sm:p-8 md:p-12">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            PokeQuery
          </p>
          <div className="flex items-center gap-2 text-sm">
            <a
              href="/discover"
              className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-muted-foreground hover:text-foreground"
            >
              Explore
            </a>
            <a
              href={user ? '/discover' : '/login'}
              className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-muted-foreground hover:text-foreground"
            >
              {user ? 'Workspace' : 'Log in'}
            </a>
          </div>
        </div>

        <div className="mt-6 grid flex-1 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
          <div className="flex flex-col justify-center">
            <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground">
              <SparklesIcon className="size-3.5" />
              Built for trainers who move fast
            </p>

            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Build smarter Pokemon GO search strings in seconds.
            </h1>

            <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Share useful strings with the community, from Great/Ultra/Master
              League PvP filters to raid prep for legendary, mega, and shadow
              bosses. Fork proven setups, add your tweaks, and help other
              trainers prep faster together.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href={user ? '/discover' : '/login'}>
                <Button className="rounded-full px-6">
                  {user ? 'Open Workspace' : 'Start Building'}
                  <ArrowRightIcon className="size-4" />
                </Button>
              </a>
              <a href="/discover">
                <Button variant="outline" className="rounded-full px-6">
                  <CompassIcon className="size-4" />
                  Browse Community Strings
                </Button>
              </a>
              <a href="/login">
                <Button variant="ghost" className="rounded-full px-4">
                  Claim your profile
                </Button>
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
              <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                Discover + Library + Forked + Favorites
              </span>
              <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                Share useful PvP and raid strings
              </span>
              <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
                Learn from the community and give back
              </span>
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl border border-border/60 bg-background/80 p-4 sm:p-5">
            <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                What you can do now
              </p>
              <p className="mt-2 text-lg font-semibold leading-tight">
                Turn random notes into reusable query playbooks.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <ZapIcon className="size-4" />
                Discover faster
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Search by tag, sort by popularity, and find high-signal strings
                for PvP leagues, raid counters, and event-specific grinds.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <SparklesIcon className="size-4" />
                Publish what works
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Save polished versions in Library, then share your best strings
                back to the community so others can copy and improve them.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <CompassIcon className="size-4" />
                Return to top picks quickly
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pin favorites for event prep and get straight to the strings you
                trust most.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
