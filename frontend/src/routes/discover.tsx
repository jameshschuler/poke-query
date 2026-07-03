import { useAuth } from '@authabase/react'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState, useEffect } from 'react'
import {
  ChevronsUpDownIcon,
  HeartIcon,
  Loader2Icon,
  PlusIcon,
  Share2Icon,
  SearchIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import type { CommunityQuery } from '#/lib/poke-query-api'
import {
  getCommunityQueriesPage,
  favoriteGuestQuery,
  favoriteQuery,
  getMyFavoriteIds,
  forkQuery,
  getGuestFavorites,
  getQueryTags,
  unfavoriteQuery,
  unfavoriteGuestQuery,
  ApiRequestError,
} from '#/lib/poke-query-api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { SearchStringCard } from '#/components/search-string-card'
import { GuestFavoritesDrawer } from '#/components/guest-favorites-drawer'
import { PageShell } from '#/components/page-shell'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { formatTagLabel } from '#/lib/utils'

type SortMode =
  | 'created_desc'
  | 'created_asc'
  | 'title_asc'
  | 'title_desc'
  | 'popular'

type FilterOption = {
  key: string
  label: string
  filter?: 'all' | 'new' | 'popular'
  tag?: string
}

const BASE_FILTERS: FilterOption[] = [
  { key: 'all', label: 'All', filter: 'all' },
  { key: 'popular', label: 'Popular', filter: 'popular' },
  { key: 'new', label: 'New', filter: 'new' },
]

const DEFAULT_TAG_FILTERS: Array<{ tag: string; label: string }> = [
  { tag: 'master-league', label: 'Master League' },
  { tag: 'ultra-league', label: 'Ultra League' },
  { tag: 'great-league', label: 'Great League' },
  { tag: 'raid', label: 'Raid' },
  { tag: 'daily-catch', label: 'Community Day' },
]

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: 'created_desc', label: 'Created date (newest first)' },
  { value: 'created_asc', label: 'Created date (oldest first)' },
  { value: 'popular', label: 'Most popular' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
]

const sortValues = new Set(sortOptions.map((option) => option.value))

type DiscoverSearch = {
  q?: string
  sort?: SortMode
  filter?: string
}

export const Route = createFileRoute('/discover')({
  ssr: false,
  validateSearch: (search): DiscoverSearch => {
    const q =
      typeof search.q === 'string' && search.q.trim().length > 0
        ? search.q
        : undefined

    const sort =
      typeof search.sort === 'string' && sortValues.has(search.sort as SortMode)
        ? (search.sort as SortMode)
        : undefined

    const filter =
      typeof search.filter === 'string' && search.filter.trim().length > 0
        ? search.filter
        : undefined

    return {
      q,
      sort,
      filter,
    }
  },
  component: DiscoverPage,
})

