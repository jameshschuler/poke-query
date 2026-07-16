import { useAuth } from '@authabase/react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  BellIcon,
  GitForkIcon,
  HeartIcon,
  Loader2Icon,
  PlusIcon,
  SparklesIcon,
  UserPlusIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { PageShell } from '#/components/page-shell'
import {
  ApiRequestError,
  getMe,
  getMyForks,
  getMyQueries,
  getNotifications,
  getUnreadNotificationCount,
  logout,
} from '#/lib/poke-query-api'
import type { AppNotification } from '#/lib/poke-query-api'
import { OfficialTrainerBadge } from '#/components/official-trainer-badge'
import { requireAuthenticated, setCachedUser } from '#/lib/route-auth'
import { formatCompactNumber, formatFullNumber } from '#/lib/utils'

export const Route = createFileRoute('/dashboard')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/dashboard')
  },
  component: DashboardRoute,
})

function DashboardRoute() {
  const { user, isLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const {
    data: me,
    isLoading: isMeLoading,
    error: meError,
  } = useQuery({
    queryKey: ['dashboard', 'me'],
    queryFn: getMe,
  })

  const {
    data: myQueriesData,
    isLoading: isQueriesLoading,
    error: queriesError,
  } = useQuery({
    queryKey: ['dashboard', 'queries'],
    queryFn: getMyQueries,
  })

  const {
    data: myForksData,
    isLoading: isForksLoading,
    error: forksError,
  } = useQuery({
    queryKey: ['dashboard', 'forks'],
    queryFn: getMyForks,
  })

  const {
    data: notificationsPage,
    isLoading: isActivityLoading,
    error: activityError,
  } = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => getNotifications({ limit: 5, offset: 0 }),
    staleTime: 30_000,
  })

  const { data: unreadCountData } = useQuery({
    queryKey: ['dashboard', 'activity', 'unread-count'],
    queryFn: getUnreadNotificationCount,
    staleTime: 15_000,
    refetchInterval: 15_000,
  })

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    [],
  )

  const queries = myQueriesData?.queries ?? []
  const myForks = myForksData?.forks ?? []
  const notifications = notificationsPage?.notifications ?? []
  const unreadCount = unreadCountData?.unreadCount ?? 0
  const latestQuery = queries[0] ?? null
  const latestDraft = queries.find((query) => !query.isPublic) ?? null
  const recentDrafts = queries.filter((query) => !query.isPublic).slice(0, 3)
  const isSetupComplete = me?.profileCompleted ?? false
  const setupChecklist = [
    {
      label: 'Trainer details are filled out',
      complete: Boolean(me && me.team && me.level !== null && me.trainerCode),
    },
    {
      label: 'Profile visibility is chosen',
      complete: Boolean(me && me.isProfilePublic),
    },
    {
      label: 'Avatar or Pok\u00e9mon GO username is set',
      complete: Boolean(me && (me.avatarUrl || me.pogoUsername)),
    },
  ]

  const activityMetaByType: Record<
    AppNotification['eventType'],
    { label: string; icon: typeof HeartIcon }
  > = {
    new_follower: {
      label: 'New follower',
      icon: UserPlusIcon,
    },
    query_forked: {
      label: 'Query forked',
      icon: GitForkIcon,
    },
    query_favorited: {
      label: 'Query favorited',
      icon: HeartIcon,
    },
  }

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      try {
        await logout()
      } catch (error) {
        if (!(error instanceof ApiRequestError && error.status === 401)) {
          // Best effort: continue clearing client auth session.
        }
      }

      setCachedUser(null)
      await signOut()
      void navigate({ to: '/login', replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (isLoading || !user) {
    return null
  }

  const isBusy =
    isMeLoading || isQueriesLoading || isForksLoading || isActivityLoading
  const hasLatestQuery = queries.length > 0

  return (
    <PageShell
      title="Dashboard"
      subtitle="Finish onboarding, create your first search string, and keep an eye on recent activity."
      contentHeaderVariant="floating"
      showSidebar
      showHeaderSearch={false}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Search strings',
              value: queries.length,
              hint: 'Published and draft strings',
            },
            {
              label: 'Favorites',
              value: me?.favoriteCount ?? 0,
              hint: 'Saved strings you can revisit',
            },
            {
              label: 'Followers',
              value: me?.followerCount ?? 0,
              hint: 'People watching your profile',
            },
            {
              label: 'Forks',
              value: myForks.length,
              hint: 'Forked copies in your library',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm"
            >
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p
                className="mt-2 text-2xl font-semibold tracking-tight"
                title={formatFullNumber(stat.value)}
              >
                {formatCompactNumber(stat.value)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-5">
            <section className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Badge
                    variant={isSetupComplete ? 'secondary' : 'outline'}
                    size="lg"
                  >
                    {isSetupComplete ? (
                      <CheckCircle2Icon />
                    ) : (
                      <AlertCircleIcon />
                    )}
                    {isSetupComplete ? 'Profile ready' : 'Finish setup'}
                  </Badge>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {isSetupComplete
                      ? 'Your account is ready to publish.'
                      : 'Finish setting up your account.'}
                  </h2>
                  <p className="max-w-xl text-sm text-muted-foreground">
                    {isSetupComplete
                      ? 'You can keep refining your profile, but the basics are in place and your search strings are ready to share.'
                      : 'Complete your trainer profile so people know who is behind your search strings and can trust the work you share.'}
                  </p>
                </div>

                <Button
                  variant="outline"
                  nativeButton={false}
                  className="rounded-xl"
                  render={<Link to="/account" />}
                >
                  Review profile
                  <ArrowRightIcon />
                </Button>
              </div>

              <div className="mt-5 grid gap-2">
                {setupChecklist.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2"
                  >
                    <span
                      className={`flex size-5 items-center justify-center rounded-full ${item.complete ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}
                    >
                      {item.complete ? (
                        <CheckCircle2Icon className="size-3.5" />
                      ) : (
                        <AlertCircleIcon className="size-3.5" />
                      )}
                    </span>
                    <span className="text-sm text-foreground">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="outline" size="lg">
                    <SparklesIcon />
                    Search strings
                  </Badge>
                  <h2 className="mt-3 text-lg font-semibold tracking-tight">
                    {queries.length === 0
                      ? 'Create your first search string.'
                      : 'Create another search string.'}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    {queries.length === 0
                      ? 'Start with a private draft or publish a new community-ready string from your library.'
                      : `You already have ${queries.length} string${queries.length === 1 ? '' : 's'} in your library. Keep the momentum going with a new build.`}
                  </p>
                </div>

                <Button
                  nativeButton={false}
                  className="rounded-xl"
                  render={<Link to="/library/new" />}
                >
                  <PlusIcon />
                  Create string
                </Button>
              </div>

              {hasLatestQuery ? (
                <div className="mt-5 rounded-xl border border-border/60 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Latest string
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {latestQuery.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Updated most recently, so it is a good starting point for
                    your next edit.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      className="rounded-lg"
                      render={<Link to="/library" />}
                    >
                      Open library
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      nativeButton={false}
                      className="rounded-lg"
                      render={<Link to="/library/new" />}
                    >
                      Start fresh
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="outline" size="lg">
                    <ArrowRightIcon />
                    Continue editing
                  </Badge>
                  <h2 className="mt-3 text-lg font-semibold tracking-tight">
                    {latestDraft
                      ? 'Pick up your latest draft.'
                      : 'No drafts yet. Start one now.'}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    {latestDraft
                      ? 'Jump back into the draft you were most recently shaping before publishing or sharing it.'
                      : 'Drafts are the fastest way to experiment before you decide whether to publish a string.'}
                  </p>
                </div>

                <Button
                  variant={latestDraft ? 'outline' : 'default'}
                  nativeButton={false}
                  className="rounded-xl"
                  render={
                    <Link
                      to={
                        latestDraft ? '/library/$queryId/edit' : '/library/new'
                      }
                      params={
                        latestDraft ? { queryId: latestDraft.id } : undefined
                      }
                    />
                  }
                >
                  {latestDraft ? 'Open draft' : 'Create draft'}
                  <ArrowRightIcon />
                </Button>
              </div>

              {latestDraft ? (
                <div className="mt-5 rounded-xl border border-border/60 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Most recent draft
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {latestDraft.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Updated{' '}
                    {dateFormatter.format(new Date(latestDraft.updatedAt))}.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      className="rounded-lg"
                      render={
                        <Link
                          to="/library/$queryId/edit"
                          params={{ queryId: latestDraft.id }}
                        />
                      }
                    >
                      Resume draft
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      nativeButton={false}
                      className="rounded-lg"
                      render={<Link to="/library" />}
                    >
                      Open library
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                  Create a draft first, then this section will bring you back
                  here quickly.
                </div>
              )}

              {recentDrafts.length > 0 ? (
                <div className="mt-4 rounded-xl border border-border/60 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Recent drafts
                  </p>
                  <div className="mt-3 space-y-2">
                    {recentDrafts.map((draft) => (
                      <div
                        key={draft.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/70 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {draft.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Updated {relativeTime(draft.updatedAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          nativeButton={false}
                          className="rounded-lg"
                          render={
                            <Link
                              to="/library/$queryId/edit"
                              params={{ queryId: draft.id }}
                            />
                          }
                        >
                          Resume
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          <section className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm xl:col-span-7 xl:h-[42rem] xl:min-h-[42rem] xl:max-h-[42rem] xl:flex xl:flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" size="lg">
                    <BellIcon />
                    Recent activity
                  </Badge>
                  <Badge
                    variant={unreadCount > 0 ? 'default' : 'outline'}
                    size="sm"
                  >
                    Unread: {unreadCount}
                  </Badge>
                </div>
                <h2 className="mt-3 text-lg font-semibold tracking-tight">
                  Activity from your network.
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Follow new followers, forks, and favorites without jumping to
                  a separate page.
                </p>
              </div>

              <Button
                variant="outline"
                nativeButton={false}
                className="rounded-xl"
                render={<Link to="/notifications" />}
              >
                View all
                <ArrowRightIcon />
              </Button>
            </div>

            <div className="mt-5 space-y-3 xl:flex-1 xl:overflow-y-auto xl:pr-1">
              {isBusy ? (
                <div className="rounded-2xl border border-border/70 bg-background/60 p-6 text-sm text-muted-foreground">
                  <Loader2Icon className="mr-2 inline-block size-4 animate-spin" />
                  Loading dashboard data...
                </div>
              ) : meError || queriesError || forksError || activityError ? (
                <div className="rounded-2xl border border-border/70 bg-background/60 p-6 text-sm text-muted-foreground">
                  The dashboard could not load completely right now.
                </div>
              ) : notifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-8 text-center">
                  <h3 className="text-base font-semibold">
                    No recent activity yet
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Once people follow, favorite, or fork your strings, the feed
                    will fill in here.
                  </p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const meta = activityMetaByType[notification.eventType]
                  const Icon = meta.icon

                  return (
                    <article
                      key={notification.id}
                      className={`rounded-2xl border p-4 ${notification.isRead ? 'border-border/70 bg-background/60' : 'border-primary/30 bg-primary/5'}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar size="sm" className="mt-0.5">
                          <AvatarImage
                            src={notification.actor?.avatarUrl ?? undefined}
                            alt={
                              notification.actor?.displayName ??
                              'Activity actor'
                            }
                          />
                          <AvatarFallback>
                            {(notification.actor?.displayName ?? 'A')
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" size="sm">
                              <Icon />
                              {meta.label}
                            </Badge>
                            {notification.isHighPriority ? (
                              <Badge variant="secondary" size="sm">
                                Priority
                              </Badge>
                            ) : null}
                            {!notification.isRead ? (
                              <Badge variant="default" size="sm">
                                New
                              </Badge>
                            ) : null}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {notification.title}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <span>
                                {notification.actor?.displayName ?? 'PokeQuery'}
                              </span>
                              <OfficialTrainerBadge
                                username={notification.actor?.username}
                              />
                            </span>
                            <span>•</span>
                            <span>
                              {dateFormatter.format(
                                new Date(notification.createdAt),
                              )}
                            </span>
                            <span>•</span>
                            <span>{relativeTime(notification.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/95 px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <span>Signed in as {me?.username ?? user.email ?? 'trainer'}</span>
          <button
            type="button"
            onClick={() => {
              void handleLogout()
            }}
            disabled={isLoggingOut}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </div>
    </PageShell>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)

  if (days < 30) {
    return `${days}d ago`
  }

  const months = Math.floor(days / 30)
  return `${months}mo ago`
}
