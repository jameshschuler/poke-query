import { useAuth } from '@authabase/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  CopyIcon,
  GitForkIcon,
  HeartIcon,
  Loader2Icon,
  ShareIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { PageHeader } from '#/components/page-header'
import { AppSidebar } from '#/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '#/components/ui/sidebar'
import { OfficialTrainerBadge } from '#/components/official-trainer-badge'
import {
  ApiRequestError,
  copyQuery,
  favoriteQuery,
  forkQuery,
  getMyFavoriteIds,
  getQueryById,
  unfavoriteQuery,
} from '#/lib/poke-query-api'
import { getMutationErrorMessage } from '#/lib/mutation-toast'
import { formatCompactNumber, formatFullNumber } from '#/lib/utils'

export const Route = createFileRoute('/queries/$queryId')({
  ssr: false,
  component: QueryDetailPage,
})

const tagLabels: Record<string, string> = {
  pvp: 'PvP',
  raid: 'Raid',
  'high-iv': 'IV Hunt',
  'exclusion-filter': 'Utility',
  'daily-catch': 'Community Day',
  'legacy-moves': 'Collection',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function QueryDetailPage() {
  const { queryId } = Route.useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    data: query,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['query', queryId],
    queryFn: () => getQueryById(queryId),
  })

  const { data: myFavoriteIds } = useQuery({
    queryKey: ['my-favorite-ids'],
    queryFn: getMyFavoriteIds,
    enabled: Boolean(user),
    staleTime: 60_000,
  })

  const isFavorited = myFavoriteIds?.favoriteQueryIds.includes(queryId) ?? false
  const canForkQuery =
    Boolean(user) && (!query?.creator || query.creator.id !== user?.id)
  const [copyCountDelta, setCopyCountDelta] = useState(0)
  const [isCopyPending, setIsCopyPending] = useState(false)

  useEffect(() => {
    setCopyCountDelta(0)
    setIsCopyPending(false)
  }, [query?.id, query?.copyCount])

  const displayCopyCount = query ? query.copyCount + copyCountDelta : 0

  const favoriteMutation = useMutation({
    mutationFn: favoriteQuery,
    onSuccess: async () => {
      toast.success('Saved to favorites.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-favorite-ids'] }),
        queryClient.invalidateQueries({ queryKey: ['my-favorites-page'] }),
        queryClient.invalidateQueries({ queryKey: ['community-discover'] }),
        queryClient.invalidateQueries({ queryKey: ['query', queryId] }),
      ])
    },
    onError: (mutationError: unknown) => {
      toast.error(
        getMutationErrorMessage(mutationError, 'Could not save favorite.'),
      )
    },
  })

  const unfavoriteMutation = useMutation({
    mutationFn: unfavoriteQuery,
    onSuccess: async () => {
      toast.success('Removed from favorites.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-favorite-ids'] }),
        queryClient.invalidateQueries({ queryKey: ['my-favorites-page'] }),
        queryClient.invalidateQueries({ queryKey: ['community-discover'] }),
        queryClient.invalidateQueries({ queryKey: ['query', queryId] }),
      ])
    },
    onError: (mutationError: unknown) => {
      toast.error(
        getMutationErrorMessage(mutationError, 'Could not remove favorite.'),
      )
    },
  })

  const forkMutation = useMutation({
    mutationFn: forkQuery,
    onSuccess: async (result) => {
      toast.success('Fork saved to your library.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-forks'] }),
        queryClient.invalidateQueries({ queryKey: ['my-queries'] }),
      ])
      await navigate({
        to: '/forks/$queryId',
        params: { queryId: result.id },
      })
    },
    onError: (mutationError: unknown) => {
      if (
        mutationError instanceof ApiRequestError &&
        mutationError.status === 404
      ) {
        toast.error(
          'This string can’t be forked because the original is private or no longer exists.',
        )
        return
      }

      toast.error(
        getMutationErrorMessage(mutationError, 'Could not fork string.'),
      )
    },
  })

  function handleCopy() {
    if (!query || isCopyPending) return

    const previousCopyCount = query.copyCount + copyCountDelta
    const optimisticCopyCount = previousCopyCount + 1

    setIsCopyPending(true)

    void navigator.clipboard
      .writeText(query.query)
      .then(async () => {
        setCopyCountDelta((current) => current + 1)
        queryClient.setQueryData(['query', query.id], {
          ...query,
          copyCount: optimisticCopyCount,
        })

        toast.success('Copied to clipboard!')

        try {
          await copyQuery(query.id)
          await queryClient.invalidateQueries({ queryKey: ['query', query.id] })
        } catch {
          setCopyCountDelta((current) => Math.max(0, current - 1))
          queryClient.setQueryData(['query', query.id], {
            ...query,
            copyCount: previousCopyCount,
          })
        }
      })
      .catch(() => {
        toast.error('Could not copy string.')
      })
      .finally(() => {
        setIsCopyPending(false)
      })
  }

  const pageContent = (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader
        title={query?.title}
        actions={
          query ? (
            <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="rounded-lg"
                      aria-label="Share"
                      onClick={() => {
                        void navigator.clipboard.writeText(window.location.href)
                        toast.success('Link copied!')
                      }}
                    >
                      <ShareIcon className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent>Share</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="rounded-lg"
                      aria-label="Copy"
                      disabled={isCopyPending}
                      onClick={handleCopy}
                    >
                      {isCopyPending ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        <CopyIcon className="size-4" />
                      )}
                    </Button>
                  }
                />
                <TooltipContent>Copy</TooltipContent>
              </Tooltip>
              {canForkQuery ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className={`rounded-lg ${
                          isFavorited
                            ? 'border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-700/40 dark:hover:bg-rose-900/20'
                            : ''
                        }`}
                        aria-label={isFavorited ? 'Favorited' : 'Favorite'}
                        disabled={
                          favoriteMutation.isPending ||
                          unfavoriteMutation.isPending
                        }
                        onClick={() => {
                          if (isFavorited) {
                            unfavoriteMutation.mutate(query.id)
                            return
                          }

                          favoriteMutation.mutate(query.id)
                        }}
                      >
                        <HeartIcon
                          className={`size-4 ${
                            isFavorited ? 'fill-current' : ''
                          }`}
                        />
                      </Button>
                    }
                  />
                  <TooltipContent>
                    {isFavorited ? 'Favorited' : 'Favorite'}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {user ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="rounded-lg"
                        disabled={forkMutation.isPending}
                        aria-label="Fork"
                        onClick={() => forkMutation.mutate(query.id)}
                      >
                        {forkMutation.isPending ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <GitForkIcon className="size-4" />
                        )}
                      </Button>
                    }
                  />
                  <TooltipContent>Fork</TooltipContent>
                </Tooltip>
              ) : null}
            </>
          ) : undefined
        }
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 md:px-8 lg:px-10">
        <div className="space-y-8">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              to="/discover"
              className="hover:text-foreground hover:underline"
            >
              Discover
            </Link>
            <span>/</span>
            <span className="max-w-56 truncate text-foreground">
              {query?.title ?? 'Query details'}
            </span>
          </nav>

          {isLoading ? (
            <div className="space-y-4">
              <div className="h-7 w-1/2 animate-pulse rounded-lg bg-muted" />
              <div className="h-4 w-1/3 animate-pulse rounded-lg bg-muted" />
              <div className="h-32 animate-pulse rounded-2xl bg-muted" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                This search string could not be found or is not public.
              </p>
              <Link to="/discover">
                <Button variant="outline" className="mt-4 rounded-lg">
                  Back to Discover
                </Button>
              </Link>
            </div>
          ) : query ? (
            <div className="space-y-7">
              {/* Meta row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {query.autoTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="border-border/70 bg-card text-muted-foreground"
                    >
                      {tagLabels[tag] ?? tag}
                    </Badge>
                  ))}
                  <Badge variant="outline">
                    {query.isPublic ? 'Public' : 'Private'}
                  </Badge>
                  <Badge variant="outline">v1</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Updated {relativeTime(query.updatedAt)}
                  {query.creator ? (
                    <>
                      {' '}
                      by{' '}
                      <span className="inline-flex items-center gap-1.5 align-middle">
                        <Link
                          to="/trainers/$username"
                          params={{ username: query.creator.username }}
                          className="hover:underline"
                        >
                          {query.creator.displayName}
                        </Link>
                        <OfficialTrainerBadge
                          username={query.creator.username}
                        />
                      </span>
                    </>
                  ) : null}
                </p>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-card px-4 py-5">
                  <span className="text-xs text-muted-foreground">
                    Favorited
                  </span>
                  <span
                    className="flex items-center gap-2 text-2xl font-bold sm:text-3xl"
                    title={formatFullNumber(query.favoriteCount)}
                  >
                    <HeartIcon className="size-5 text-muted-foreground" />
                    {formatCompactNumber(query.favoriteCount)}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-card px-4 py-5">
                  <span className="text-xs text-muted-foreground">Copies</span>
                  <span
                    className="flex items-center gap-2 text-2xl font-bold sm:text-3xl"
                    title={formatFullNumber(displayCopyCount)}
                  >
                    <CopyIcon className="size-5 text-muted-foreground" />
                    {formatCompactNumber(displayCopyCount)}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-card px-4 py-5">
                  <span className="text-xs text-muted-foreground">Forks</span>
                  <span
                    className="flex items-center gap-2 text-2xl font-bold sm:text-3xl"
                    title={formatFullNumber(query.forkCount)}
                  >
                    <GitForkIcon className="size-5 text-muted-foreground" />
                    {formatCompactNumber(query.forkCount)}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-card px-4 py-5">
                  <span className="text-xs text-muted-foreground">Version</span>
                  <span className="text-2xl font-bold sm:text-3xl">v1</span>
                </div>
              </div>

              {/* Search string */}
              <div className="rounded-xl border border-border/60 bg-card p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Search string
                </p>
                <div className="rounded-lg border border-border/60 bg-background px-4 py-3">
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm">
                    {query.query}
                  </pre>
                </div>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="mt-5 rounded-lg"
                        aria-label="Copy string"
                        disabled={isCopyPending}
                        onClick={handleCopy}
                      >
                        {isCopyPending ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <CopyIcon className="size-4" />
                        )}
                      </Button>
                    }
                  />
                  <TooltipContent>Copy string</TooltipContent>
                </Tooltip>
              </div>

              {/* About */}
              {query.description ? (
                <div className="rounded-xl border border-border/60 bg-card p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    About
                  </p>
                  <p className="text-sm leading-relaxed">{query.description}</p>
                </div>
              ) : null}

              {/* Forks */}
              {query.forkCount > 0 ? (
                <div className="rounded-xl border border-border/60 bg-card p-5">
                  <p
                    className="mb-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                    title={formatFullNumber(query.forkCount)}
                  >
                    Forks ({formatCompactNumber(query.forkCount)})
                  </p>
                  <div className="space-y-0">
                    {query.forks.map((fork, index) => (
                      <div key={fork.id}>
                        {index > 0 ? <Separator className="my-1" /> : null}
                        <div className="flex items-center gap-3 py-3">
                          <Avatar size="sm">
                            {fork.creator?.avatarUrl ? (
                              <AvatarImage src={fork.creator.avatarUrl} />
                            ) : null}
                            <AvatarFallback className="text-xs">
                              {(fork.creator?.username ?? '?')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {fork.creator?.username ?? 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {relativeTime(fork.createdAt)}
                            </p>
                          </div>
                          <Link
                            to="/queries/$queryId"
                            params={{ queryId: fork.id }}
                            className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
                          >
                            View →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )

  if (!user) {
    return pageContent
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{pageContent}</SidebarInset>
    </SidebarProvider>
  )
}
