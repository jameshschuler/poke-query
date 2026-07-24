import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, SparklesIcon } from 'lucide-react'

import { PublicInfoLinks } from '#/components/public-info-links'
import { appUpdates } from '#/content/updates'

function formatUpdateDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

export function AppUpdatesPage() {
  const latestUpdate = appUpdates[0] ?? null

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-8 rounded-3xl border border-border/70 bg-card/90 p-6 shadow-sm sm:p-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to home
        </Link>

        <header className="space-y-4">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-300/70 bg-sky-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-900 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-200">
            <SparklesIcon className="size-3.5" />
            App Updates
          </p>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Product updates and major changes
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
              Follow the latest changes to PokeQuery, including feature
              launches, behavior changes, and other updates worth calling out.
            </p>
          </div>
        </header>

        {latestUpdate ? (
          <section className="overflow-hidden rounded-3xl border border-sky-300/60 bg-linear-to-br from-sky-50/85 via-card to-card p-5 shadow-sm dark:border-sky-700/50 dark:from-sky-950/25 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-800 dark:text-sky-200">
              <span>Latest</span>
              <span aria-hidden="true">•</span>
              <span>{formatUpdateDate(latestUpdate.date)}</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {latestUpdate.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
              {latestUpdate.summary}
            </p>
          </section>
        ) : null}

        <section className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Change log</h2>
            <span className="text-xs text-muted-foreground">
              {appUpdates.length} update{appUpdates.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-5">
            {appUpdates.map((update) => (
              <article
                key={update.slug}
                className="rounded-3xl border border-border/70 bg-background/90 p-5 shadow-sm sm:p-6"
              >
                <header className="space-y-2">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    {formatUpdateDate(update.date)}
                  </p>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {update.title}
                  </h3>
                  <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                    {update.summary}
                  </p>
                </header>
                <div
                  className="mt-5 text-base text-foreground [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_p]:mb-3 [&_p]:leading-7 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1"
                  dangerouslySetInnerHTML={{ __html: update.html }}
                />
              </article>
            ))}
          </div>
        </section>

        <PublicInfoLinks />
      </div>
    </main>
  )
}
