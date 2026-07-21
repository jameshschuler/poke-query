import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import {
  CopyIcon,
  EyeIcon,
  Edit3Icon,
  Grid2x2Icon,
  Grid3x3Icon,
  HeartIcon,
  ListIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { ManagedStringCard } from '#/components/managed-string-card'
import { TimestampTooltip } from '#/components/timestamp-tooltip'
import { PageShell } from '#/components/page-shell'
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import {
  deleteQuery,
  copyQuery,
  favoriteQuery,
  getMyFavoriteIds,
  getMyQueries,
  unfavoriteQuery,
} from '#/lib/poke-query-api'
import type { ManagedQuery } from '#/lib/poke-query-api'
import { getMutationErrorMessage } from '#/lib/mutation-toast'
import { requireAuthenticated } from '#/lib/route-auth'
import { formatCompactNumber, formatFullNumber } from '#/lib/utils'

type StatusFilter = 'all' | 'draft' | 'public'
type LayoutMode = 'list' | 'grid-2' | 'grid-3'

const LIBRARY_LAYOUT_STORAGE_KEY = 'poke-query:library-layout'

function isLayoutMode(value: string | null): value is LayoutMode {
  return value === 'list' || value === 'grid-2' || value === 'grid-3'
}

export const Route = createFileRoute('/library')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/library')
  },
  component: LibraryPage,
})

