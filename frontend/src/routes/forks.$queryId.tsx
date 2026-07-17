import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { Edit3Icon } from 'lucide-react'
import { toast } from 'sonner'

import { PageShell } from '#/components/page-shell'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { OfficialTrainerBadge } from '#/components/official-trainer-badge'
import {
  ApiRequestError,
  getMyForks,
  syncForkQuery,
} from '#/lib/poke-query-api'
import { getMutationErrorMessage } from '#/lib/mutation-toast'
import { requireAuthenticated } from '#/lib/route-auth'

export const Route = createFileRoute('/forks/$queryId')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/forks')
  },
  component: ForkDetailPage,
})

function renderRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.max(0, Math.floor(diff / 1_000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function getSyncBadgeClasses(syncStatus: 'up-to-date' | 'behind' | 'orphaned') {
  if (syncStatus === 'behind') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  }

  if (syncStatus === 'orphaned') {
    return 'border-destructive/40 bg-destructive/10 text-destructive'
  }

  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
}

function formatSyncLabel(syncStatus: 'up-to-date' | 'behind' | 'orphaned') {
  if (syncStatus === 'up-to-date') return 'Up to date'
  if (syncStatus === 'behind') return 'Needs sync'
  return 'Source removed'
}

function ForkDetailPage() {
  const { queryId } = Route.useParams()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  if (pathname !== `/forks/${queryId}`) {
    return <Outlet />
  }

  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-forks'],
    queryFn: getMyForks,
  })

  const fork = data?.forks.find((item) => item.id === queryId) ?? null

  const syncMutation = useMutation({
    mutationFn: syncForkQuery,
    onSuccess: async () => {
      toast.success('Fork updated from the original search string.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-forks'] }),
        queryClient.invalidateQueries({ queryKey: ['my-queries'] }),
        queryClient.invalidateQueries({ queryKey: ['query', queryId] }),
      ])
    },
    onError: (mutationError: unknown) => {
      if (
        mutationError instanceof ApiRequestError &&
        mutationError.status === 409
      ) {
        toast.error(mutationError.message)
        return
      }

      if (
        mutationError instanceof ApiRequestError &&
        mutationError.status === 404
      ) {
        toast.error('This fork could not be found anymore.')
        return
      }

      toast.error(
        getMutationErrorMessage(mutationError, 'Could not sync fork.'),
      )
    },
  })

  return (
    <PageShell
      title={fork?.title ?? 'Fork details'}
      subtitle="Review source, sync status, and current string before editing or publishing."
      contentHeaderVariant="floating"
      showSidebar
      showHeaderSearch={false}
    >
      <div className="space-y-7">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/forks" className="hover:text-foreground hover:underline">
            Forks
          </Link>
          <span>/</span>
          <span className="max-w-56 truncate text-foreground">
            {fork?.title ?? 'Details'}
          </span>
        </nav>

        {isLoading ? (
          <div className="rounded-2xl border border-border/70 bg-card/95 p-6 text-sm text-muted-foreground">
            Loading fork details...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-border/70 bg-card/95 p-6 text-sm text-muted-foreground">
            Could not load this fork right now.
          </div>
        ) : !fork ? (
          <div className="space-y-5 rounded-2xl border border-border/70 bg-card/95 p-6 text-sm text-muted-foreground">
            <p>This fork was not found in your library.</p>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => navigate({ to: '/forks' })}
            >
              Back to Forks
            </Button>
          </div>
        ) : (
          <div className="space-y-7">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                size="sm"
                className={getSyncBadgeClasses(fork.syncStatus)}
              >
                {formatSyncLabel(fork.syncStatus)}
              </Badge>
              <Badge variant="outline" size="sm">
                Forked {renderRelativeTime(fork.createdAt)}
              </Badge>
              <Badge variant="outline" size="sm">
                Updated {renderRelativeTime(fork.updatedAt)}
              </Badge>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-card/95 p-4 dark:bg-card">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Your fork
                </p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm text-foreground">
                  {fork.query}
                </pre>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/95 p-4 dark:bg-card">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Original snapshot
                </p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm text-foreground">
                  {fork.originalQuerySnapshot ?? 'No snapshot saved.'}
                </pre>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/95 p-5 dark:bg-card">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Source details
              </p>
              {fork.sourceQuery ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {fork.sourceQuery.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {fork.sourceQuery.creator?.displayName ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span>By {fork.sourceQuery.creator.displayName}</span>
                          <OfficialTrainerBadge
                            username={fork.sourceQuery.creator.username}
                          />
                        </span>
                      ) : (
                        'Creator unavailable'
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Source updated{' '}
                      {renderRelativeTime(fork.sourceQuery.updatedAt)}
                    </p>
                  </div>

                  <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-border/70 bg-background/80 px-4 py-3 font-mono text-sm text-foreground dark:bg-background">
                    {fork.sourceQuery.query}
                  </pre>

                  {fork.sourceQuery.isPublic ? (
                    <Link
                      to="/queries/$queryId"
                      params={{ queryId: fork.sourceQuery.id }}
                      className="inline-flex"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                      >
                        View source query
                      </Button>
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      This original search string is no longer public.
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  The original search string is no longer available. You can
                  still edit or publish this fork on its own.
                </p>
              )}
            </div>

            <div className="flex gap-3 border-t border-border/60 pt-5 max-sm:flex-col sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg max-sm:w-full"
                onClick={() => navigate({ to: '/forks' })}
              >
                Back to Forks
              </Button>
              {fork.syncStatus === 'behind' ? (
                <Button
                  type="button"
                  className="max-sm:w-full"
                  disabled={syncMutation.isPending}
                  onClick={() => syncMutation.mutate(fork.id)}
                >
                  {syncMutation.isPending ? 'Syncing...' : 'Sync from source'}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="rounded-lg max-sm:w-full"
                onClick={() =>
                  navigate({
                    to: '/forks/$queryId/edit',
                    params: { queryId: fork.id },
                  })
                }
              >
                <Edit3Icon className="size-4" />
                Edit fork
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
