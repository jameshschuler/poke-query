import { useAuth } from '@authabase/react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState, useEffect } from 'react'
import {
  ChevronsUpDownIcon,
  CopyIcon,
  GitForkIcon,
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
  copyQuery,
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
import { Badge } from '#/components/ui/badge'

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
  label: string
  filter?: 'all' | 'new' | 'popular'
  tag?: string
}

const tagLabels: Record<string, string> = {
  pvp: 'PvP',
  raid: 'Raid',
  'high-iv': 'IV Hunt',
  'exclusion-filter': 'Utility',
  'daily-catch': 'Community Day',
  'legacy-moves': 'Collection',
}

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: 'created_desc', label: 'Created date (newest first)' },
  { value: 'created_asc', label: 'Created date (oldest first)' },
  { value: 'popular', label: 'Most popular' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
]

function DiscoverPage() {
  const { user } = useAuth()
  const [sortMode, setSortMode] = useState<SortMode>('created_desc')
  const [activeFilterLabel, setActiveFilterLabel] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 350)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    [],
  )

  const filters: FilterOption[] = [
    { label: 'All', filter: 'all' },
    { label: 'Popular', filter: 'popular' },
    { label: 'New', filter: 'new' },
    { label: 'Master League', tag: 'master-league' },
    { label: 'Ultra League', tag: 'ultra-league' },
    { label: 'Great League', tag: 'great-league' },
    { label: 'Raid', tag: 'raid' },
    { label: 'Community Day', tag: 'daily-catch' },
  ]

  const activeFilter =
    filters.find((option) => option.label === activeFilterLabel) ?? filters[0]

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

  // Server-side search, so just use rows
  const filteredRows = rows
  const resultsCount = filteredRows.length

  const sortLabel =
    sortOptions.find((option) => option.value === sortMode)?.label ??
    'Created date (newest first)'

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground md:text-base">
            PokeQuery
          </span>
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-base font-semibold md:text-lg">Discover</h1>
        </div>

        <div className="flex w-full max-w-xl items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search strings..."
              className="h-10 rounded-full pr-10"
              style={{ paddingLeft: '2.75rem' }}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search strings"
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
            <Button className="rounded-full px-4">
              <PlusIcon />
              New String
            </Button>
          ) : null}
        </div>
      </header>

      <section className="border-b border-border/60 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <Button
              key={filter.label}
              variant={activeFilterLabel === filter.label ? 'outline' : 'ghost'}
              size="sm"
              className="rounded-xl px-4"
              onClick={() => setActiveFilterLabel(filter.label)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </section>

      <main className="flex flex-1 flex-col p-4 md:p-6">
        <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          <h2 className="text-xl font-semibold">Discover</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse popular and recently updated community search strings.
          </p>

          {/* <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 text-lg font-semibold">{stat.value}</p>
              </div>
            ))}
          </div> */}

          <Separator className="my-5" />

          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
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
              <DropdownMenuContent align="end" className="min-w-72">
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
              <article
                key={card.id}
                className="overflow-hidden rounded-2xl border border-border/60 bg-background/70"
              >
                <div className="space-y-4 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <Link
                        to="/queries/$queryId"
                        params={{ queryId: card.id }}
                        className="hover:underline"
                      >
                        <h3 className="text-lg font-semibold leading-tight truncate">
                          {card.title}
                        </h3>
                      </Link>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {card.autoTags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tagLabels[tag] ?? tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-card px-4 py-3 font-mono text-lg text-muted-foreground">
                    {card.query}
                  </div>

                  {card.description ? (
                    <p className="text-sm text-muted-foreground">
                      {card.description}
                    </p>
                  ) : null}

                  <p className="text-sm text-muted-foreground">
                    by{' '}
                    {card.creator?.username ? (
                      <Link
                        to="/trainers/$username"
                        params={{ username: card.creator.username }}
                        className="hover:underline"
                      >
                        {card.creator.username}
                      </Link>
                    ) : (
                      'Anonymous trainer'
                    )}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Created {dateFormatter.format(new Date(card.createdAt))} ·
                    Updated {dateFormatter.format(new Date(card.updatedAt))}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-border/60 bg-card/60 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => {
                        void navigator.clipboard
                          .writeText(card.query)
                          .then(() => {
                            void copyQuery(card.id)
                            toast.success('Copied to clipboard!')
                          })
                      }}
                    >
                      <CopyIcon />
                      Copy
                    </Button>
                    {user ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                      >
                        <HeartIcon />
                        Favorite
                      </Button>
                    ) : null}
                    {user ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                      >
                        <GitForkIcon />
                        Fork
                      </Button>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CopyIcon className="size-4" />
                      {card.copyCount}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <HeartIcon className="size-4" />
                      {card.favoriteCount}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <GitForkIcon className="size-4" />
                      {card.forkCount}
                    </span>
                  </div>
                </div>
              </article>
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
        </section>
      </main>
    </div>
  )
}
