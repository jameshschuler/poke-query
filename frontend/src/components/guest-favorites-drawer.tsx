import { Link } from '@tanstack/react-router'
import {
  HeartIcon,
  Loader2Icon,
  CopyIcon,
  GitForkIcon,
  XIcon,
  Trash2Icon,
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
import { Button } from '#/components/ui/button'
import { getQueryById } from '#/lib/poke-query-api'
import type { QueryDetail } from '#/lib/poke-query-api'
import { formatTagLabel } from '#/lib/utils'

type GuestFavoritesDrawerProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  favoriteQueryIds: string[]
  favoritesCount: number
  maxFavorites: number
  isRemovingFavorite?: boolean
  isClearingFavorites?: boolean
  removingFavoriteId?: string | null
  onRemoveFavorite: (queryId: string) => void
  onClearFavorites: () => void
}

export function GuestFavoritesDrawer({
  isOpen,
  onOpenChange,
  favoriteQueryIds,
  favoritesCount,
  maxFavorites,
  isRemovingFavorite = false,
  isClearingFavorites = false,
  removingFavoriteId = null,
  onRemoveFavorite,
  onClearFavorites,
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
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  {favoritesCount} / {maxFavorites} favorites
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-destructive hover:text-destructive"
                  onClick={() => onClearFavorites()}
                  disabled={isClearingFavorites || isRemovingFavorite}
                >
                  {isClearingFavorites ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2Icon className="size-3.5" />
                  )}
                  Clear all
                </Button>
              </div>

              {queries.map((query) => (
                <article
                  key={query.id}
                  className="space-y-3 overflow-hidden rounded-2xl border border-border/60 bg-background/70 px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/queries/$queryId"
                        params={{ queryId: query.id }}
                        className="block hover:opacity-75"
                      >
                        <h3 className="truncate text-base font-semibold leading-tight">
                          {query.title}
                        </h3>
                      </Link>

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

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveFavorite(query.id)}
                      disabled={
                        isClearingFavorites ||
                        (isRemovingFavorite && removingFavoriteId === query.id)
                      }
                      aria-label={`Remove ${query.title} from favorites`}
                    >
                      {isRemovingFavorite && removingFavoriteId === query.id ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        <XIcon className="size-4" />
                      )}
                    </Button>
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
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
