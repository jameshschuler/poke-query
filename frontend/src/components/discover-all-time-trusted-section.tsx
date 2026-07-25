import { DiscoverRailSectionBase } from '#/components/discover-rail-section-base'
import type { DiscoverRailSectionData } from '#/components/discover-rail-section-base'
import type { DiscoverRail } from '#/lib/poke-query-api'

type DiscoverAllTimeTrustedSectionProps = {
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

export function DiscoverAllTimeTrustedSection(
  props: DiscoverAllTimeTrustedSectionProps,
) {
  return (
    <DiscoverRailSectionBase
      {...props}
      containerClassName="rounded-3xl border border-border/70 bg-card/95 px-4 py-5 shadow-sm sm:px-6 sm:py-6"
      titleClassName="text-lg font-semibold tracking-tight"
      desktopGridClassName="grid gap-4 transition-all duration-300 ease-out will-change-transform motion-reduce:transform-none motion-reduce:transition-none sm:grid-cols-2 xl:grid-cols-3"
      useMobileCarousel={false}
    />
  )
}
