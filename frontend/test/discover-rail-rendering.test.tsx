import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DiscoverFeaturedTodaySection } from '#/components/discover-featured-today-section'
import { DiscoverAllTimeTrustedSection } from '#/components/discover-all-time-trusted-section'

vi.mock('#/components/search-string-card', () => ({
  SearchStringCard: ({ card }: { card?: any }) => (
    <div data-testid="string-card">{card?.title}</div>
  ),
}))

vi.mock('#/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, 'aria-label': ariaLabel }: any) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}))

describe('Discover Featured Rail Rendering', () => {
  const mockSection = {
    key: 'featured_today' as const,
    title: 'Featured Today',
    subtitle:
      'Daily rotating picks selected from trusted high-quality strings.',
    items: [
      {
        id: 'featured-1',
        title: 'Shadow IV Hunt',
        query: 'shadow&4*',
        description: 'Hunt shadow hundos',
        copyCount: 150,
        viewCount: 3200,
        favoriteCount: 45,
        forkCount: 8,
        qualityScore: 2.1,
        creator: null,
        source: null,
        createdAt: '2026-08-01T12:00:00.000Z',
        updatedAt: '2026-08-02T12:00:00.000Z',
        referenceUrl: null,
        isPublic: true,
        userTags: ['raid'],
        autoTags: ['high-iv'],
      },
      {
        id: 'featured-2',
        title: 'PvP Master League',
        query: 'cp2500-&!legendary',
        description: 'ML PvP checker',
        copyCount: 200,
        viewCount: 4100,
        favoriteCount: 52,
        forkCount: 12,
        qualityScore: 2.3,
        creator: null,
        source: null,
        createdAt: '2026-08-03T12:00:00.000Z',
        updatedAt: '2026-08-04T12:00:00.000Z',
        referenceUrl: null,
        isPublic: true,
        userTags: ['pvp'],
        autoTags: [],
      },
    ],
    totalPages: 2,
    currentPage: 0,
    pageItems: [
      {
        id: 'featured-1',
        title: 'Shadow IV Hunt',
        query: 'shadow&4*',
        description: 'Hunt shadow hundos',
        copyCount: 150,
        viewCount: 3200,
        favoriteCount: 45,
        forkCount: 8,
        qualityScore: 2.1,
        creator: null,
        source: null,
        createdAt: '2026-08-01T12:00:00.000Z',
        updatedAt: '2026-08-02T12:00:00.000Z',
        referenceUrl: null,
        isPublic: true,
        userTags: ['raid'],
        autoTags: ['high-iv'],
      },
    ],
    shownStart: 1,
    shownEnd: 1,
  }

  const defaultProps = {
    section: mockSection,
    isAuthenticated: true,
    currentUserId: 'user-123',
    myFavoriteIdSet: new Set<string>(),
    isFavoritePending: false,
    onToggleFavorite: vi.fn(),
    onFork: vi.fn(),
    isForkPending: false,
    onTrackEvent: vi.fn(),
    mobileRailIndex: 0,
    setMobileRailElement: vi.fn(),
    onMobileScroll: vi.fn(),
    onMobileStep: vi.fn(),
    onMobileDotSelect: vi.fn(),
    onDesktopPageChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders featured rail with badge label and title', () => {
    render(<DiscoverFeaturedTodaySection {...defaultProps} />)

    expect(screen.getByText('Featured Today')).toBeTruthy()
    expect(
      screen.getByText(
        'Daily rotating picks selected from trusted high-quality strings.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Daily rotation')).toBeTruthy()
  })

  it('displays card items within the rail', () => {
    const { container } = render(
      <DiscoverFeaturedTodaySection {...defaultProps} />,
    )
    const cards = container.querySelectorAll('[data-testid="string-card"]')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('shows pagination controls for desktop view', () => {
    render(<DiscoverFeaturedTodaySection {...defaultProps} />)
    const prevButtons = screen.getAllByLabelText(/Previous Featured Today/)
    const nextButtons = screen.getAllByLabelText(/Next Featured Today/)
    expect(prevButtons.length).toBeGreaterThan(0)
    expect(nextButtons.length).toBeGreaterThan(0)
  })

  it('triggers onDesktopPageChange on next pagination click', () => {
    const onDesktopPageChange = vi.fn()
    render(
      <DiscoverFeaturedTodaySection
        {...defaultProps}
        onDesktopPageChange={onDesktopPageChange}
        section={{ ...mockSection, currentPage: 0, totalPages: 2 }}
      />,
    )

    const nextButtons = screen.getAllByLabelText(/Next Featured Today/)
    expect(nextButtons.length).toBeGreaterThan(0)
    fireEvent.click(nextButtons[nextButtons.length - 1])

    expect(onDesktopPageChange).toHaveBeenCalledWith('next')
  })

  it('renders all-time trusted rail with correct title', () => {
    const allTimeTrustedSection = {
      ...mockSection,
      key: 'all_time_trusted' as const,
      title: 'All-Time Trusted',
    }
    render(
      <DiscoverAllTimeTrustedSection
        {...defaultProps}
        section={allTimeTrustedSection}
      />,
    )

    expect(screen.getByText('All-Time Trusted')).toBeTruthy()
  })
})
