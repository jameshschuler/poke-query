import { useAuth } from '@authabase/react'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
  ChevronsUpDownIcon,
  CopyIcon,
  GitForkIcon,
  HeartIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react'

import { Button } from '#/components/ui/button'
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

export const Route = createFileRoute('/discover')({
  ssr: false,
  component: DiscoverPage,
})

type SortMode = 'created_desc' | 'created_asc' | 'title_asc' | 'title_desc'

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: 'created_desc', label: 'Created date (newest first)' },
  { value: 'created_asc', label: 'Created date (oldest first)' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
]

function DiscoverPage() {
  const { user } = useAuth()
  const [sortMode, setSortMode] = useState<SortMode>('created_desc')

  const filters = [
    'All',
    'Popular',
    'New',
    'PvP',
    'Raid',
    'IV Hunt',
    'Utility',
    'Community Day',
    'Collection',
  ]

  const resultCards = [
    {
      title: 'Max IV Attackers',
      query: '4*&!traded&cp2500-',
      author: 'IvyTrainer99',
      category: 'IV Hunt',
      likes: 142,
      forks: 38,
      createdAt: '2026-05-13T11:40:00.000Z',
    },
    {
      title: 'Great League Ready',
      query: 'cp1490-&(lucky,shadow)',
      author: 'BattleAce',
      category: 'PvP',
      likes: 89,
      forks: 21,
      createdAt: '2026-05-14T09:05:00.000Z',
    },
    {
      title: 'Fire Raid Counters',
      query: 'type:fire&4*,3*&cp2000+',
      author: 'RaidKing',
      category: 'Raid',
      likes: 57,
      forks: 12,
      createdAt: '2026-05-12T18:20:00.000Z',
    },
    {
      title: 'Weekly New Catches',
      query: 'date:7-&!transfered',
      author: 'DailyGrinder',
      category: 'Utility',
      likes: 34,
      forks: 9,
      createdAt: '2026-05-11T08:15:00.000Z',
    },
    {
      title: 'Shadow Attackers',
      query: 'shadow&4*&cp2500-',
      author: 'GhostHunter',
      category: 'IV Hunt',
      likes: 28,
      forks: 7,
      createdAt: '2026-05-10T20:40:00.000Z',
    },
    {
      title: 'Shiny Collection',
      query: 'shiny&!traded',
      author: 'ShinyMax',
      category: 'Collection',
      likes: 19,
      forks: 4,
      createdAt: '2026-05-09T14:10:00.000Z',
    },
  ]

  const sortedCards = useMemo(() => {
    const cards = [...resultCards]

    if (sortMode === 'created_asc') {
      cards.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
    } else if (sortMode === 'created_desc') {
      cards.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    } else if (sortMode === 'title_asc') {
      cards.sort((a, b) => a.title.localeCompare(b.title))
    } else {
      cards.sort((a, b) => b.title.localeCompare(a.title))
    }

    return cards
  }, [sortMode])

  const resultsCount = sortedCards.length

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
              className="h-10 rounded-full pr-4"
              style={{ paddingLeft: '2.75rem' }}
            />
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
          {filters.map((filter, index) => (
            <Button
              key={filter}
              variant={index === 0 ? 'outline' : 'ghost'}
              size="sm"
              className="rounded-xl px-4"
            >
              {filter}
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedCards.map((card) => (
              <article
                key={card.title}
                className="overflow-hidden rounded-2xl border border-border/60 bg-background/70"
              >
                <div className="space-y-4 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold leading-tight">
                      {card.title}
                    </h3>
                    <span className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                      {card.category}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-card px-4 py-3 font-mono text-lg text-muted-foreground">
                    {card.query}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    by {card.author}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-border/60 bg-card/60 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl">
                      <CopyIcon />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      <HeartIcon />
                      Favorite
                    </Button>
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

                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <HeartIcon className="size-4" />
                    {card.likes} · {card.forks} forks
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
