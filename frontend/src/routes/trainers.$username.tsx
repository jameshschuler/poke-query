import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '@authabase/react'
import { useQuery } from '@tanstack/react-query'
import {
  CopyIcon,
  GitForkIcon,
  HeartIcon,
  UserRoundXIcon,
  UsersIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import type { TrainerPublicQuery } from '#/lib/poke-query-api'
import {
  copyQuery,
  getTrainerByUsername,
  getTrainerStrings,
  getTrainerForks,
  getTrainerFavorites,
} from '#/lib/poke-query-api'
import { useState } from 'react'

export const Route = createFileRoute('/trainers/$username')({
  component: TrainerProfilePage,
})

const tagLabels: Record<string, string> = {
  pvp: 'PvP',
  raid: 'Raid',
  'high-iv': 'IV Hunt',
  'exclusion-filter': 'Utility',
  'daily-catch': 'Community Day',
  'legacy-moves': 'Collection',
}

const teamLabels: Record<string, string> = {
  mystic: 'Team Mystic',
  valor: 'Team Valor',
  instinct: 'Team Instinct',
}

const teamBadgeClass: Record<'mystic' | 'valor' | 'instinct', string> = {
  mystic: 'bg-blue-100 text-blue-900',
  valor: 'bg-red-100 text-red-900',
  instinct: 'bg-yellow-100 text-yellow-900',
}

const teamDotClass: Record<'mystic' | 'valor' | 'instinct', string> = {
  mystic: 'bg-blue-500',
  valor: 'bg-red-500',
  instinct: 'bg-yellow-500',
}

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
})

function QueryCard({ card }: { card: TrainerPublicQuery }) {
  const { user } = useAuth()
  const firstTag = card.autoTags[0]

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/70">
      <div className="flex-1 space-y-4 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <Link
            to="/queries/$queryId"
            params={{ queryId: card.id }}
            className="hover:underline"
          >
            <h3 className="text-lg font-semibold leading-tight">
              {card.title}
            </h3>
          </Link>
          {firstTag ? (
            <span className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              {tagLabels[firstTag] ?? firstTag}
            </span>
          ) : null}
        </div>

        <div className="rounded-xl border border-border/70 bg-card px-4 py-3 font-mono text-lg text-muted-foreground">
          {card.query}
        </div>

        {card.description ? (
          <p className="text-sm text-muted-foreground">{card.description}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-border/60 bg-card/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => {
              void navigator.clipboard.writeText(card.query).then(() => {
                void copyQuery(card.id)
                toast.success('Copied to clipboard!')
              })
            }}
          >
            <CopyIcon className="size-4" />
            Copy
          </Button>
          {user ? (
            <Link
              to="/queries/$queryId"
              params={{ queryId: card.id }}
              className="inline-flex"
            >
              <Button variant="outline" size="sm" className="rounded-xl">
                <GitForkIcon className="size-4" />
                Fork
              </Button>
            </Link>
          ) : null}
        </div>

        <div className="flex flex-nowrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CopyIcon className="size-4" />
            {card.copyCount}
          </span>
          <span className="flex items-center gap-1.5">
            <HeartIcon className="size-4" />
            {card.favoriteCount}
          </span>
          <span className="flex items-center gap-1.5">
            <GitForkIcon className="size-4" />
            {card.forkCount}
          </span>
        </div>
      </div>
    </article>
  )
}

