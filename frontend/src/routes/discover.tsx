import { useAuth } from '@authabase/react'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState, useEffect } from 'react'
import {
  ChevronsUpDownIcon,
  HeartIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import type { CommunityQuery } from '#/lib/poke-query-api'
import {
  getCommunityQueriesPage,
  favoriteGuestQuery,
  favoriteQuery,
  getGuestFavorites,
  getQueryTags,
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
import { Separator } from '#/components/ui/separator'
import { SearchStringCard } from '#/components/search-string-card'
import { GuestFavoritesDrawer } from '#/components/guest-favorites-drawer'
import { PageShell } from '#/components/page-shell'
import { formatTagLabel } from '#/lib/utils'

export const Route = createFileRoute('/discover')({
  ssr: false,
  component: DiscoverPage,
})

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

function DiscoverPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [sortMode, setSortMode] = useState<SortMode>('created_desc')
  const [activeFilterKey, setActiveFilterKey] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
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

  const favoriteMutation = useMutation({
    mutationFn: favoriteQuery,
    onSuccess: () => {
      toast.success('Saved to favorites!')
    },
    onError: () => {
      toast.error('Could not save favorite.')
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

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 350)
    return () => clearTimeout(handler)
  }, [searchTerm])

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
    if (!allFilters.some((option) => option.key === activeFilterKey)) {
      setActiveFilterKey('all')
    }
  }, [allFilters, activeFilterKey])

  const activeFilter =
    allFilters.find((option) => option.key === activeFilterKey) ?? allFilters[0]

  const activeDropdownFilter = dropdownFilters.find(
    (option) => option.key === activeFilterKey,
  )

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
  const guestFavoritesCount = guestFavorites?.favoritesCount ?? 0
  const guestFavoritesMax = guestFavorites?.maxFavorites ?? 10

  // Server-side search, so just use rows
  const filteredRows = rows
  const resultsCount = filteredRows.length

  const sortLabel =
    sortOptions.find((option) => option.value === sortMode)?.label ??
    'Created date (newest first)'

  function handleToggleFavorite(queryId: string, isFavorited: boolean) {
    if (user) {
      favoriteMutation.mutate(queryId)
      return
    }

    if (isFavorited) {
      guestUnfavoriteMutation.mutate(queryId)
      return
    }

    guestFavoriteMutation.mutate(queryId)
  }

  return (
    <>
      <PageShell
        headerPrefix={user ? undefined : 'PokeQuery'}
        title="Discover"
        subtitle="Browse popular and recently updated community search strings."
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
              <Button className="shrink-0 rounded-full px-3 sm:px-4">
                <PlusIcon />
                <span>New String</span>
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0 cursor-pointer rounded-xl shadow-sm"
                  onClick={() => setIsDrawerOpen(true)}
                >
                  <HeartIcon className="size-4" />
                  <span>Favorites</span>
                </Button>
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
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="rounded-xl">
                    Sort by: {sortLabel}
                    <ChevronsUpDownIcon className="ml-1" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-56 sm:min-w-72">
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
                isFavorited={!user && guestFavoriteIds.has(card.id)}
                isFavoritePending={
                  favoriteMutation.isPending ||
                  guestFavoriteMutation.isPending ||
                  guestUnfavoriteMutation.isPending
                }
                onToggleFavorite={handleToggleFavorite}
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
      />
    </>
  )
}
