import { Link } from '@tanstack/react-router'
import {
  CopyIcon,
  EyeIcon,
  GitForkIcon,
  HeartIcon,
  Loader2Icon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { OfficialTrainerBadge } from '#/components/official-trainer-badge'
import { copyQuery } from '#/lib/poke-query-api'
import type { CommunityQuery, TrainerPublicQuery } from '#/lib/poke-query-api'
import {
  formatCompactNumber,
  formatFullNumber,
  formatTagLabel,
} from '#/lib/utils'

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

function getSourceBadge(source: CommunityQuery['source']): {
  label: string
  className: string
} | null {
  if (source === 'official') {
    return {
      label: 'Official',
      className:
        'border-emerald-300/70 bg-emerald-100/80 text-emerald-800 hover:bg-emerald-100/80',
    }
  }

  if (source === 'community') {
    return {
      label: 'Community',
      className:
        'border-sky-300/70 bg-sky-100/80 text-sky-800 hover:bg-sky-100/80',
    }
  }

  return null
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
  const discoverSourceBadge =
    variant === 'discover' && isCommunityQuery(card)
      ? getSourceBadge(card.source)
      : null
  const [displayCopyCount, setDisplayCopyCount] = useState(card.copyCount)
  const [isCopyPending, setIsCopyPending] = useState(false)

  useEffect(() => {
    setDisplayCopyCount(card.copyCount)
    setIsCopyPending(false)
  }, [card.id, card.copyCount])

  const handleCopy = () => {
    if (isCopyPending) {
      return
    }

    setIsCopyPending(true)

    void navigator.clipboard
      .writeText(card.query)
      .then(async () => {
        setDisplayCopyCount((current) => current + 1)
        toast.success('Copied to clipboard!')

        try {
          await copyQuery(card.id)
        } catch {
          setDisplayCopyCount((current) => Math.max(0, current - 1))
        }
      })
      .catch(() => {
        toast.error('Could not copy string.')
      })
      .finally(() => {
        setIsCopyPending(false)
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
                {discoverSourceBadge ? (
                  <Badge className={discoverSourceBadge.className}>
                    {discoverSourceBadge.label}
                  </Badge>
                ) : null}
                {card.autoTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-border/70 bg-card text-muted-foreground"
                  >
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
                <div className="flex min-w-0 items-center gap-2">
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
                  <OfficialTrainerBadge username={card.creator?.username} />
                </div>
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
                  disabled={isCopyPending}
                  onClick={handleCopy}
                >
                  {isCopyPending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
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
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="flex items-center gap-1.5">
                  <CopyIcon className="size-4" />
                  {formatCompactNumber(displayCopyCount)}
                </span>
              }
            />
            <TooltipContent>
              {formatFullNumber(displayCopyCount)}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="flex items-center gap-1.5">
                  <HeartIcon className="size-4" />
                  {formatCompactNumber(card.favoriteCount)}
                </span>
              }
            />
            <TooltipContent>
              {formatFullNumber(card.favoriteCount)}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="flex items-center gap-1.5">
                  <GitForkIcon className="size-4" />
                  {formatCompactNumber(card.forkCount)}
                </span>
              }
            />
            <TooltipContent>{formatFullNumber(card.forkCount)}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </article>
  )
}
