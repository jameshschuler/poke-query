import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Route } from '#/routes/trainers.$username'

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  navigate: vi.fn(),
  getMe: vi.fn(),
  getTrainerByUsername: vi.fn(),
  getTrainerStrings: vi.fn(),
  getTrainerForks: vi.fn(),
  getTrainerFavorites: vi.fn(),
  getTrainerFollowers: vi.fn(),
  getMyFavoriteIds: vi.fn(),
  followTrainer: vi.fn(),
  unfollowTrainer: vi.fn(),
  forkQuery: vi.fn(),
  favoriteQuery: vi.fn(),
  unfavoriteQuery: vi.fn(),
  submitReport: vi.fn(),
  recordTrainerProfileView: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: any) => ({
    ...options,
    useParams: () => ({ username: 'ash' }),
  }),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useNavigate: () => mocks.navigate,
}))

vi.mock('#/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'viewer-1', email: null } }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: any) => {
    const key = options.queryKey?.[0]

    if (key === 'trainer') {
      return {
        data: mocks.getTrainerByUsername(),
        isLoading: false,
        error: null,
      }
    }

    if (key === 'me') {
      return { data: mocks.getMe(), isLoading: false, error: null }
    }

    if (key === 'trainer-strings') {
      return { data: mocks.getTrainerStrings(), isLoading: false, error: null }
    }

    if (key === 'trainer-forks') {
      return { data: mocks.getTrainerForks(), isLoading: false, error: null }
    }

    if (key === 'trainer-favorites') {
      return {
        data: mocks.getTrainerFavorites(),
        isLoading: false,
        error: null,
      }
    }

    if (key === 'trainer-followers') {
      return {
        data: mocks.getTrainerFollowers(),
        isLoading: false,
        error: null,
      }
    }

    if (key === 'my-favorite-ids') {
      return { data: mocks.getMyFavoriteIds(), isLoading: false, error: null }
    }

    return { data: undefined, isLoading: false, error: null }
  },
  useMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
    setQueryData: vi.fn(),
  }),
}))

vi.mock('#/lib/poke-query-api', () => ({
  ApiRequestError: class ApiRequestError extends Error {},
  favoriteQuery: mocks.favoriteQuery,
  getMe: mocks.getMe,
  getMyFavoriteIds: mocks.getMyFavoriteIds,
  getTrainerByUsername: mocks.getTrainerByUsername,
  getTrainerStrings: mocks.getTrainerStrings,
  getTrainerForks: mocks.getTrainerForks,
  getTrainerFavorites: mocks.getTrainerFavorites,
  getTrainerFollowers: mocks.getTrainerFollowers,
  followTrainer: mocks.followTrainer,
  forkQuery: mocks.forkQuery,
  submitReport: mocks.submitReport,
  unfavoriteQuery: mocks.unfavoriteQuery,
  unfollowTrainer: mocks.unfollowTrainer,
  recordTrainerProfileView: mocks.recordTrainerProfileView,
}))

vi.mock('#/components/page-header', () => ({
  PageHeader: ({ title, actions }: any) => (
    <header>
      <h1>{title}</h1>
      {actions}
    </header>
  ),
}))

vi.mock('#/components/app-sidebar', () => ({
  AppSidebar: () => null,
}))

vi.mock('#/components/ui/sidebar', () => ({
  SidebarInset: ({ children }: any) => <div>{children}</div>,
  SidebarProvider: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('#/components/report-target-dialog', () => ({
  ReportTargetDialog: () => null,
}))

vi.mock('#/components/search-string-card', () => ({
  SearchStringCard: () => null,
}))

vi.mock('#/components/official-trainer-badge', () => ({
  OfficialTrainerBadge: () => null,
}))

vi.mock('#/components/ui/avatar', () => ({
  Avatar: ({ children }: any) => <div>{children}</div>,
  AvatarImage: () => null,
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
}))

vi.mock('#/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}))

vi.mock('#/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('#/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
}))

describe('TrainerProfilePage follow gate', () => {
  const RouteComponent = (Route as unknown as { component: () => ReactNode })
    .component

  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getMe.mockReturnValue({
      id: 'viewer-1',
      username: 'viewer',
      displayName: 'Viewer',
      profileCompleted: false,
    })

    mocks.getTrainerByUsername.mockReturnValue({
      id: 'trainer-1',
      username: 'ash',
      displayName: 'Ash',
      avatarUrl: null,
      team: 'mystic',
      level: 99,
      trainerCode: 'ABC123',
      createdAt: '2024-01-01T00:00:00.000Z',
      isProfilePublic: true,
      deactivatedAt: null,
      profileViewCount: 12,
      stringCount: 7,
      queryCount: 3,
      favoriteCount: 1,
      forkCount: 2,
      followerCount: 5,
    })

    mocks.getTrainerStrings.mockReturnValue({ strings: [] })
    mocks.getTrainerForks.mockReturnValue({ forks: [] })
    mocks.getTrainerFavorites.mockReturnValue({ favorites: [] })
    mocks.getTrainerFollowers.mockReturnValue({ followers: [] })
    mocks.getMyFavoriteIds.mockReturnValue({ favoriteQueryIds: [] })
    mocks.recordTrainerProfileView.mockResolvedValue({ viewCount: 12 })
  })

  it('hides the follow action until the viewer has completed their profile', () => {
    render(<RouteComponent />)

    expect(screen.queryByText('Follow')).toBeNull()
  })
})
