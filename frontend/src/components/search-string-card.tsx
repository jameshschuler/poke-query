import { Link } from '@tanstack/react-router'
import {
  CopyIcon,
  EyeIcon,
  GitForkIcon,
  HeartIcon,
  Loader2Icon,
} from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { copyQuery } from '#/lib/poke-query-api'
import type { CommunityQuery, TrainerPublicQuery } from '#/lib/poke-query-api'
import { formatTagLabel } from '#/lib/utils'

type SearchStringCardProps = {
  card: CommunityQuery | TrainerPublicQuery
  variant: 'discover' | 'trainer'
  isAuthenticated: boolean
  isFavorited?: boolean
  isFavoritePending?: boolean
  onToggleFavorite?: (queryId: string, isFavorited: boolean) => void
  onFork?: (queryId: string) => void
  isForkPending?: boolean
}

function isCommunityQuery(
  card: CommunityQuery | TrainerPublicQuery,
): card is CommunityQuery {
  return 'updatedAt' in card && 'creator' in card
}

export function SearchStringCard({
  card,
  variant,
  isAuthenticated,
  isFavorited = false,
  isFavoritePending = false,
  onToggleFavorite,
  onFork,
  isForkPending = false,
}: SearchStringCardProps) {
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    [],
  )

  const firstTag = card.autoTags[0]

  const handleCopy = () => {
    void navigator.clipboard.writeText(card.query).then(() => {
      void copyQuery(card.id)
      toast.success('Copied to clipboard!')
    })
  }

  const canFork = isAuthenticated && typeof onFork === 'function'
  const canToggleFavorite =
    isAuthenticated && typeof onToggleFavorite === 'function'

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/70">
      <div className="flex-1 space-y-4 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Link
              to="/queries/$queryId"
              params={{ queryId: card.id }}
              className="hover:underline"
            >
              <h3 className="truncate text-lg font-semibold leading-tight">
                {card.title}
              </h3>
            </Link>

            {variant === 'discover' ? (
              <div className="mt-1 flex flex-wrap gap-2">
                {card.autoTags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {formatTagLabel(tag)}
                  </Badge>
                ))}
              </div>
            ) : firstTag ? (
              <div className="mt-1">
                <span className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                  {formatTagLabel(firstTag)}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-h-24 rounded-xl border border-border/70 bg-card px-4 py-3 font-mono text-lg text-muted-foreground">
          <pre className="line-clamp-3 whitespace-pre-wrap break-words">
            {card.query}
          </pre>
        </div>

        {card.description ? (
          <p className="text-sm text-muted-foreground">{card.description}</p>
        ) : null}

        {variant === 'discover' && isCommunityQuery(card) ? (
          <div className="flex min-h-16 items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar size="sm" className="shrink-0">
                {card.creator?.avatarUrl ? (
                  <AvatarImage src={card.creator.avatarUrl} />
                ) : null}
                <AvatarFallback>
                  {(card.creator?.username ?? 'Anonymous')
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {card.creator?.username ? (
                    <Link
                      to="/trainers/$username"
                      params={{ username: card.creator.username }}
                      className="hover:underline"
                    >
                      {card.creator.displayName}
                    </Link>
                  ) : (
                    'Anonymous trainer'
                  )}
                </p>
              </div>
            </div>

            <p className="shrink-0 text-xs text-muted-foreground">
              {dateFormatter.format(new Date(card.updatedAt))}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-24 flex-col items-center justify-center gap-2 border-t border-border/60 bg-card/60 px-5 py-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="cursor-pointer rounded-xl"
                  aria-label="Copy"
                  onClick={handleCopy}
                >
                  <CopyIcon className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>

          {canToggleFavorite ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className={`rounded-xl ${
                      isFavorited
                        ? 'border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-600'
                        : ''
                    } cursor-pointer`}
                    disabled={isFavoritePending}
                    aria-label={isFavorited ? 'Favorited' : 'Favorite'}
                    onClick={() => {
                      onToggleFavorite(card.id, isFavorited)
                    }}
                  >
                    <HeartIcon
                      className={`size-4 ${isFavorited ? 'fill-current text-rose-600' : ''}`}
                    />
                  </Button>
                }
              />
              <TooltipContent>
                {isFavorited ? 'Favorited' : 'Favorite'}
              </TooltipContent>
            </Tooltip>
          ) : null}

          {variant === 'discover' && canFork ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="cursor-pointer rounded-xl"
                    disabled={isForkPending}
                    aria-label="Fork"
                    onClick={() => onFork(card.id)}
                  >
                    {isForkPending ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <GitForkIcon className="size-4" />
                    )}
                  </Button>
                }
              />
              <TooltipContent>Fork</TooltipContent>
            </Tooltip>
          ) : null}

          {variant === 'trainer' && canFork ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="cursor-pointer rounded-xl"
                    disabled={isForkPending}
                    aria-label="Fork"
                    onClick={() => onFork(card.id)}
                  >
                    {isForkPending ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <GitForkIcon className="size-4" />
                    )}
                  </Button>
                }
              />
              <TooltipContent>Fork</TooltipContent>
            </Tooltip>
          ) : variant === 'trainer' ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    to="/queries/$queryId"
                    params={{ queryId: card.id }}
                    className="inline-flex"
                  >
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="cursor-pointer rounded-xl"
                      aria-label="View"
                    >
                      <EyeIcon className="size-4" />
                    </Button>
                  </Link>
                }
              />
              <TooltipContent>View</TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
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
  )
}
