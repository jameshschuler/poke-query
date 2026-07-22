import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'

import { PublicInfoLinks } from '#/components/public-info-links'

export const Route = createFileRoute('/about')({
  ssr: false,
  component: AboutPage,
})

function AboutPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-8 rounded-3xl border border-border/70 bg-card/90 p-6 shadow-sm sm:p-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to home
        </Link>

        <header className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            About PokeQuery
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for Trainers Who Share What Works
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
            PokeQuery helps Pokemon GO trainers discover, fork, and share search
            strings for raids, PvP, and events.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="text-sm font-semibold">Discover</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse community strings and quickly find proven filters for your
              current goals.
            </p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="text-sm font-semibold">Adapt</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Fork strings and tune them for your event prep or PvP lineup.
            </p>
          </article>
          <article className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="text-sm font-semibold">Share</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Publish updates so other trainers can reuse and improve your best
              versions.
            </p>
          </article>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Who It Is For</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            PokeQuery is designed for individual trainers and PvP players who
            want a reliable way to manage search strings over time.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Questions?</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            If you are new to PokeQuery, start in Discover to see how shared
            strings are organized. Questions or feedback? Email{' '}
            <a
              href="mailto:contact@pokequery.app"
              className="font-medium underline underline-offset-2"
            >
              contact@pokequery.app
            </a>
            .
          </p>
        </section>

        <PublicInfoLinks />
      </div>
    </main>
  )
}
