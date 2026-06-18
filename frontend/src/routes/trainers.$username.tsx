import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '@authabase/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CopyIcon, UserRoundXIcon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  getTrainerByUsername,
  getTrainerStrings,
  getTrainerForks,
  getTrainerFavorites,
  getTrainerFollowers,
  followTrainer,
  unfollowTrainer,
  ApiRequestError,
} from '#/lib/poke-query-api'
import { useState } from 'react'
import { SearchStringCard } from '#/components/search-string-card'
import { PageHeader } from '#/components/page-header'

export const Route = createFileRoute('/trainers/$username')({
  component: TrainerProfilePage,
})

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

function TrainerProfilePage() {
  const { username } = Route.useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()

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

  const { data: followersData } = useQuery({
    queryKey: ['trainer-followers', trainer?.id],
    queryFn: () => getTrainerFollowers(trainer!.id),
    enabled: !!trainer?.id,
  })

  const strings = stringsData?.strings ?? []
  const forks = forksData?.forks ?? []
  const favs = favoritesData?.favorites ?? []
  const followers = followersData?.followers ?? []
  const isFollowing = Boolean(
    user?.id && followers.some((f) => f.id === user.id),
  )

  const followMutation = useMutation({
    mutationFn: followTrainer,
    onSuccess: async () => {
      toast.success('Now following trainer.')
      await queryClient.invalidateQueries({
        queryKey: ['trainer-followers', trainer?.id],
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiRequestError && error.status === 403) {
        toast.error('You cannot follow a private account.')
        return
      }

      toast.error('Could not follow trainer.')
    },
  })

  const unfollowMutation = useMutation({
    mutationFn: unfollowTrainer,
    onSuccess: async () => {
      toast.success('Unfollowed trainer.')
      await queryClient.invalidateQueries({
        queryKey: ['trainer-followers', trainer?.id],
      })
    },
    onError: () => {
      toast.error('Could not unfollow trainer.')
    },
  })

  const isFollowPending = followMutation.isPending || unfollowMutation.isPending

  const canShowFollowAction =
    trainer &&
    trainer.isProfilePublic &&
    !trainer.deactivatedAt &&
    user &&
    trainer.id !== user.id

  function handleFollowClick() {
    if (!trainer || isFollowPending) {
      return
    }

    if (isFollowing) {
      unfollowMutation.mutate(trainer.id)
      return
    }

    followMutation.mutate(trainer.id)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader
        title={trainer?.username}
        actions={
          canShowFollowAction ? (
            <Button
              variant={isFollowing ? 'default' : 'outline'}
              size="sm"
              className="rounded-lg"
              onClick={handleFollowClick}
              disabled={isFollowPending}
            >
              <UsersIcon className="size-4" />
              {isFollowPending
                ? 'Saving...'
                : isFollowing
                  ? 'Following'
                  : 'Follow'}
            </Button>
          ) : undefined
        }
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-6 md:px-8 md:py-8 lg:px-10">
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
              <div className="p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row">
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
                      <h1 className="break-words text-xl font-bold sm:text-2xl">
                        {trainer.username}
                      </h1>
                      <div className="flex flex-wrap items-center gap-2">
                        {trainer.isProfilePublic && trainer.team ? (
                          <Badge
                            className={`rounded-full border-0 gap-1.5 ${teamBadgeClass[trainer.team]}`}
                          >
                            <span
                              className={`size-2.5 rounded-full ${teamDotClass[trainer.team]}`}
                            />
                            {teamLabels[trainer.team]}
                          </Badge>
                        ) : null}
                        {trainer.isProfilePublic && trainer.level ? (
                          <Badge variant="outline" className="rounded-full">
                            Lv. {trainer.level}
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="rounded-full">
                          Joined{' '}
                          {monthFormatter.format(new Date(trainer.createdAt))}
                        </Badge>
                      </div>
                      {trainer.isProfilePublic && trainer.trainerCode ? (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="select-all rounded bg-muted px-2 py-1 font-mono text-sm sm:text-base">
                            {trainer.trainerCode}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => {
                              void navigator.clipboard.writeText(
                                trainer.trainerCode!,
                              )
                              toast.success('Trainer code copied!')
                            }}
                            aria-label="Copy trainer code"
                          >
                            <CopyIcon className="size-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat boxes row */}
              <div className="border-t border-border/60 p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-3 lg:flex lg:justify-start">
                  {[
                    { label: 'Strings', value: trainer.stringCount },
                    { label: 'Saves', value: trainer.favoriteCount },
                    { label: 'Forks', value: trainer.forkCount },
                    { label: 'Followers', value: followers.length },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex min-h-20 flex-col items-center rounded-xl border border-border/60 px-3 py-3 sm:min-w-28 sm:px-4"
                    >
                      <span className="text-xl font-bold sm:text-2xl">
                        {stat.value}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs and content */}
              {trainer.isProfilePublic ? (
                <>
                  <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-border/60 px-4 pt-4 sm:gap-4 sm:px-6 sm:pt-6">
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
                        className={`pb-3 text-sm font-medium transition-colors ${
                          activeTab === tab.key
                            ? 'border-b-2 border-foreground text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        style={{ minWidth: 90 }}
                      >
                        {tab.label}{' '}
                        <span className="ml-0.5">({tab.count})</span>
                      </button>
                    ))}
                  </div>
                  <section className="mt-2 space-y-2 p-4 sm:space-y-4 sm:p-6">
                    <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                      Top Strings
                    </h2>
                    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
                      {activeTab === 'strings' ? (
                        strings.length > 0 ? (
                          strings.map((card) => (
                            <SearchStringCard
                              key={card.id}
                              card={card}
                              variant="trainer"
                              isAuthenticated={Boolean(user)}
                            />
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground col-span-full">
                            No public strings yet.
                          </p>
                        )
                      ) : activeTab === 'forks' ? (
                        forks.length > 0 ? (
                          forks.map((card) => (
                            <SearchStringCard
                              key={card.id}
                              card={card}
                              variant="trainer"
                              isAuthenticated={Boolean(user)}
                            />
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground col-span-full">
                            No public forks yet.
                          </p>
                        )
                      ) : favs.length > 0 ? (
                        favs.map((card) => (
                          <SearchStringCard
                            key={card.id}
                            card={card}
                            variant="trainer"
                            isAuthenticated={Boolean(user)}
                          />
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground col-span-full">
                          No favorited strings yet.
                        </p>
                      )}
                    </div>
                  </section>
                </>
              ) : (
                <div className="border-t border-border/60 px-6 py-12 text-center text-muted-foreground text-base font-medium">
                  Trainer Profile is private
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
