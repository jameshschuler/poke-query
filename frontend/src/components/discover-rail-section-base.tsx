import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { SearchStringCard } from '#/components/search-string-card'
import { Button } from '#/components/ui/button'
import type { CommunityQuery, DiscoverRail } from '#/lib/poke-query-api'

export type DiscoverRailSectionData = {
  key: 'weekly_picks' | 'featured_today' | 'all_time_trusted'
  title: string
  subtitle: string
  items: CommunityQuery[]
  totalPages: number
  currentPage: number
  pageItems: CommunityQuery[]
  shownStart: number
  shownEnd: number
}

type DiscoverRailSectionBaseProps = {
  section: DiscoverRailSectionData
  containerClassName: string
  titleClassName: string
  badgeLabel?: string
  badgeClassName?: string
  desktopGridClassName: string
  transitionDirection?: 'prev' | 'next' | null
  useMobileCarousel: boolean
  isAuthenticated: boolean
  currentUserId?: string
  myFavoriteIdSet: Set<string>
  isFavoritePending: boolean
  onToggleFavorite: (queryId: string, isFavorited: boolean) => void
  onFork: (queryId: string) => void
  isForkPending: boolean
  onTrackEvent: (
    queryId: string,
    rail: DiscoverRail,
    eventType: 'detail_click' | 'copy_action',
  ) => void
  mobileRailIndex: number
  setMobileRailElement: (element: HTMLDivElement | null) => void
  onMobileScroll: () => void
  onMobileStep: (direction: 'prev' | 'next') => void
  onMobileDotSelect: (index: number) => void
  onDesktopPageChange: (direction: 'prev' | 'next') => void
}

export function DiscoverRailSectionBase({
  section,
  containerClassName,
  titleClassName,
  badgeLabel,
  badgeClassName,
  desktopGridClassName,
  transitionDirection,
  useMobileCarousel,
  isAuthenticated,
  currentUserId,
  myFavoriteIdSet,
  isFavoritePending,
  onToggleFavorite,
  onFork,
  isForkPending,
  onTrackEvent,
  mobileRailIndex,
  setMobileRailElement,
  onMobileScroll,
  onMobileStep,
  onMobileDotSelect,
  onDesktopPageChange,
}: DiscoverRailSectionBaseProps) {
  return (
    <section className={containerClassName}>
      <div className="space-y-3">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0 flex flex-col items-start gap-3 sm:gap-1.5">
            <h2 className={titleClassName}>{section.title}</h2>
            {badgeLabel && badgeClassName ? (
              <p className={badgeClassName}>{badgeLabel}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">{section.subtitle}</p>
          </div>

          {useMobileCarousel ? (
            <>
              <div className="flex items-center gap-2 sm:hidden">
                <span className="text-xs text-muted-foreground">
                  {Math.min(mobileRailIndex + 1, section.items.length)} of{' '}
                  {section.items.length}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-xl"
                  aria-label={`Previous ${section.title} card`}
                  disabled={mobileRailIndex <= 0}
                  onClick={() => onMobileStep('prev')}
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-xl"
                  aria-label={`Next ${section.title} card`}
                  disabled={mobileRailIndex >= section.items.length - 1}
                  onClick={() => onMobileStep('next')}
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
              <div className="hidden items-center gap-2 sm:flex sm:shrink-0">
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
                  onClick={() => onDesktopPageChange('prev')}
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-xl"
                  aria-label={`Next ${section.title} cards`}
                  disabled={section.currentPage >= section.totalPages - 1}
                  onClick={() => onDesktopPageChange('next')}
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </>
          ) : (
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
                onClick={() => onDesktopPageChange('prev')}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-xl"
                aria-label={`Next ${section.title} cards`}
                disabled={section.currentPage >= section.totalPages - 1}
                onClick={() => onDesktopPageChange('next')}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {useMobileCarousel ? (
          <>
            <div
              ref={setMobileRailElement}
              data-mobile-rail
              className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 sm:hidden"
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                touchAction: 'pan-x pinch-zoom',
              }}
              onScroll={onMobileScroll}
            >
              {section.items.map((card) => (
                <div
                  key={`${section.key}:${card.id}`}
                  className="min-w-0 shrink-0 basis-[86%] snap-center"
                >
                  <SearchStringCard
                    card={card}
                    variant="discover"
                    isAuthenticated={isAuthenticated}
                    discoverRail={section.key}
                    onOpenDetail={(queryId, rail) =>
                      onTrackEvent(queryId, rail, 'detail_click')
                    }
                    onCopyTracked={(queryId, rail) =>
                      onTrackEvent(queryId, rail, 'copy_action')
                    }
                    isFavorited={myFavoriteIdSet.has(card.id)}
                    isFavoritePending={isFavoritePending}
                    onToggleFavorite={onToggleFavorite}
                    onFork={
                      currentUserId && card.creator?.id === currentUserId
                        ? undefined
                        : onFork
                    }
                    isForkPending={isForkPending}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-1.5 sm:hidden">
              {section.items.map((card, index) => (
                <button
                  key={`${section.key}:${card.id}:dot`}
                  type="button"
                  aria-label={`Go to ${section.title} card ${index + 1}`}
                  aria-pressed={mobileRailIndex === index}
                  className={`h-2.5 rounded-full transition-all ${
                    mobileRailIndex === index
                      ? 'w-6 bg-foreground/80'
                      : 'w-2.5 bg-muted-foreground/30'
                  }`}
                  onClick={() => onMobileDotSelect(index)}
                />
              ))}
            </div>
          </>
        ) : null}

        <div
          className={`${desktopGridClassName} ${
            transitionDirection === 'next'
              ? 'translate-x-3 opacity-0 motion-reduce:opacity-100'
              : transitionDirection === 'prev'
                ? '-translate-x-3 opacity-0 motion-reduce:opacity-100'
                : 'translate-x-0 opacity-100'
          }`}
        >
          {section.pageItems.map((card) => (
            <SearchStringCard
              key={`${section.key}:${card.id}`}
              card={card}
              variant="discover"
              isAuthenticated={isAuthenticated}
              discoverRail={section.key}
              onOpenDetail={(queryId, rail) =>
                onTrackEvent(queryId, rail, 'detail_click')
              }
              onCopyTracked={(queryId, rail) =>
                onTrackEvent(queryId, rail, 'copy_action')
              }
              isFavorited={myFavoriteIdSet.has(card.id)}
              isFavoritePending={isFavoritePending}
              onToggleFavorite={onToggleFavorite}
              onFork={
                currentUserId && card.creator?.id === currentUserId
                  ? undefined
                  : onFork
              }
              isForkPending={isForkPending}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
