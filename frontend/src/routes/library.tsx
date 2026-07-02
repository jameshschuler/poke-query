import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Edit3Icon,
  Grid2x2Icon,
  Grid3x3Icon,
  ListIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { QueryCreateDrawer } from '#/components/query-create-drawer'
import { QueryCardActions } from '#/components/query-card-actions'
import { QueryCardHeader } from '#/components/query-card-header'
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
import { deleteQuery, getMyQueries } from '#/lib/poke-query-api'
import type { ManagedQuery } from '#/lib/poke-query-api'
import { requireAuthenticated } from '#/lib/route-auth'
import { QueryTagBadges } from '../components/query-tag-badges'

type LibrarySearch = {
  create?: string
}

type StatusFilter = 'all' | 'draft' | 'public'
type LayoutMode = 'list' | 'grid-2' | 'grid-3'

const LIBRARY_LAYOUT_STORAGE_KEY = 'poke-query:library-layout'

function isLayoutMode(value: string | null): value is LayoutMode {
  return value === 'list' || value === 'grid-2' || value === 'grid-3'
}

export const Route = createFileRoute('/library')({
  ssr: false,
  validateSearch: (search): LibrarySearch => ({
    create: typeof search.create === 'string' ? search.create : undefined,
  }),
  beforeLoad: async () => {
    await requireAuthenticated('/library')
  },
  component: LibraryPage,
})

function LibraryPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const search = Route.useSearch()
  const isCreateOpen = search.create === '1'
  const [editingQuery, setEditingQuery] = useState<ManagedQuery | null>(null)
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

  const queries = data?.queries ?? []
  const draftCount = queries.filter((query) => !query.isPublic).length
  const publicCount = queries.length - draftCount
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
      ...query.autoTags,
    ]
      .join(' ')
      .toLowerCase()

    return searchableText.includes(normalizedSearch)
  })
  const resultsLayoutClass =
    layoutMode === 'list'
      ? 'mt-4 space-y-3'
      : layoutMode === 'grid-2'
        ? 'mt-4 grid gap-3 md:grid-cols-2'
        : 'mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3'
  const loadingCardClass =
    layoutMode === 'list'
      ? 'h-24 animate-pulse rounded-2xl border border-border/70 bg-card/95 dark:bg-card'
      : 'h-40 animate-pulse rounded-2xl border border-border/70 bg-card/95 dark:bg-card'

  function handleDelete(query: ManagedQuery) {
    setQueryToDelete(query)
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
      } catch {
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

        toast.error('Could not delete string.')
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Strings', value: String(queries.length) },
            { label: 'Drafts', value: String(draftCount) },
            { label: 'Published', value: String(publicCount) },
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

        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Your strings</h3>
            <p className="text-sm text-muted-foreground">
              Drafts and published strings live here.
            </p>
          </div>

          <Button
            type="button"
            className="rounded-xl"
            onClick={() =>
              navigate({
                to: '/library',
                search: { create: '1' },
                replace: true,
              })
            }
          >
            <PlusIcon className="size-4" />
            New String
          </Button>
        </div>

        <div className="mt-4 mb-6 flex flex-row flex-wrap items-center justify-between gap-3">
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by title, string, description, or tag"
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

        <div className="mt-3 flex justify-end">
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
            Your library could not be loaded right now.
          </div>
        ) : queries.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-card/95 p-8 text-center dark:bg-card">
            <h3 className="text-base font-semibold">No strings yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a private draft or publish a new search string to build your
              library.
            </p>
            <Button
              type="button"
              className="mt-4 rounded-xl"
              onClick={() =>
                navigate({
                  to: '/library',
                  search: { create: '1' },
                  replace: true,
                })
              }
            >
              <PlusIcon className="size-4" />
              Create your first string
            </Button>
          </div>
        ) : filteredQueries.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-border/70 bg-card/95 p-6 text-center text-sm text-muted-foreground dark:bg-card">
            No strings match this search and status filter.
          </div>
        ) : (
          <div className={resultsLayoutClass}>
            {filteredQueries.map((query) => (
              <article
                key={query.id}
                className="rounded-2xl border border-border/70 bg-card/95 px-4 py-4 text-foreground dark:bg-card"
              >
                <div className="flex flex-col gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <QueryCardHeader
                      title={query.title}
                      onTitleClick={() => setEditingQuery(query)}
                      action={
                        query.isPublic ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() =>
                              void navigate({
                                to: '/queries/$queryId',
                                params: { queryId: query.id },
                              })
                            }
                          >
                            View
                          </Button>
                        ) : null
                      }
                    >
                      {query.isPublic ? (
                        <Badge variant="outline">Public</Badge>
                      ) : (
                        <>
                          <Badge variant="outline">Draft</Badge>
                          <Badge variant="outline">Private</Badge>
                        </>
                      )}
                    </QueryCardHeader>

                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {query.description ?? 'No description yet.'}
                    </p>

                    <p className="font-mono text-xs text-muted-foreground">
                      {query.query}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Updated {renderRelativeTime(query.updatedAt)}
                    </p>

                    <QueryTagBadges tags={query.autoTags} />
                  </div>

                  <div className="flex flex-col items-start gap-3">
                    <QueryCardActions>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => setEditingQuery(query)}
                      >
                        <Edit3Icon className="size-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-destructive hover:text-destructive"
                        onClick={() => handleDelete(query)}
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
        open={isCreateOpen || editingQuery !== null}
        mode={editingQuery ? 'edit' : 'create'}
        queryId={editingQuery?.id}
        initialQuery={
          editingQuery
            ? {
                title: editingQuery.title,
                query: editingQuery.query,
                description: editingQuery.description,
                isPublic: editingQuery.isPublic,
              }
            : undefined
        }
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ['my-queries'] })
        }}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingQuery(null)
            if (isCreateOpen) {
              void navigate({ to: '/library', replace: true })
            }
          }
        }}
      />

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
