import { DiscoverRailSectionBase } from '#/components/discover-rail-section-base'
import type { DiscoverRailSectionData } from '#/components/discover-rail-section-base'
import type { DiscoverRail } from '#/lib/poke-query-api'

type DiscoverFeaturedTodaySectionProps = {
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

export function DiscoverFeaturedTodaySection(
  props: DiscoverFeaturedTodaySectionProps,
) {
  return (
    <DiscoverRailSectionBase
      {...props}
      containerClassName="rounded-3xl border border-sky-300/70 bg-linear-to-br from-sky-50/80 via-card/95 to-card/95 px-4 py-5 shadow-sm dark:border-sky-700/50 dark:from-sky-950/25 sm:px-6 sm:py-6"
      titleClassName="text-2xl font-semibold tracking-tight text-sky-900 dark:text-sky-100"
      badgeLabel="Daily rotation"
      badgeClassName="inline-flex w-fit items-center rounded-full border border-sky-300/70 bg-sky-100/90 px-2 py-0.5 text-xs font-semibold text-sky-800 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-200"
      desktopGridClassName="hidden gap-4 transition-all duration-300 ease-out will-change-transform motion-reduce:transform-none motion-reduce:transition-none sm:grid sm:grid-cols-2 md:grid-cols-3"
      useMobileCarousel
    />
  )
}