function DiscoverPage() {
  const navigate = useNavigate()
  const routeSearch = Route.useSearch()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [sortMode, setSortMode] = useState<SortMode>(
    routeSearch.sort ?? 'created_desc',
  )
  const [activeFilterKey, setActiveFilterKey] = useState(
    routeSearch.filter ?? 'all',
  )
  const [searchTerm, setSearchTerm] = useState(routeSearch.q ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(routeSearch.q ?? '')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const { data: availableTags = [] } = useQuery({
    queryKey: ['query-tags'],
    queryFn: getQueryTags,
    staleTime: 5 * 60_000,
  })

  const { data: guestFavorites } = useQuery({
    queryKey: ['guest-favorites'],
    queryFn: getGuestFavorites,
    enabled: !user,
    staleTime: 60_000,
  })

  const { data: myFavoriteIds } = useQuery({
    queryKey: ['my-favorite-ids'],
    queryFn: getMyFavoriteIds,
    enabled: Boolean(user),
    staleTime: 60_000,
  })

  const favoriteMutation = useMutation({
    mutationFn: favoriteQuery,
    onSuccess: async () => {
      toast.success('Saved to favorites!')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-favorite-ids'] }),
        queryClient.invalidateQueries({ queryKey: ['my-favorites-page'] }),
      ])
    },
    onError: () => {
      toast.error('Could not save favorite.')
    },
  })

  const unfavoriteMutation = useMutation({
    mutationFn: unfavoriteQuery,
    onSuccess: async () => {
      toast.success('Removed from favorites.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-favorite-ids'] }),
        queryClient.invalidateQueries({ queryKey: ['my-favorites-page'] }),
      ])
    },
    onError: () => {
      toast.error('Could not remove favorite.')
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
        to: '/forks',
        search: { detail: result.id },
      })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiRequestError && error.status === 404) {
        toast.error(
          'This string can’t be forked because the original is private or no longer exists.',
        )
        return
      }

      toast.error('Could not fork string.')
    },
  })

  const guestFavoriteMutation = useMutation({
    mutationFn: favoriteGuestQuery,
    onSuccess: () => {
      toast.success('Saved to favorites!')
      void queryClient.invalidateQueries({ queryKey: ['guest-favorites'] })
    },
    onError: (error: unknown) => {
      if (error instanceof ApiRequestError && error.status === 409) {
        toast.error(
          'Guest favorites are limited to 10. Create an account for more.',
        )
        return
      }
      toast.error('Could not save favorite.')
    },
  })

  const guestUnfavoriteMutation = useMutation({
    mutationFn: unfavoriteGuestQuery,
    onSuccess: () => {
      toast.success('Removed from favorites.')
      void queryClient.invalidateQueries({ queryKey: ['guest-favorites'] })
    },
    onError: () => {
      toast.error('Could not remove favorite.')
    },
  })

  const clearGuestFavoritesMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.allSettled(ids.map((id) => unfavoriteGuestQuery(id)))
    },
    onSuccess: () => {
      toast.success('Cleared favorites.')
      void queryClient.invalidateQueries({ queryKey: ['guest-favorites'] })
    },
    onError: () => {
      toast.error('Could not clear favorites.')
    },
  })

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 350)
    return () => clearTimeout(handler)
  }, [searchTerm])

  useEffect(() => {
    const nextQ = routeSearch.q ?? ''
    const nextSort = routeSearch.sort ?? 'created_desc'
    const nextFilter = routeSearch.filter ?? 'all'

    setSearchTerm((current) => (current === nextQ ? current : nextQ))
    setDebouncedSearch((current) => (current === nextQ ? current : nextQ))
    setSortMode((current) => (current === nextSort ? current : nextSort))
    setActiveFilterKey((current) =>
      current === nextFilter ? current : nextFilter,
    )
  }, [routeSearch.filter, routeSearch.q, routeSearch.sort])

  useEffect(() => {
    void navigate({
      to: '/discover',
      search: {
        q: debouncedSearch.trim().length > 0 ? debouncedSearch : undefined,
        sort: sortMode !== 'created_desc' ? sortMode : undefined,
        filter: activeFilterKey !== 'all' ? activeFilterKey : undefined,
      },
      replace: true,
    })
  }, [activeFilterKey, debouncedSearch, navigate, sortMode])

  const { visibleFilters, dropdownFilters, allFilters } = useMemo(() => {
    const tagCounts = new Map(
      availableTags.map((tag) => [tag.name, tag.queryCount] as const),
    )
    const defaultTagSet = new Set(DEFAULT_TAG_FILTERS.map((tag) => tag.tag))

    const inlineTagFilters: FilterOption[] = DEFAULT_TAG_FILTERS.map((tag) => {
      const count = tagCounts.get(tag.tag)

      return {
        key: `tag:${tag.tag}`,
        label: count ? `${tag.label} (${count})` : tag.label,
        tag: tag.tag,
      }
    })

    const extraTagFilters: FilterOption[] = availableTags
      .filter((tag) => !defaultTagSet.has(tag.name))
      .map((tag) => ({
        key: `tag:${tag.name}`,
        label: `${formatTagLabel(tag.name)} (${tag.queryCount})`,
        tag: tag.name,
      }))

    const inlineFilters = [...BASE_FILTERS, ...inlineTagFilters]

    return {
      visibleFilters: inlineFilters,
      dropdownFilters: extraTagFilters,
      allFilters: [...inlineFilters, ...extraTagFilters],
    }
  }, [availableTags])

  useEffect(() => {
    const hasKnownFilter = allFilters.some(
      (option) => option.key === activeFilterKey,
    )
    const isCustomTagFilter = activeFilterKey.startsWith('tag:')

    if (!hasKnownFilter && !isCustomTagFilter) {
      setActiveFilterKey('all')
    }
  }, [allFilters, activeFilterKey])

  const activeFilter =
    allFilters.find((option) => option.key === activeFilterKey) ??
    (activeFilterKey.startsWith('tag:')
      ? {
          key: activeFilterKey,
          label: formatTagLabel(activeFilterKey.slice(4)),
          tag: activeFilterKey.slice(4),
        }
      : allFilters[0])

  const activeDropdownFilter =
    dropdownFilters.find((option) => option.key === activeFilterKey) ??
    (activeFilter.tag &&
    !visibleFilters.some((option) => option.key === activeFilter.key)
      ? activeFilter
      : undefined)

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: [
      'community-discover',
      activeFilter.filter,
      activeFilter.tag,
      sortMode,
      debouncedSearch,
    ],
    queryFn: ({ pageParam = 0 }) =>
      getCommunityQueriesPage({
        filter: activeFilter.filter,
        tag: activeFilter.tag,
        sort: sortMode,
        limit: 12,
        offset: pageParam,
        search: debouncedSearch.trim() || undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.nextOffset : undefined,
  })

  const rows = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  )

  const guestFavoriteIds = useMemo(
    () => new Set(guestFavorites?.favoriteQueryIds ?? []),
    [guestFavorites?.favoriteQueryIds],
  )
  const myFavoriteIdSet = useMemo(
    () => new Set(myFavoriteIds?.favoriteQueryIds ?? []),
    [myFavoriteIds?.favoriteQueryIds],
  )
  const guestFavoritesCount = guestFavorites?.favoritesCount ?? 0
  const guestFavoritesBadgeLabel =
    guestFavoritesCount > 99 ? '99+' : String(guestFavoritesCount)
  const guestFavoritesMax = guestFavorites?.maxFavorites ?? 10

  // Server-side search, so just use rows
  const filteredRows = rows
  const resultsCount = filteredRows.length

  const sortLabel =
    sortOptions.find((option) => option.value === sortMode)?.label ??
    'Created date (newest first)'

  function handleToggleFavorite(queryId: string, isFavorited: boolean) {
    if (user) {
      if (isFavorited) {
        unfavoriteMutation.mutate(queryId)
        return
      }

      favoriteMutation.mutate(queryId)
      return
    }

    if (isFavorited) {
      guestUnfavoriteMutation.mutate(queryId)
      return
    }

    guestFavoriteMutation.mutate(queryId)
  }

  function handleFork(queryId: string) {
    if (forkMutation.isPending) {
      return
    }

    forkMutation.mutate(queryId)
  }

  function handleRemoveGuestFavorite(queryId: string) {
    guestUnfavoriteMutation.mutate(queryId)
  }

  function handleClearGuestFavorites() {
    const ids = Array.from(guestFavoriteIds)
    if (ids.length === 0) {
      return
    }

    clearGuestFavoritesMutation.mutate(ids)
  }

  async function handleCopySearchLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Search link copied.')
    } catch {
      toast.error('Could not copy link.')
    }
  }

  return (
    <>
      <PageShell
        headerPrefix={user ? undefined : 'PokeQuery'}
        title="Discover"
        subtitle="Browse popular and recently updated community search strings."
        contentHeaderVariant="floating"
        headerControls={
          <div className="flex w-full items-center gap-2 md:ml-auto md:max-w-xl">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search strings..."
                className="h-10 rounded-full pr-10"
                style={{ paddingLeft: '2.75rem' }}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                aria-label="Search strings"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                type="text"
              />
              {searchTerm && (
                <button
                  type="button"
                  tabIndex={0}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-base text-muted-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                  onClick={() => setSearchTerm('')}
                >
                  <span
                    className="pointer-events-none select-none"
                    aria-hidden="true"
                  >
                    ×
                  </span>
                </button>
              )}
            </div>
            {user ? (
              <Button
                className="shrink-0 rounded-full px-3 sm:px-4"
                onClick={() => {
                  void navigate({ to: '/library', search: { create: '1' } })
                }}
              >
                <PlusIcon />
                <span>New String</span>
              </Button>
            ) : (
              <>
                {guestFavoritesCount > 0 ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="relative shrink-0 cursor-pointer rounded-xl shadow-sm"
                    onClick={() => setIsDrawerOpen(true)}
                  >
                    <HeartIcon className="size-4" />
                    <span>Favorites</span>
                    <span className="absolute -right-2 -top-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                      {guestFavoritesBadgeLabel}
                    </span>
                  </Button>
                ) : null}
                <Button
                  variant="default"
                  size="sm"
                  className="shrink-0 cursor-pointer rounded-xl px-4 shadow-sm"
                  onClick={() => {
                    window.location.href = '/login'
                  }}
                >
                  Log in
                </Button>
              </>
            )}
          </div>
        }
      >
        <section className="-mx-6 -mt-5 border-b border-border/60 px-6 py-3 md:-mx-6 lg:-mx-6">
          <div className="flex flex-wrap items-center gap-2">
            {visibleFilters.map((filter) => (
              <Button
                key={filter.key}
                variant={activeFilterKey === filter.key ? 'outline' : 'ghost'}
                size="sm"
                className="rounded-xl px-4"
                onClick={() => setActiveFilterKey(filter.key)}
              >
                {filter.label}
              </Button>
            ))}
            {dropdownFilters.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant={activeDropdownFilter ? 'outline' : 'ghost'}
                      size="sm"
                      className="rounded-xl px-4"
                    >
                      {activeDropdownFilter?.label ?? 'More tags'}
                      <ChevronsUpDownIcon className="ml-1" />
                    </Button>
                  }
                />
                <DropdownMenuContent
                  align="start"
                  className="min-w-56 sm:min-w-72"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>More tags</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuRadioGroup
                    value={activeDropdownFilter?.key ?? ''}
                    onValueChange={setActiveFilterKey}
                  >
                    {dropdownFilters.map((filter) => (
                      <DropdownMenuRadioItem
                        key={filter.key}
                        value={filter.key}
                      >
                        {filter.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </section>

        <div className="pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              {resultsCount} search strings found
            </p>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="rounded-xl"
                      aria-label="Share"
                      onClick={() => {
                        void handleCopySearchLink()
                      }}
                    >
                      <Share2Icon className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent>Share</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm" className="rounded-xl">
                      Sort by: {sortLabel}
                      <ChevronsUpDownIcon className="ml-1" />
                    </Button>
                  }
                />
                <DropdownMenuContent
                  align="end"
                  className="min-w-56 sm:min-w-72"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Sort order</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuRadioGroup
                    value={sortMode}
                    onValueChange={(value) => setSortMode(value as SortMode)}
                  >
                    {sortOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {error instanceof ApiRequestError ? (
            <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Failed to load community strings ({error.status}).
            </p>
          ) : null}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading community strings...
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRows.map((card: CommunityQuery) => (
              <SearchStringCard
                key={card.id}
                card={card}
                variant="discover"
                isAuthenticated={Boolean(user)}
                isFavorited={
                  user
                    ? myFavoriteIdSet.has(card.id)
                    : guestFavoriteIds.has(card.id)
                }
                isFavoritePending={
                  favoriteMutation.isPending ||
                  unfavoriteMutation.isPending ||
                  guestFavoriteMutation.isPending ||
                  guestUnfavoriteMutation.isPending
                }
                onToggleFavorite={handleToggleFavorite}
                onFork={handleFork}
                isForkPending={forkMutation.isPending}
              />
            ))}
          </div>

          {!isLoading && filteredRows.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No community strings matched this filter.
            </p>
          ) : null}

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
        </div>
      </PageShell>

      <GuestFavoritesDrawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        favoriteQueryIds={Array.from(guestFavoriteIds)}
        favoritesCount={guestFavoritesCount}
        maxFavorites={guestFavoritesMax}
        isRemovingFavorite={guestUnfavoriteMutation.isPending}
        removingFavoriteId={guestUnfavoriteMutation.variables ?? null}
        isClearingFavorites={clearGuestFavoritesMutation.isPending}
        onRemoveFavorite={handleRemoveGuestFavorite}
        onClearFavorites={handleClearGuestFavorites}
      />
    </>
  )
}
