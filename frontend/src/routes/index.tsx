import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@authabase/react'

import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/')({
  ssr: false,
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
    <main className="relative isolate min-h-screen overflow-hidden bg-background px-6 py-14 md:px-10 md:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,hsl(var(--primary)/0.15),transparent_35%),radial-gradient(circle_at_85%_0%,hsl(var(--accent)/0.22),transparent_40%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--muted)/0.3))]" />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 rounded-3xl border border-border/60 bg-card/75 p-8 shadow-sm backdrop-blur md:p-12">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium tracking-wide text-muted-foreground">
            PokeQuery
          </p>
          <a
            href="/discover"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Explore
          </a>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              Search strings for trainers and teams
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Build, discover, and reuse Pokemon GO search strings faster.
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
              Keep your best query strings organized, fork from the community,
              and jump between Discover, Library, Forked, and Favorites with a
              workspace built for speed.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href={user ? '/discover' : '/login'}>
                <Button className="rounded-full px-5">
                  {user ? 'Open Workspace' : 'Get Started'}
                </Button>
              </a>
              <a href="/discover">
                <Button variant="outline" className="rounded-full px-5">
                  View Discover
                </Button>
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-background/80 p-5 md:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              What you get
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3">
                Discover trending community strings and prompts.
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3">
                Save your own strings in Library and keep drafts organized.
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3">
                Track Forked changes and pin your Favorites for quick access.
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
