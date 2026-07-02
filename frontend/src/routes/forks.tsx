import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  Edit3Icon,
  Grid2x2Icon,
  Grid3x3Icon,
  GitForkIcon,
  ListIcon,
  Trash2Icon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { PageShell } from '#/components/page-shell'
import { QueryCardActions } from '#/components/query-card-actions'
import { QueryCardHeader } from '#/components/query-card-header'
import { TimestampTooltip } from '#/components/timestamp-tooltip'
import { QueryCreateDrawer } from '#/components/query-create-drawer'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import {
  deleteQuery,
  getMyForks,
  ApiRequestError,
  syncForkQuery,
  type ManagedForkQuery,
} from '#/lib/poke-query-api'
import { requireAuthenticated } from '#/lib/route-auth'
import { QueryTagBadges } from '../components/query-tag-badges'

type ForksSearch = {
  detail?: string
}

type VisibilityFilter = 'all' | 'draft' | 'public'
type SyncFilter = 'all' | 'up-to-date' | 'behind' | 'orphaned'
type LayoutMode = 'list' | 'grid-2' | 'grid-3'

const FORKS_LAYOUT_STORAGE_KEY = 'poke-query:forks-layout'

function isLayoutMode(value: string | null): value is LayoutMode {
  return value === 'list' || value === 'grid-2' || value === 'grid-3'
}

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

function getSyncBadgeClasses(syncStatus: ManagedForkQuery['syncStatus']) {
  if (syncStatus === 'behind') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  }

  if (syncStatus === 'orphaned') {
    return 'border-destructive/40 bg-destructive/10 text-destructive'
  }

  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
}

function formatSyncLabel(syncStatus: ManagedForkQuery['syncStatus']) {
  if (syncStatus === 'up-to-date') return 'Up to date'
  if (syncStatus === 'behind') return 'Needs sync'
  return 'Source removed'
}

export const Route = createFileRoute('/forks')({
  ssr: false,
  validateSearch: (search): ForksSearch => ({
    detail: typeof search.detail === 'string' ? search.detail : undefined,
  }),
  beforeLoad: async () => {
    await requireAuthenticated('/forks')
  },
  component: ForksPage,
})

function ForksPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const search = Route.useSearch()
  const [editingFork, setEditingFork] = useState<ManagedForkQuery | null>(null)
  const [forkToDelete, setForkToDelete] = useState<ManagedForkQuery | null>(
    null,
  )
  const [searchText, setSearchText] = useState('')
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>('all')
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('all')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    if (typeof window === 'undefined') {
      return 'grid-3'
    }

    const stored = window.localStorage.getItem(FORKS_LAYOUT_STORAGE_KEY)
    return isLayoutMode(stored) ? stored : 'grid-3'
  })

  useEffect(() => {
    window.localStorage.setItem(FORKS_LAYOUT_STORAGE_KEY, layoutMode)
  }, [layoutMode])

  const pendingDeleteTimeoutsRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    return () => {
      for (const timeoutId of pendingDeleteTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId)
      }
      pendingDeleteTimeoutsRef.current.clear()
    }
  }, [])

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-forks'],
    queryFn: getMyForks,
  })

  const syncMutation = useMutation({
    mutationFn: syncForkQuery,
    onSuccess: async (_, forkId) => {
      toast.success('Fork updated from the original search string.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-forks'] }),
        queryClient.invalidateQueries({ queryKey: ['my-queries'] }),
        queryClient.invalidateQueries({ queryKey: ['query', forkId] }),
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

      toast.error('Could not sync fork.')
    },
  })

  const forks = data?.forks ?? []
  const selectedFork = search.detail
    ? (forks.find((fork) => fork.id === search.detail) ?? null)
    : null
  const draftCount = forks.filter((fork) => !fork.isPublic).length
  const needSyncCount = forks.filter(
    (fork) => fork.syncStatus === 'behind',
  ).length
  const orphanedCount = forks.filter(
    (fork) => fork.syncStatus === 'orphaned',
  ).length
  const lastEdited = forks[0]?.updatedAt ?? null
  const normalizedSearch = searchText.trim().toLowerCase()
  const filteredForks = forks.filter((fork) => {
    if (visibilityFilter === 'draft' && fork.isPublic) {
      return false
    }

    if (visibilityFilter === 'public' && !fork.isPublic) {
      return false
    }

    if (syncFilter !== 'all' && fork.syncStatus !== syncFilter) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    const searchableText = [
      fork.title,
      fork.query,
      fork.description ?? '',
      ...fork.autoTags,
      fork.sourceQuery?.title ?? '',
      fork.sourceQuery?.query ?? '',
      fork.sourceQuery?.creator?.username ?? '',
    ]
      .join(' ')
      .toLowerCase()

    return searchableText.includes(normalizedSearch)
  })

  useEffect(() => {
    if (!search.detail || isLoading) {
      return
    }

    if (!selectedFork) {
      void navigate({ to: '/forks', replace: true })
    }
  }, [isLoading, navigate, search.detail, selectedFork])

  const resultsLayoutClass =
    layoutMode === 'list'
      ? 'mt-4 space-y-3'
      : layoutMode === 'grid-2'
        ? 'mt-4 grid gap-3 md:grid-cols-2'
        : 'mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3'
  const loadingCardClass =
    layoutMode === 'list'
      ? 'h-24 animate-pulse rounded-2xl border border-border/70 bg-card/95 dark:bg-card'
      : 'h-48 animate-pulse rounded-2xl border border-border/70 bg-card/95 dark:bg-card'

  function openDetails(forkId: string) {
    void navigate({
      to: '/forks',
      search: { detail: forkId },
      replace: true,
    })
  }

  function closeDetails() {
    void navigate({ to: '/forks', replace: true })
  }

  function handleDelete(fork: ManagedForkQuery) {
    setForkToDelete(fork)
  }

  function handleSync(fork: ManagedForkQuery) {
    if (syncMutation.isPending) {
      return
    }

    syncMutation.mutate(fork.id)
  }

  function updateCachedForks(
    updater: (items: ManagedForkQuery[]) => ManagedForkQuery[],
  ) {
    queryClient.setQueryData<{ forks: ManagedForkQuery[] }>(
      ['my-forks'],
      (current) => {
        if (!current) {
          return current
        }

        return {
          forks: updater(current.forks),
        }
      },
    )
  }

  function handleDeleteConfirm() {
    if (!forkToDelete) {
      return
    }

    const deletedFork = forkToDelete
    setForkToDelete(null)

    updateCachedForks((items) =>
      items.filter((item) => item.id !== deletedFork.id),
    )

    if (search.detail === deletedFork.id) {
      closeDetails()
    }

    const timeoutId = window.setTimeout(async () => {
      pendingDeleteTimeoutsRef.current.delete(deletedFork.id)

      try {
        await deleteQuery(deletedFork.id)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['my-forks'] }),
          queryClient.invalidateQueries({ queryKey: ['my-queries'] }),
        ])
      } catch {
        updateCachedForks((items) => {
          if (items.some((item) => item.id === deletedFork.id)) {
            return items
          }

          return [deletedFork, ...items].sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          )
        })

        toast.error('Could not delete fork.')
      }
    }, 5000)

    pendingDeleteTimeoutsRef.current.set(deletedFork.id, timeoutId)

    toast.success('Fork deleted.', {
      action: {
        label: 'Undo',
        onClick: () => {
          const pendingTimeoutId = pendingDeleteTimeoutsRef.current.get(
            deletedFork.id,
          )

          if (pendingTimeoutId) {
            window.clearTimeout(pendingTimeoutId)
            pendingDeleteTimeoutsRef.current.delete(deletedFork.id)
          }

          updateCachedForks((items) => {
            if (items.some((item) => item.id === deletedFork.id)) {
              return items
            }

            return [deletedFork, ...items].sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime(),
            )
          })
        },
      },
    })
  }

  return (
    <>
      <PageShell
        title="Forks"
        subtitle="Track strings you forked from the community and keep them in sync."
        contentHeaderVariant="floating"
        showSidebar
        showHeaderSearch={false}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Forked Strings', value: String(forks.length) },
            { label: 'Draft Forks', value: String(draftCount) },
            { label: 'Need Sync', value: String(needSyncCount) },
            {
              label: 'Last Edited',
              value: lastEdited ? (
                <TimestampTooltip iso={lastEdited}>
                  {renderRelativeTime(lastEdited)}
                </TimestampTooltip>
              ) : (
                '—'
              ),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border/70 bg-card/95 px-4 py-3 text-foreground dark:bg-card"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-1 text-lg font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Your forks</h3>
            <p className="text-sm text-muted-foreground">
              Private and published forks live here, along with source sync
              status.
            </p>
          </div>

          <Badge variant="outline" size="sm">
            {orphanedCount} source removed
          </Badge>
        </div>

        <div className="mt-4 mb-3 flex flex-row flex-wrap items-center justify-between gap-3">
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by title, string, source, creator, or tag"
            className="h-10 min-w-64 flex-1 rounded-xl border border-border/70 bg-card/95 dark:bg-card"
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'draft', label: 'Draft' },
              { value: 'public', label: 'Public' },
            ].map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={
                  visibilityFilter === option.value ? 'default' : 'outline'
                }
                size="sm"
                className="rounded-lg"
                onClick={() =>
                  setVisibilityFilter(option.value as VisibilityFilter)
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: 'all', label: 'Any sync' },
              { value: 'up-to-date', label: 'Up to date' },
              { value: 'behind', label: 'Needs sync' },
              { value: 'orphaned', label: 'Source removed' },
            ].map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={syncFilter === option.value ? 'default' : 'outline'}
                size="sm"
                className="rounded-lg"
                onClick={() => setSyncFilter(option.value as SyncFilter)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: 'list', label: 'List', Icon: ListIcon },
              { value: 'grid-2', label: '2 Columns', Icon: Grid2x2Icon },
              { value: 'grid-3', label: '3 Columns', Icon: Grid3x3Icon },
            ].map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={layoutMode === option.value ? 'default' : 'outline'}
                size="sm"
                className="rounded-lg"
                aria-label={option.label}
                title={option.label}
                onClick={() => setLayoutMode(option.value as LayoutMode)}
              >
                <option.Icon className="size-4" />
                <span className="sr-only">{option.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className={resultsLayoutClass}>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className={loadingCardClass} />
            ))}
          </div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-border/70 bg-card/95 p-6 text-sm text-muted-foreground dark:bg-card">
            Your forks could not be loaded right now.
          </div>
        ) : forks.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-card/95 p-8 text-center dark:bg-card">
            <h3 className="text-base font-semibold">No forks yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fork a public community string from Discover or a query detail
              page to start building your own variants.
            </p>
            <Link to="/discover" className="inline-flex">
              <Button type="button" className="mt-4 rounded-xl">
                <GitForkIcon className="size-4" />
                Browse discover
              </Button>
            </Link>
          </div>
        ) : filteredForks.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-border/70 bg-card/95 p-6 text-center text-sm text-muted-foreground dark:bg-card">
            No forks match this search, visibility, and sync filter.
          </div>
        ) : (
          <div className={resultsLayoutClass}>
            {filteredForks.map((fork) => (
              <article
                key={fork.id}
                className="rounded-2xl border border-border/70 bg-card/95 px-4 py-4 text-foreground dark:bg-card"
              >
                <div className="flex flex-col gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <QueryCardHeader
                      title={fork.title}
                      onTitleClick={() => openDetails(fork.id)}
                      titleClassName="block w-full text-left text-sm font-semibold leading-snug hover:underline"
                      action={
                        fork.isPublic ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() =>
                              void navigate({
                                to: '/queries/$queryId',
                                params: { queryId: fork.id },
                              })
                            }
                          >
                            View
                          </Button>
                        ) : null
                      }
                    >
                      {fork.isPublic ? (
                        <Badge variant="outline" size="sm">
                          Public
                        </Badge>
                      ) : (
                        <>
                          <Badge variant="outline" size="sm">
                            Draft
                          </Badge>
                          <Badge variant="outline" size="sm">
                            Private
                          </Badge>
                        </>
                      )}
                      <Badge
                        variant="outline"
                        size="sm"
                        className={getSyncBadgeClasses(fork.syncStatus)}
                      >
                        {formatSyncLabel(fork.syncStatus)}
                      </Badge>
                    </QueryCardHeader>

                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {fork.description ?? 'No description yet.'}
                    </p>

                    <p className="font-mono text-xs text-muted-foreground">
                      {fork.query}
                    </p>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Forked {renderRelativeTime(fork.createdAt)}</p>
                      <p>Updated {renderRelativeTime(fork.updatedAt)}</p>
                      <p>
                        Source:{' '}
                        {fork.sourceQuery ? (
                          <>
                            {fork.sourceQuery.title}
                            {fork.sourceQuery.creator?.username
                              ? ` by ${fork.sourceQuery.creator.username}`
                              : ''}
                          </>
                        ) : (
                          'Original source no longer available.'
                        )}
                      </p>
                    </div>

                    <QueryTagBadges tags={fork.autoTags} />
                  </div>

                  <div className="flex flex-col items-start gap-3">
                    <QueryCardActions>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => openDetails(fork.id)}
                      >
                        Details
                      </Button>
                      {fork.syncStatus === 'behind' ? (
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-lg"
                          disabled={syncMutation.isPending}
                          onClick={() => handleSync(fork)}
                        >
                          {syncMutation.isPending
                            ? 'Syncing...'
                            : 'Sync from source'}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => setEditingFork(fork)}
                      >
                        <Edit3Icon className="size-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-destructive hover:text-destructive"
                        onClick={() => handleDelete(fork)}
                      >
                        <Trash2Icon className="size-4" />
                        Delete
                      </Button>
                    </QueryCardActions>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </PageShell>
      <QueryCreateDrawer
        open={editingFork !== null}
        mode="edit"
        queryId={editingFork?.id}
        initialQuery={
          editingFork
            ? {
                title: editingFork.title,
                query: editingFork.query,
                description: editingFork.description,
                isPublic: editingFork.isPublic,
              }
            : undefined
        }
        onSuccess={() => {
          void Promise.all([
            queryClient.invalidateQueries({ queryKey: ['my-forks'] }),
            queryClient.invalidateQueries({ queryKey: ['my-queries'] }),
          ])
        }}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingFork(null)
          }
        }}
      />

      <Dialog
        open={selectedFork !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeDetails()
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          {selectedFork ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedFork.title}</DialogTitle>
                <DialogDescription>
                  Review the fork source, sync status, and current string before
                  editing or publishing.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    size="sm"
                    className={getSyncBadgeClasses(selectedFork.syncStatus)}
                  >
                    {formatSyncLabel(selectedFork.syncStatus)}
                  </Badge>
                  <Badge variant="outline" size="sm">
                    Forked {renderRelativeTime(selectedFork.createdAt)}
                  </Badge>
                  <Badge variant="outline" size="sm">
                    Updated {renderRelativeTime(selectedFork.updatedAt)}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-card/95 p-4 dark:bg-card">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Your fork
                    </p>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm text-foreground">
                      {selectedFork.query}
                    </pre>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-card/95 p-4 dark:bg-card">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Original snapshot
                    </p>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm text-foreground">
                      {selectedFork.originalQuerySnapshot ??
                        'No snapshot saved.'}
                    </pre>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-card/95 p-4 dark:bg-card">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Source details
                  </p>
                  {selectedFork.sourceQuery ? (
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {selectedFork.sourceQuery.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedFork.sourceQuery.creator?.username
                            ? `By ${selectedFork.sourceQuery.creator.username}`
                            : 'Creator unavailable'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Source updated{' '}
                          {renderRelativeTime(
                            selectedFork.sourceQuery.updatedAt,
                          )}
                        </p>
                      </div>

                      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-border/70 bg-background/80 px-4 py-3 font-mono text-sm text-foreground dark:bg-background">
                        {selectedFork.sourceQuery.query}
                      </pre>

                      {selectedFork.sourceQuery.isPublic ? (
                        <Link
                          to="/queries/$queryId"
                          params={{ queryId: selectedFork.sourceQuery.id }}
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
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDetails}>
                  Close
                </Button>
                {selectedFork.syncStatus === 'behind' ? (
                  <Button
                    type="button"
                    disabled={syncMutation.isPending}
                    onClick={() => handleSync(selectedFork)}
                  >
                    {syncMutation.isPending ? 'Syncing...' : 'Sync from source'}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    closeDetails()
                    setEditingFork(selectedFork)
                  }}
                >
                  <Edit3Icon className="size-4" />
                  Edit fork
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={forkToDelete !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setForkToDelete(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete fork?</DialogTitle>
            <DialogDescription>
              {forkToDelete
                ? `Delete "${forkToDelete.title}"? This removes only your fork.`
                : 'This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setForkToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!forkToDelete}
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