function LibraryPage() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  if (pathname !== '/library') {
    return <Outlet />
  }

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [queryToDelete, setQueryToDelete] = useState<ManagedQuery | null>(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    if (typeof window === 'undefined') {
      return 'grid-3'
    }

    const stored = window.localStorage.getItem(LIBRARY_LAYOUT_STORAGE_KEY)
    return isLayoutMode(stored) ? stored : 'grid-3'
  })

  useEffect(() => {
    window.localStorage.setItem(LIBRARY_LAYOUT_STORAGE_KEY, layoutMode)
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
    queryKey: ['my-queries'],
    queryFn: getMyQueries,
  })

  const { data: myFavoriteIds } = useQuery({
    queryKey: ['my-favorite-ids'],
    queryFn: getMyFavoriteIds,
    staleTime: 60_000,
  })

  const favoriteMutation = useMutation({
    mutationFn: favoriteQuery,
    onSuccess: async () => {
      toast.success('Saved to favorites.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-favorite-ids'] }),
        queryClient.invalidateQueries({ queryKey: ['my-favorites-page'] }),
        queryClient.invalidateQueries({ queryKey: ['community-discover'] }),
        queryClient.invalidateQueries({ queryKey: ['my-queries'] }),
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
        queryClient.invalidateQueries({ queryKey: ['my-queries'] }),
      ])
    },
    onError: (mutationError: unknown) => {
      toast.error(
        getMutationErrorMessage(mutationError, 'Could not remove favorite.'),
      )
    },
  })

  const queries = data?.queries ?? []
  const favoriteIdSet = new Set(myFavoriteIds?.favoriteQueryIds ?? [])
  const isFavoritePending =
    favoriteMutation.isPending || unfavoriteMutation.isPending
  const draftCount = queries.filter((query) => !query.isPublic).length
  const publicCount = queries.length - draftCount
  const totalViews = queries.reduce((sum, query) => sum + query.viewCount, 0)
  const lastEdited = queries[0]?.updatedAt ?? null
  const normalizedSearch = searchText.trim().toLowerCase()
  const filteredQueries = queries.filter((query) => {
    if (statusFilter === 'draft' && query.isPublic) {
      return false
    }

    if (statusFilter === 'public' && !query.isPublic) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    const searchableText = [
      query.title,
      query.query,
      query.description ?? '',
      ...query.userTags,
      ...query.autoTags,
    ]
      .join(' ')
      .toLowerCase()

    return searchableText.includes(normalizedSearch)
  })
  const resultsLayoutClass =
    layoutMode === 'list'
      ? 'mt-5 space-y-4'
      : layoutMode === 'grid-2'
        ? 'mt-5 grid gap-4 md:grid-cols-2'
        : 'mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3'
  const loadingCardClass =
    layoutMode === 'list'
      ? 'h-24 animate-pulse rounded-2xl border border-border/70 bg-card/95 dark:bg-card'
      : 'h-40 animate-pulse rounded-2xl border border-border/70 bg-card/95 dark:bg-card'

  function handleDelete(query: ManagedQuery) {
    setQueryToDelete(query)
  }

  function handleToggleFavorite(queryId: string) {
    if (isFavoritePending) {
      return
    }

    if (favoriteIdSet.has(queryId)) {
      unfavoriteMutation.mutate(queryId)
      return
    }

    favoriteMutation.mutate(queryId)
  }

  function handleCopySearchString(queryId: string, value: string) {
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        void copyQuery(queryId)
        toast.success('Copied to clipboard!')
      })
      .catch(() => {
        toast.error('Could not copy string.')
      })
  }

  function handleDeleteConfirm() {
    if (!queryToDelete) {
      return
    }

    const deletedItem = queryToDelete
    setQueryToDelete(null)

    queryClient.setQueryData<{ queries: ManagedQuery[] }>(
      ['my-queries'],
      (current) => {
        if (!current) {
          return current
        }

        return {
          queries: current.queries.filter((item) => item.id !== deletedItem.id),
        }
      },
    )

    const timeoutId = window.setTimeout(async () => {
      pendingDeleteTimeoutsRef.current.delete(deletedItem.id)

      try {
        await deleteQuery(deletedItem.id)
        await queryClient.invalidateQueries({ queryKey: ['my-queries'] })
      } catch (rollbackError) {
        queryClient.setQueryData<{ queries: ManagedQuery[] }>(
          ['my-queries'],
          (current) => {
            const existing = current?.queries ?? []

            if (existing.some((item) => item.id === deletedItem.id)) {
              return current ?? { queries: existing }
            }

            return {
              queries: [deletedItem, ...existing].sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime(),
              ),
            }
          },
        )

        toast.error(
          getMutationErrorMessage(rollbackError, 'Could not delete string.'),
        )
      }
    }, 5000)

    pendingDeleteTimeoutsRef.current.set(deletedItem.id, timeoutId)

    toast.success('String deleted.', {
      action: {
        label: 'Undo',
        onClick: () => {
          const pendingTimeoutId = pendingDeleteTimeoutsRef.current.get(
            deletedItem.id,
          )

          if (pendingTimeoutId) {
            window.clearTimeout(pendingTimeoutId)
            pendingDeleteTimeoutsRef.current.delete(deletedItem.id)
          }

          queryClient.setQueryData<{ queries: ManagedQuery[] }>(
            ['my-queries'],
            (current) => {
              const existing = current?.queries ?? []

              if (existing.some((item) => item.id === deletedItem.id)) {
                return current ?? { queries: existing }
              }

              return {
                queries: [deletedItem, ...existing].sort(
                  (a, b) =>
                    new Date(b.updatedAt).getTime() -
                    new Date(a.updatedAt).getTime(),
                ),
              }
            },
          )
        },
      },
    })
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

  return (
    <>
      <PageShell
        title="My Library"
        subtitle="Manage your personal search strings and draft strings."
        contentHeaderVariant="floating"
        showSidebar
        showHeaderSearch={false}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Strings', value: String(queries.length) },
            { label: 'Drafts', value: String(draftCount) },
            { label: 'Published', value: String(publicCount) },
            {
              label: 'Total Views',
              value: (
                <span title={formatFullNumber(totalViews)}>
                  {formatCompactNumber(totalViews)}
                </span>
              ),
            },
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

        <div className="mt-6 flex gap-4 max-sm:flex-col sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-semibold">Your strings</h3>
            <p className="text-sm text-muted-foreground">
              Drafts and published strings live here.
            </p>
          </div>

          <Button
            type="button"
            nativeButton={false}
            className="rounded-xl max-sm:w-full"
            render={<Link to="/library/new" />}
          >
            <PlusIcon className="size-4" />
            New String
          </Button>
        </div>

        <div className="mt-5 mb-7 flex gap-4 max-sm:flex-col sm:flex-wrap sm:items-center sm:justify-between">
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by title, string, description, or tag"
            className="h-10 min-w-0 flex-1 rounded-xl border border-border/70 bg-card/95 max-sm:w-full dark:bg-card"
          />

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {[
              { value: 'all', label: 'All' },
              { value: 'draft', label: 'Draft' },
              { value: 'public', label: 'Public' },
            ].map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={statusFilter === option.value ? 'default' : 'outline'}
                size="sm"
                className="rounded-lg"
                onClick={() => setStatusFilter(option.value as StatusFilter)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex max-sm:justify-start sm:justify-end">
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
          <div className="mt-5 rounded-2xl border border-border/70 bg-card/95 p-6 text-sm text-muted-foreground dark:bg-card">
            Your library could not be loaded right now.
          </div>
        ) : queries.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border/70 bg-card/95 p-8 text-center dark:bg-card">
            <h3 className="text-base font-semibold">Welcome to your library</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with a draft, then publish once you are happy with your
              search string. You can always edit later.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                nativeButton={false}
                className="rounded-xl max-sm:w-full"
                render={<Link to="/library/new" />}
              >
                <PlusIcon className="size-4" />
                Create first string
              </Button>
              <Button
                type="button"
                variant="outline"
                nativeButton={false}
                className="rounded-xl max-sm:w-full"
                render={<Link to="/discover" />}
              >
                Explore examples
              </Button>
            </div>
          </div>
        ) : filteredQueries.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-border/70 bg-card/95 p-6 text-center text-sm text-muted-foreground dark:bg-card">
            No strings match this search and status filter.
          </div>
        ) : (
          <div className={resultsLayoutClass}>
            {filteredQueries.map((query) => (
              <ManagedStringCard
                key={query.id}
                title={query.title}
                onTitleClick={() =>
                  void navigate({
                    to: '/library/$queryId/edit',
                    params: { queryId: query.id },
                  })
                }
                headerAction={
                  query.isPublic ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="rounded-lg"
                            aria-label="View"
                            onClick={() =>
                              void navigate({
                                to: '/queries/$queryId',
                                params: { queryId: query.id },
                              })
                            }
                          >
                            <EyeIcon className="size-4" />
                          </Button>
                        }
                      />
                      <TooltipContent>View</TooltipContent>
                    </Tooltip>
                  ) : null
                }
                statusBadges={
                  query.isPublic ? (
                    <Badge variant="outline">Public</Badge>
                  ) : (
                    <>
                      <Badge variant="outline">Draft</Badge>
                      <Badge variant="outline">Private</Badge>
                    </>
                  )
                }
                description={query.description}
                query={query.query}
                details={
                  <>
                    <p>Updated {renderRelativeTime(query.updatedAt)}</p>
                    <p>
                      {formatCompactNumber(query.viewCount)} views •{' '}
                      {formatCompactNumber(query.copyCount)} copies •{' '}
                      {formatCompactNumber(query.favoriteCount)} saves •{' '}
                      {formatCompactNumber(query.forkCount)} forks
                    </p>
                  </>
                }
                userTags={query.userTags}
                autoTags={query.autoTags}
                footer={
                  <>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="rounded-lg"
                            aria-label="Copy"
                            onClick={() =>
                              handleCopySearchString(query.id, query.query)
                            }
                          >
                            <CopyIcon className="size-4" />
                          </Button>
                        }
                      />
                      <TooltipContent>Copy</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className={`rounded-lg ${
                              favoriteIdSet.has(query.id)
                                ? 'border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-600'
                                : ''
                            }`}
                            aria-label={
                              favoriteIdSet.has(query.id)
                                ? 'Favorited'
                                : 'Favorite'
                            }
                            disabled={isFavoritePending}
                            onClick={() => handleToggleFavorite(query.id)}
                          >
                            <HeartIcon
                              className={`size-4 ${
                                favoriteIdSet.has(query.id)
                                  ? 'fill-current text-rose-600'
                                  : ''
                              }`}
                            />
                          </Button>
                        }
                      />
                      <TooltipContent>
                        {favoriteIdSet.has(query.id) ? 'Favorited' : 'Favorite'}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            nativeButton={false}
                            className="rounded-lg"
                            aria-label="Edit"
                            render={
                              <Link
                                to="/library/$queryId/edit"
                                params={{ queryId: query.id }}
                              />
                            }
                          >
                            <Edit3Icon className="size-4" />
                          </Button>
                        }
                      />
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="rounded-lg text-destructive hover:text-destructive"
                            aria-label="Delete"
                            onClick={() => handleDelete(query)}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        }
                      />
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </>
                }
              />
            ))}
          </div>
        )}
      </PageShell>

      <Dialog
        open={queryToDelete !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setQueryToDelete(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete string?</DialogTitle>
            <DialogDescription>
              {queryToDelete
                ? `Delete "${queryToDelete.title}"? This action cannot be undone.`
                : 'This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQueryToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!queryToDelete}
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
