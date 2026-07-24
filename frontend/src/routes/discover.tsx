import { useAuth } from '#/lib/auth-context'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState, useEffect, useRef } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  Loader2Icon,
  PlusIcon,
  Share2Icon,
  SearchIcon,
  UserIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
  getCommunityQueriesPage,
  getCommunitySurfacing,
  favoriteQuery,
  getMyFavoriteIds,
  forkQuery,
  getQueryTags,
  unfavoriteQuery,
  trackDiscoverEvents,
  ApiRequestError,
} from '#/lib/poke-query-api'
import { getMutationErrorMessage } from '#/lib/mutation-toast'
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
import { PageShell } from '#/components/page-shell'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { formatTagLabel } from '#/lib/utils'

type FilterOption = {
  key: string
  label: string
  filter?: 'all' | 'new' | 'popular' | 'official'
  tag?: string
}

const BASE_FILTERS: FilterOption[] = [
  { key: 'all', label: 'All', filter: 'all' },
  { key: 'official', label: 'Official', filter: 'official' },
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

type DiscoverSearch = {
  q?: string
  filter?: string
}

type DiscoverRail =
  | 'weekly_picks'
  | 'featured_today'
  | 'all_time_trusted'
  | 'contextual_picks'
  | 'default'

const DISCOVER_SESSION_STORAGE_KEY = 'poke-query:discover-session-key'
const FEATURED_PAGE_SIZE = 3

function getDiscoverSessionKey() {
  if (typeof window === 'undefined') {
    return 'discover-server-session'
  }

  const existing = window.localStorage.getItem(DISCOVER_SESSION_STORAGE_KEY)
  if (existing) {
    return existing
  }

  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `discover_${Date.now()}_${Math.random().toString(36).slice(2)}`

  window.localStorage.setItem(DISCOVER_SESSION_STORAGE_KEY, generated)
  return generated
}

export const Route = createFileRoute('/discover')({
  ssr: false,
  validateSearch: (search): DiscoverSearch => {
    const q =
      typeof search.q === 'string' && search.q.trim().length > 0
        ? search.q
        : undefined

    const filter =
      typeof search.filter === 'string' && search.filter.trim().length > 0
        ? search.filter
        : undefined

    return {
      q,
      filter,
    }
  },
  component: DiscoverPage,
})

function DiscoverPage() {
  const navigate = useNavigate()
  const routeSearch = Route.useSearch()
  const { user, startAnonymousSession } = useAuth()
  const queryClient = useQueryClient()
  const [activeFilterKey, setActiveFilterKey] = useState(
    routeSearch.filter ?? 'new',
  )
  const [searchTerm, setSearchTerm] = useState(routeSearch.q ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(routeSearch.q ?? '')
  const [isStartingAnonymousSession, setIsStartingAnonymousSession] =
    useState(false)
  const [railPageByKey, setRailPageByKey] = useState<Record<string, number>>({})
  const [railTransitionByKey, setRailTransitionByKey] = useState<
    Record<string, 'prev' | 'next' | null>
  >({})
  const discoverSessionKey = useMemo(() => getDiscoverSessionKey(), [])
  const sentImpressionKeysRef = useRef(new Set<string>())

  const { data: availableTags = [] } = useQuery({
    queryKey: ['query-tags'],
    queryFn: getQueryTags,
    staleTime: 5 * 60_000,
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
      toast.success('Saved to favorites.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-favorite-ids'] }),
        queryClient.invalidateQueries({ queryKey: ['my-favorites-page'] }),
      ])
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, 'Could not save favorite.'))
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
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, 'Could not remove favorite.'))
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
    onError: (error: unknown) => {
      if (error instanceof ApiRequestError && error.status === 404) {
        toast.error(
          'This string can’t be forked because the original is private or no longer exists.',
        )
        return
      }

      toast.error(getMutationErrorMessage(error, 'Could not fork string.'))
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
    const nextFilter = routeSearch.filter ?? 'new'

    setSearchTerm((current) => (current === nextQ ? current : nextQ))
    setDebouncedSearch((current) => (current === nextQ ? current : nextQ))
    setActiveFilterKey((current) =>
      current === nextFilter ? current : nextFilter,
    )
  }, [routeSearch.filter, routeSearch.q])

  useEffect(() => {
    void navigate({
      to: '/discover',
      search: {
        q: debouncedSearch.trim().length > 0 ? debouncedSearch : undefined,
        filter: activeFilterKey,
      },
      replace: true,
    })
  }, [activeFilterKey, debouncedSearch, navigate])

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
      setActiveFilterKey('new')
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
  const activeDropdownLabel = activeDropdownFilter?.label

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
      debouncedSearch,
    ],
    queryFn: ({ pageParam = 0 }) =>
      getCommunityQueriesPage({
        filter: activeFilter.filter,
        tag: activeFilter.tag,
        limit: 12,
        offset: pageParam,
        search: debouncedSearch.trim() || undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.nextOffset : undefined,
  })

  const { data: surfacingData } = useQuery({
    queryKey: [
      'community-surfacing',
      activeFilter.filter,
      activeFilter.tag,
      debouncedSearch,
    ],
    queryFn: () =>
      getCommunitySurfacing({
        filter: activeFilter.filter,
        tag: activeFilter.tag,
        search: debouncedSearch.trim() || undefined,
        railLimit: 6,
      }),
    staleTime: 2 * 60_000,
  })

  const rows = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  )

  const myFavoriteIdSet = useMemo(
    () => new Set(myFavoriteIds?.favoriteQueryIds ?? []),
    [myFavoriteIds?.favoriteQueryIds],
  )

  // Server-side search, so just use rows
  const filteredRows = rows
  const resultsCount = filteredRows.length

  const railSections = useMemo(
    () => [
      {
        key: 'weekly_picks' as const,
        title: 'Weekly Picks',
        subtitle: 'Hand-picked highlights for the current raid rotation.',
        items: surfacingData?.weeklyPicks ?? [],
      },
      {
        key: 'featured_today' as const,
        title: 'Featured Today',
        subtitle:
          'Daily rotating picks selected from trusted high-quality strings.',
        items: surfacingData?.featuredToday ?? [],
      },
      {
        key: 'all_time_trusted' as const,
        title: 'All-Time Trusted',
        subtitle:
          'Most reliable strings by quality score and durable engagement.',
        items: surfacingData?.allTimeTrusted ?? [],
      },
    ],
    [surfacingData],
  )

  useEffect(() => {
    setRailPageByKey((current) => {
      let changed = false
      const next = { ...current }

      for (const section of railSections) {
        const maxPage = Math.max(
          0,
          Math.ceil(section.items.length / FEATURED_PAGE_SIZE) - 1,
        )
        const currentPage = current[section.key] ?? 0

        if (currentPage > maxPage) {
          next[section.key] = maxPage
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [railSections])

  const pagedRailSections = useMemo(
    () =>
      railSections.map((section) => {
        const totalPages = Math.max(
          1,
          Math.ceil(section.items.length / FEATURED_PAGE_SIZE),
        )
        const maxPage = totalPages - 1
        const currentPage = Math.min(railPageByKey[section.key] ?? 0, maxPage)
        const start = currentPage * FEATURED_PAGE_SIZE
        const end = start + FEATURED_PAGE_SIZE

        return {
          ...section,
          totalPages,
          currentPage,
          pageItems: section.items.slice(start, end),
          shownStart: section.items.length > 0 ? start + 1 : 0,
          shownEnd: Math.min(end, section.items.length),
        }
      }),
    [railPageByKey, railSections],
  )

  useEffect(() => {
    const events = pagedRailSections.flatMap((section) =>
      section.pageItems.map((item) => ({
        queryId: item.id,
        rail: section.key,
        eventType: 'impression' as const,
      })),
    )

    const unsent = events.filter((event) => {
      const key = `${event.rail}:${event.queryId}`
      if (sentImpressionKeysRef.current.has(key)) {
        return false
      }

      sentImpressionKeysRef.current.add(key)
      return true
    })

    if (unsent.length === 0) {
      return
    }

    void trackDiscoverEvents(discoverSessionKey, unsent).catch(() => {
      // Telemetry failures should never block discover browsing.
    })
  }, [discoverSessionKey, pagedRailSections])

  function handleRailPageChange(railKey: string, direction: 'prev' | 'next') {
    const section = pagedRailSections.find((item) => item.key === railKey)
    if (!section) {
      return
    }

    const currentPage = railPageByKey[railKey] ?? 0
    const nextPage =
      direction === 'prev'
        ? Math.max(0, currentPage - 1)
        : Math.min(section.totalPages - 1, currentPage + 1)

    if (nextPage === currentPage) {
      return
    }

    setRailTransitionByKey((current) => ({
      ...current,
      [railKey]: direction,
    }))

    setRailPageByKey((current) => ({
      ...current,
      [railKey]: nextPage,
    }))

    const clearTransition = () => {
      setRailTransitionByKey((current) => ({
        ...current,
        [railKey]: null,
      }))
    }

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(clearTransition)
      })
      return
    }

    setTimeout(clearTransition, 0)
  }

  function handleToggleFavorite(queryId: string, isFavorited: boolean) {
    if (isFavorited) {
      unfavoriteMutation.mutate(queryId)
      return
    }

    favoriteMutation.mutate(queryId)
  }

  function handleFork(queryId: string) {
    if (forkMutation.isPending) {
      return
    }

    forkMutation.mutate(queryId)
  }

  async function handleCopySearchLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Search link copied.')
    } catch {
      toast.error('Could not copy link.')
    }
  }

  function trackDiscoverEvent(
    queryId: string,
    rail: DiscoverRail,
    eventType: 'detail_click' | 'copy_action',
  ) {
    void trackDiscoverEvents(discoverSessionKey, [
      {
        queryId,
        rail,
        eventType,
      },
    ]).catch(() => {
      // Ignore telemetry failure.
    })
  }

  async function handleCreateString() {
    if (isStartingAnonymousSession) {
      return
    }

    setIsStartingAnonymousSession(true)

    try {
      await startAnonymousSession()
      await navigate({ to: '/library/new' })
    } catch {
      toast.error('Could not start your session. Please try again.')
    } finally {
      setIsStartingAnonymousSession(false)
    }
  }

  return (
    <>
      <PageShell
        headerPrefix={user ? undefined : 'PokeQuery'}
        title="Discover"
        subtitle="Explore weekly picks, featured quality strings, and trusted all-time favorites."
        contentHeaderVariant="floating"
        outsideCardContent={
          pagedRailSections.some((section) => section.items.length > 0) ? (
            <div className="flex flex-col gap-8 sm:gap-4">
              {pagedRailSections.map((section) =>
                section.items.length > 0 ? (
                  <section
                    key={section.key}
                    className={`rounded-3xl border px-4 py-5 sm:px-6 sm:py-6 shadow-sm ${
                      section.key === 'weekly_picks'
                        ? 'border-amber-300/70 bg-linear-to-br from-amber-50/90 via-card/95 to-card/95 dark:border-amber-700/50 dark:from-amber-950/25'
                        : section.key === 'featured_today'
                          ? 'border-sky-300/70 bg-linear-to-br from-sky-50/80 via-card/95 to-card/95 dark:border-sky-700/50 dark:from-sky-950/25'
                          : 'border-border/70 bg-card/95'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0 flex flex-col items-start gap-3 sm:gap-1.5">
                          <h2
                            className={`font-semibold tracking-tight ${
                              section.key === 'weekly_picks'
                                ? 'text-2xl text-amber-900 dark:text-amber-100'
                                : section.key === 'featured_today'
                                  ? 'text-2xl text-sky-900 dark:text-sky-100'
                                  : 'text-lg'
                            }`}
                          >
                            {section.title}
                          </h2>
                          {section.key === 'weekly_picks' ? (
                            <p className="inline-flex w-fit items-center rounded-full border border-amber-300/70 bg-amber-100/90 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
                              Hand-picked
                            </p>
                          ) : section.key === 'featured_today' ? (
                            <p className="inline-flex w-fit items-center rounded-full border border-sky-300/70 bg-sky-100/90 px-2 py-0.5 text-xs font-semibold text-sky-800 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-200">
                              Daily rotation
                            </p>
                          ) : null}
                          <p className="text-sm text-muted-foreground">
                            {section.subtitle}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 sm:shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {section.shownStart}-{section.shownEnd} of{' '}
                            {section.items.length}
                          </span>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="rounded-xl"
                            aria-label={`Previous ${section.title} cards`}
                            disabled={section.currentPage === 0}
                            onClick={() =>
                              handleRailPageChange(section.key, 'prev')
                            }
                          >
                            <ChevronLeftIcon className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="rounded-xl"
                            aria-label={`Next ${section.title} cards`}
                            disabled={
                              section.currentPage >= section.totalPages - 1
                            }
                            onClick={() =>
                              handleRailPageChange(section.key, 'next')
                            }
                          >
                            <ChevronRightIcon className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <div
                        className={`grid gap-4 transition-all duration-300 ease-out will-change-transform motion-reduce:transform-none motion-reduce:transition-none ${
                          section.key === 'featured_today' ||
                          section.key === 'weekly_picks'
                            ? 'sm:grid-cols-2 md:grid-cols-3'
                            : 'sm:grid-cols-2 xl:grid-cols-3'
                        } ${
                          railTransitionByKey[section.key] === 'next'
                            ? 'translate-x-3 opacity-0 motion-reduce:opacity-100'
                            : railTransitionByKey[section.key] === 'prev'
                              ? '-translate-x-3 opacity-0 motion-reduce:opacity-100'
                              : 'translate-x-0 opacity-100'
                        }`}
                      >
                        {section.pageItems.map((card) => (
                          <SearchStringCard
                            key={`${section.key}:${card.id}`}
                            card={card}
                            variant="discover"
                            isAuthenticated={Boolean(user)}
                            discoverRail={section.key}
                            onOpenDetail={(queryId, rail) =>
                              trackDiscoverEvent(queryId, rail, 'detail_click')
                            }
                            onCopyTracked={(queryId, rail) =>
                              trackDiscoverEvent(queryId, rail, 'copy_action')
                            }
                            isFavorited={myFavoriteIdSet.has(card.id)}
                            isFavoritePending={
                              favoriteMutation.isPending ||
                              unfavoriteMutation.isPending
                            }
                            onToggleFavorite={handleToggleFavorite}
                            onFork={
                              user && card.creator?.id === user.id
                                ? undefined
                                : handleFork
                            }
                            isForkPending={forkMutation.isPending}
                          />
                        ))}
                      </div>
                    </div>
                  </section>
                ) : null,
              )}
            </div>
          ) : null
        }
        headerControls={
          <div className="flex w-full min-w-0 items-center gap-2 md:ml-auto md:max-w-xl">
            <div className="relative min-w-0 flex-1">
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
                  className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-base text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <div className="flex shrink-0 items-center gap-2">
              {user ? (
                <Button
                  nativeButton={false}
                  className="shrink-0 rounded-full px-3 sm:px-4"
                  render={<Link to="/library/new" />}
                >
                  <PlusIcon />
                  <span>New String</span>
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    className="shrink-0 rounded-full px-3 sm:px-4"
                    disabled={isStartingAnonymousSession}
                    onClick={() => {
                      void handleCreateString()
                    }}
                  >
                    {isStartingAnonymousSession ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <PlusIcon className="size-4" />
                    )}
                    <span>Create String</span>
                  </Button>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="cursor-pointer rounded-xl shadow-sm"
                          aria-label="Log in"
                          onClick={() => {
                            window.location.href = '/login'
                          }}
                        >
                          <UserIcon className="size-4" />
                        </Button>
                      }
                    />
                    <TooltipContent>Log in</TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
        }
      >
        <section className="-mx-6 -mt-6 rounded-t-3xl border-b border-border/70 bg-card/95 px-6 py-4 md:-mx-6 lg:-mx-6">
          <div className="flex flex-wrap items-center gap-2">
            {visibleFilters.map((filter) => (
              <Button
                key={filter.key}
                variant={activeFilterKey === filter.key ? 'outline' : 'ghost'}
                size="sm"
                className="rounded-xl px-4"
                aria-pressed={activeFilterKey === filter.key}
                aria-label={`Filter by ${filter.label}`}
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
                      aria-label={
                        activeDropdownLabel
                          ? `Open additional tag filters. Current: ${activeDropdownLabel}`
                          : 'Open additional tag filters'
                      }
                    >
                      <span className="truncate">
                        {activeDropdownLabel
                          ? `Tags: ${activeDropdownLabel}`
                          : 'More tags'}
                      </span>
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

        <div className="pt-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:flex-nowrap">
            <p
              className="text-sm text-muted-foreground whitespace-nowrap"
              aria-live="polite"
              role="status"
              aria-atomic="true"
            >
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
                      aria-label="Copy search link"
                      title="Copy search link"
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

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredRows.map((card) => (
              <SearchStringCard
                key={card.id}
                card={card}
                variant="discover"
                discoverRail="default"
                isAuthenticated={Boolean(user)}
                onOpenDetail={(queryId, rail) =>
                  trackDiscoverEvent(queryId, rail, 'detail_click')
                }
                onCopyTracked={(queryId, rail) =>
                  trackDiscoverEvent(queryId, rail, 'copy_action')
                }
                isFavorited={myFavoriteIdSet.has(card.id)}
                isFavoritePending={
                  favoriteMutation.isPending || unfavoriteMutation.isPending
                }
                onToggleFavorite={handleToggleFavorite}
                onFork={
                  user && card.creator?.id === user.id ? undefined : handleFork
                }
                isForkPending={forkMutation.isPending}
              />
            ))}
          </div>

          {!isLoading && filteredRows.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No community strings matched this filter.
            </p>
          ) : null}

          {hasNextPage ? (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                className="rounded-xl px-6"
                disabled={isFetchingNextPage}
                aria-busy={isFetchingNextPage}
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
    </>
  )
}
