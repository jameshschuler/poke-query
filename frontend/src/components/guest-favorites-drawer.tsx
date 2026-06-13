import { Link } from '@tanstack/react-router'
import {
  HeartIcon,
  Loader2Icon,
  CopyIcon,
  GitForkIcon,
  XIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer'
import { Badge } from '#/components/ui/badge'
import { getQueryById } from '#/lib/poke-query-api'
import type { QueryDetail } from '#/lib/poke-query-api'
import { formatTagLabel } from '#/lib/utils'

type GuestFavoritesDrawerProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  favoriteQueryIds: string[]
  favoritesCount: number
  maxFavorites: number
}

export function GuestFavoritesDrawer({
  isOpen,
  onOpenChange,
  favoriteQueryIds,
  favoritesCount,
  maxFavorites,
}: GuestFavoritesDrawerProps) {
  const { data: queries = [], isLoading } = useQuery({
    queryKey: ['guest-favorites-queries', favoriteQueryIds],
    queryFn: async () => {
      const queryPromises = favoriteQueryIds.map((id) =>
        getQueryById(id).catch(() => null),
      )
      const results = await Promise.all(queryPromises)
      return results.filter((q): q is QueryDetail => q !== null)
    },
    enabled: isOpen && favoriteQueryIds.length > 0,
  })

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
      <DrawerContent>
        <DrawerHeader className="flex flex-row shrink-0 items-center justify-between gap-4 px-4 py-3">
          <DrawerTitle>My Favorites</DrawerTitle>
          <DrawerClose asChild>
            <button
              type="button"
              className="rounded-lg p-1 hover:bg-accent"
              aria-label="Close drawer"
            >
              <XIcon className="size-5" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-6 pt-2">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Loading favorites...
                </p>
              </div>
            </div>
          ) : queries.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <HeartIcon className="mx-auto size-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No favorites yet.
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Favorite up to {maxFavorites} queries without an account.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
              {queries.map((query) => (
                <Link
                  key={query.id}
                  to="/queries/$queryId"
                  params={{ queryId: query.id }}
                  className="block hover:opacity-75"
                >
                  <article className="space-y-3 overflow-hidden rounded-2xl border border-border/60 bg-background/70 px-5 py-4">
                    <div>
                      <h3 className="truncate text-base font-semibold leading-tight">
                        {query.title}
                      </h3>

                      {query.autoTags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {query.autoTags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {formatTagLabel(tag)}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {query.description ? (
                      <p className="text-sm text-muted-foreground">
                        {query.description}
                      </p>
                    ) : null}

                    {query.creator ? (
                      <p className="text-xs text-muted-foreground">
                        by {query.creator.username}
                      </p>
                    ) : null}

                    <div className="flex gap-3 pt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CopyIcon className="size-3" />
                        {query.copyCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <HeartIcon className="size-3" />
                        {query.favoriteCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitForkIcon className="size-3" />
                        {query.forkCount}
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
