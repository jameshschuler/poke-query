import { DiscoverRailSectionBase } from '#/components/discover-rail-section-base'
import type { DiscoverRailSectionData } from '#/components/discover-rail-section-base'
import type { DiscoverRail } from '#/lib/poke-query-api'

type DiscoverWeeklyPicksSectionProps = {
  section: DiscoverRailSectionData
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
  transitionDirection?: 'prev' | 'next' | null
}

export function DiscoverWeeklyPicksSection(
  props: DiscoverWeeklyPicksSectionProps,
) {
  return (
    <DiscoverRailSectionBase
      {...props}
      containerClassName="rounded-3xl border border-amber-300/70 bg-linear-to-br from-amber-50/90 via-card/95 to-card/95 px-4 py-5 shadow-sm dark:border-amber-700/50 dark:from-amber-950/25 sm:px-6 sm:py-6"
      titleClassName="text-2xl font-semibold tracking-tight text-amber-900 dark:text-amber-100"
      badgeLabel="Hand-picked"
      badgeClassName="inline-flex w-fit items-center rounded-full border border-amber-300/70 bg-amber-100/90 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
      desktopGridClassName="hidden gap-4 transition-all duration-300 ease-out will-change-transform motion-reduce:transform-none motion-reduce:transition-none sm:grid sm:grid-cols-2 md:grid-cols-3"
      useMobileCarousel
    />
  )
}
