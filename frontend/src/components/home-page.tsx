import { useQuery } from '@tanstack/react-query'
import { BookOpenText, Github, RadioTower, Sparkles } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { apiBaseUrl, fetchCommunityQueries } from '#/lib/poke-query-api'

const teams: Record<'mystic' | 'valor' | 'instinct', string> = {
  mystic: 'Mystic',
  valor: 'Valor',
  instinct: 'Instinct',
}

export function HomePage() {
  const communityQuery = useQuery({
    queryKey: ['community', 'popular'],
    queryFn: fetchCommunityQueries,
  })

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.7),_transparent_30%),linear-gradient(180deg,_var(--background)_0%,_color-mix(in_oklab,_var(--background)_75%,_var(--accent))_100%)] px-6 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="grid gap-6 rounded-[2rem] border border-border/70 bg-card/80 p-8 shadow-[0_30px_80px_-40px_rgba(44,31,18,0.55)] backdrop-blur md:grid-cols-[1.3fr_0.9fr] md:p-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              <Sparkles className="size-3.5" />
              TanStack Start + Nitro
            </div>
            <div className="space-y-4">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#9a5a1f]">
                Poke Query client
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
                Ship a real client for Poke Query
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                Browse public search strings, surface creator stats, and build
                authenticated flows on top of your Fastify API with TanStack
                Query, Nitro SSR, Tailwind, lucide, and shadcn/ui already wired
                in.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                render={
                  <a
                    href={`${apiBaseUrl}/docs`}
                    rel="noreferrer"
                    target="_blank"
                  />
                }
                nativeButton={false}
                size="lg"
              >
                <BookOpenText className="size-4" />
                Open API Docs
              </Button>
              <Button
                render={
                  <a
                    href="https://github.com/jameshschuler/poke-query"
                    rel="noreferrer"
                    target="_blank"
                  />
                }
                nativeButton={false}
                size="lg"
                variant="outline"
              >
                <Github className="size-4" />
                View Repository
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.75rem] border border-border/80 bg-background/85 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                <RadioTower className="size-4 text-[#9a5a1f]" />
                API target
              </div>
              <p className="mt-3 break-all font-mono text-sm text-muted-foreground">
                {apiBaseUrl}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard label="Runtime" value="Nitro" />
              <StatCard label="UI stack" value="shadcn/ui" />
              <StatCard label="Data layer" value="TanStack Query" />
              <StatCard label="Quality" value="Vitest + ESLint + Prettier" />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            title="Public discovery"
            description="Hit the community endpoint, sort results, and turn saved search strings into a fast browse experience."
          />
          <FeatureCard
            title="Authenticated actions"
            description="Use the existing cookie-based auth flow to create, edit, fork, and favorite queries from the client."
          />
          <FeatureCard
            title="Composable UI"
            description="shadcn primitives and lucide icons are ready for forms, dialogs, drawers, and command menus."
          />
        </section>

        <section className="rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-[0_20px_60px_-30px_rgba(44,31,18,0.45)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9a5a1f]">
                Live data
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Popular community queries
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Pulled from `GET /api/v1/community?sort=popular`.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {communityQuery.isLoading ? (
              <StateCard text="Loading community queries..." />
            ) : null}
            {communityQuery.isError ? (
              <StateCard text="Community data is unavailable. Start the backend at http://localhost:3000 or set VITE_API_BASE_URL." />
            ) : null}
            {!communityQuery.isLoading &&
            !communityQuery.isError &&
            communityQuery.data?.length === 0 ? (
              <StateCard text="No public queries yet. Start the backend and create one to populate this list." />
            ) : null}
            {communityQuery.data?.map((query) => (
              <article
                className="rounded-[1.5rem] border border-border/80 bg-background/85 p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                key={query.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Query ID
                    </p>
                    <p className="mt-2 font-mono text-sm text-foreground">
                      {query.id}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#f5d7b8] px-3 py-1 text-xs font-semibold text-[#7e4317]">
                    {query.creator?.team ? teams[query.creator.team] : 'Public'}
                  </span>
                </div>
                <div className="mt-5 border-t border-border/70 pt-4">
                  <p className="text-sm font-semibold text-foreground">
                    {query.creator?.username ?? 'Unknown trainer'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {query.creator?.level
                      ? `Level ${query.creator.level}`
                      : 'Trainer level unavailable'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function FeatureCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <article className="rounded-[1.5rem] border border-border/70 bg-card/80 p-6 shadow-sm">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        {description}
      </p>
    </article>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-border/80 bg-background/85 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  )
}

function StateCard({ text }: { text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-border bg-background/70 p-5 text-sm leading-7 text-muted-foreground md:col-span-2 xl:col-span-3">
      {text}
    </div>
  )
}
