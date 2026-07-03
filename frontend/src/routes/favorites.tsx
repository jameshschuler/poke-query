import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  EyeIcon,
  Grid2x2Icon,
  Grid3x3Icon,
  HeartIcon,
  ListIcon,
  Trash2Icon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { PageShell } from '#/components/page-shell'
import { QueryCardActions } from '#/components/query-card-actions'
import { QueryCardHeader } from '#/components/query-card-header'
import { QueryTagBadges } from '#/components/query-tag-badges'
import { TimestampTooltip } from '#/components/timestamp-tooltip'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { getMyFavoritesPage, unfavoriteQuery } from '#/lib/poke-query-api'
import type { MyFavoriteQuery } from '#/lib/poke-query-api'
import { requireAuthenticated } from '#/lib/route-auth'

type FavoritesSearch = {
  q?: string
}

type FavoritesFilter = 'all' | 'public' | 'private'
type LayoutMode = 'list' | 'grid-2' | 'grid-3'

const FAVORITES_LAYOUT_STORAGE_KEY = 'poke-query:favorites-layout'

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

export const Route = createFileRoute('/favorites')({
  ssr: false,
  validateSearch: (search): FavoritesSearch => ({
    q:
      typeof search.q === 'string' && search.q.trim().length > 0
        ? search.q
        : undefined,
  }),
  beforeLoad: async () => {
    await requireAuthenticated('/favorites')
  },
  component: FavoritesPage,
})

function FavoritesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const routeSearch = Route.useSearch()
  const [searchText, setSearchText] = useState(routeSearch.q ?? '')
  const [filter, setFilter] = useState<FavoritesFilter>('all')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    if (typeof window === 'undefined') {
      return 'grid-3'
    }

    const stored = window.localStorage.getItem(FAVORITES_LAYOUT_STORAGE_KEY)
    return isLayoutMode(stored) ? stored : 'grid-3'
  })

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: ['my-favorites-page'],
    queryFn: ({ pageParam = 0 }) =>
      getMyFavoritesPage({
        limit: 12,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.nextOffset : undefined,
  })

  const unfavoriteMutation = useMutation({
    mutationFn: unfavoriteQuery,
    onSuccess: async () => {
      toast.success('Removed from favorites.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-favorites-page'] }),
        queryClient.invalidateQueries({ queryKey: ['my-favorite-ids'] }),
      ])
    },
    onError: () => {
      toast.error('Could not remove favorite.')
    },
  })

  const favorites = useMemo(
    () => data?.pages.flatMap((page) => page.favorites) ?? [],
    [data],
  )

  const totalFavorites = data?.pages[0]?.pagination.total ?? 0
  const publicCount = favorites.filter((item) => item.isPublic).length
  const lastFavorited = favorites[0]?.favoritedAt ?? null
  const normalizedSearch = searchText.trim().toLowerCase()

  const filteredFavorites = favorites.filter((item) => {
    if (filter === 'public' && !item.isPublic) {
      return false
    }

    if (filter === 'private' && item.isPublic) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    const searchableText = [
      item.title,
      item.query,
      item.description ?? '',
      ...item.autoTags,
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

  function handleUnfavorite(query: MyFavoriteQuery) {
    if (unfavoriteMutation.isPending) {
      return
    }

    unfavoriteMutation.mutate(query.id)
  }

  return (
    <PageShell
      title="Favorites"
      subtitle="Quick access to strings you saved across discover, profiles, and detail pages."
      contentHeaderVariant="floating"
      showSidebar
      showHeaderSearch={false}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: 'Favorited', value: String(totalFavorites) },
          { label: 'Public', value: String(publicCount) },
          {
            label: 'Last Favorited',
            value: lastFavorited ? (
              <TimestampTooltip iso={lastFavorited}>
                {renderRelativeTime(lastFavorited)}
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
          <h3 className="text-base font-semibold">Saved strings</h3>
          <p className="text-sm text-muted-foreground">
            Manage and revisit strings you've favorited.
          </p>
        </div>
      </div>

      <div className="mt-4 mb-3 flex flex-row flex-wrap items-center justify-between gap-3">
        <Input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search by title, string, description, or tag"
          className="h-10 min-w-64 flex-1 rounded-xl border border-border/70 bg-card/95 dark:bg-card"
        />

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'public', label: 'Public' },
            { value: 'private', label: 'Private' },
          ].map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={filter === option.value ? 'default' : 'outline'}
              size="sm"
              className="rounded-lg"
              onClick={() => setFilter(option.value as FavoritesFilter)}
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
              onClick={() => {
                const next = option.value as LayoutMode
                setLayoutMode(next)
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(
                    FAVORITES_LAYOUT_STORAGE_KEY,
                    next,
                  )
                }
              }}
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
          Your favorites could not be loaded right now.
        </div>
      ) : favorites.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-card/95 p-8 text-center dark:bg-card">
          <h3 className="text-base font-semibold">No favorites yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Favorite a string in Discover, Query Detail, or a Trainer profile to
            see it here.
          </p>
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-border/70 bg-card/95 p-6 text-center text-sm text-muted-foreground dark:bg-card">
          No favorites match this search and visibility filter.
        </div>
      ) : (
        <div className={resultsLayoutClass}>
          {filteredFavorites.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-border/70 bg-card/95 px-4 py-4 text-foreground dark:bg-card"
            >
              <div className="flex flex-col gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <QueryCardHeader
                    title={item.title}
                    onTitleClick={() =>
                      void navigate({
                        to: '/queries/$queryId',
                        params: { queryId: item.id },
                      })
                    }
                    action={
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
                                  params: { queryId: item.id },
                                })
                              }
                            >
                              <EyeIcon className="size-4" />
                            </Button>
                          }
                        />
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                    }
                  >
                    {item.isPublic ? (
                      <Badge variant="outline">Public</Badge>
                    ) : (
                      <>
                        <Badge variant="outline">Draft</Badge>
                        <Badge variant="outline">Private</Badge>
                      </>
                    )}
                  </QueryCardHeader>

                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {item.description ?? 'No description yet.'}
                  </p>

                  <p className="font-mono text-xs text-muted-foreground">
                    {item.query}
                  </p>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Favorited {renderRelativeTime(item.favoritedAt)}</p>
                    <p>Updated {renderRelativeTime(item.updatedAt)}</p>
                  </div>

                  <QueryTagBadges tags={item.autoTags} />
                </div>

                <div className="flex flex-col items-start gap-3">
                  <QueryCardActions>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="rounded-lg text-destructive hover:text-destructive"
                            aria-label="Remove"
                            onClick={() => handleUnfavorite(item)}
                            disabled={unfavoriteMutation.isPending}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        }
                      />
                      <TooltipContent>Remove</TooltipContent>
                    </Tooltip>
                    <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground">
                      <HeartIcon className="size-3.5" />
                      {item.favoriteCount}
                    </div>
                  </QueryCardActions>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {hasNextPage ? (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            className="rounded-xl px-6"
            disabled={isFetchingNextPage}
            onClick={() => {
              void fetchNextPage()
            }}
          >
            {isFetchingNextPage ? 'Loading more...' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </PageShell>
  )
}