function TrainerProfilePage() {
  const { username } = Route.useParams()

  const [activeTab, setActiveTab] = useState<'strings' | 'forks' | 'favorites'>(
    'strings',
  )

  const {
    data: trainer,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['trainer', username],
    queryFn: () => getTrainerByUsername(username),
  })

  const { data: stringsData } = useQuery({
    queryKey: ['trainer-strings', trainer?.id],
    queryFn: () => getTrainerStrings(trainer!.id),
    enabled: !!trainer?.id,
  })

  const { data: forksData } = useQuery({
    queryKey: ['trainer-forks', trainer?.id],
    queryFn: () => getTrainerForks(trainer!.id),
    enabled: !!trainer?.id,
  })

  const { data: favoritesData } = useQuery({
    queryKey: ['trainer-favorites', trainer?.id],
    queryFn: () => getTrainerFavorites(trainer!.id),
    enabled: !!trainer?.id,
  })

  const strings = stringsData?.strings ?? []
  const forks = forksData?.forks ?? []
  const favs = favoritesData?.favorites ?? []

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-4 md:px-6">
        <nav className="flex items-center gap-2 text-sm">
          <Link
            to="/discover"
            className="text-muted-foreground hover:text-foreground"
          >
            ← Discover
          </Link>
          {trainer ? (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-base font-semibold">
                {trainer.username}
              </span>
            </>
          ) : null}
        </nav>

        {trainer && !trainer.deactivatedAt ? (
          <Button variant="outline" size="sm" className="rounded-lg">
            <UsersIcon className="size-4" />
            Follow
          </Button>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-2xl bg-muted" />
            <div className="h-64 animate-pulse rounded-2xl bg-muted" />
          </div>
        ) : error || !trainer ? (
          <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Trainer not found.</p>
            <Link to="/discover">
              <Button variant="outline" className="mt-4 rounded-lg">
                Back to Discover
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Deactivated banner */}
            {trainer.deactivatedAt ? (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <UserRoundXIcon className="size-4 shrink-0" />
                This account has been deactivated.
              </div>
            ) : null}

            {/* Profile card */}
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
              <div className="p-6">
                <div className="flex gap-4">
                  {/* Left: avatar + info */}
                  <div className="flex items-start gap-4">
                    <Avatar size="lg" className="size-16 text-4xl shrink-0">
                      {trainer.avatarUrl ? (
                        <AvatarImage src={trainer.avatarUrl} />
                      ) : null}
                      <AvatarFallback>
                        {trainer.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-2">
                      <h1 className="text-2xl font-bold">{trainer.username}</h1>
                      <div className="flex flex-wrap items-center gap-2">
                        {trainer.team ? (
                          <Badge
                            className={`rounded-full border-0 gap-1.5 ${teamBadgeClass[trainer.team]}`}
                          >
                            <span
                              className={`size-2.5 rounded-full ${teamDotClass[trainer.team]}`}
                            />
                            {teamLabels[trainer.team]}
                          </Badge>
                        ) : null}
                        {trainer.level ? (
                          <Badge variant="outline" className="rounded-full">
                            Lv. {trainer.level}
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="rounded-full">
                          Joined{' '}
                          {monthFormatter.format(new Date(trainer.createdAt))}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat boxes row */}
              <div className="border-t border-border/60 p-6">
                <div className="flex gap-3 lg:justify-start">
                  {[
                    { label: 'Strings', value: trainer.stringCount },
                    { label: 'Saves', value: trainer.favoriteCount },
                    { label: 'Forks', value: trainer.forkCount },
                    { label: 'Followers', value: trainer.followerCount },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex min-w-28 flex-col items-center rounded-xl border border-border/60 px-4 py-3"
                    >
                      <span className="text-2xl font-bold">{stat.value}</span>
                      <span className="text-xs text-muted-foreground">
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-t border-border/60 px-6 pt-4">
                {(
                  [
                    {
                      key: 'strings',
                      label: 'Strings',
                      count: trainer.stringCount,
                    },
                    {
                      key: 'forks',
                      label: 'Forks',
                      count: trainer.forkCount,
                    },
                    {
                      key: 'favorites',
                      label: 'Favorites',
                      count: trainer.favoriteCount,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`mr-6 pb-3 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'border-b-2 border-foreground text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>

            <section className="space-y-4">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Top Strings
              </h2>

              <div>
                {activeTab === 'strings' ? (
                  strings.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
                      {strings.map((card) => (
                        <QueryCard key={card.id} card={card} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No public strings yet.
                    </p>
                  )
                ) : activeTab === 'forks' ? (
                  forks.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
                      {forks.map((card) => (
                        <QueryCard key={card.id} card={card} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No public forks yet.
                    </p>
                  )
                ) : favs.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
                    {favs.map((card) => (
                      <QueryCard key={card.id} card={card} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No favorited strings yet.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
