import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as dashboardRouteModule from '#/routes/dashboard'

const { mockUseAuth, mockUseQuery, mockUnreadCount } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseQuery: vi.fn(),
  mockUnreadCount: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as Record<string, unknown>),
  }),
  Link: ({ children, ...props }: ComponentProps<'a'>) => (
    <a {...props}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}))

vi.mock('#/hooks/use-unread-notification-count', () => ({
  useUnreadNotificationCount: () => mockUnreadCount(),
}))

vi.mock('#/lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('#/components/page-shell', () => ({
  PageShell: ({ title, children }: { title: string; children: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <div>{children}</div>
    </div>
  ),
}))

vi.mock('#/components/ui/button', () => ({
  Button: ({
    children,
    render,
    ...props
  }: { render?: ReactNode } & ComponentProps<'button'>) =>
    render ? <div>{children}</div> : <button {...props}>{children}</button>,
}))

vi.mock('#/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}))

vi.mock('#/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AvatarImage: () => null,
}))

vi.mock('#/components/official-trainer-badge', () => ({
  OfficialTrainerBadge: () => null,
}))

vi.mock('#/lib/poke-query-api', () => ({
  ApiRequestError: class ApiRequestError extends Error {
    status: number

    constructor(status: number, data: { error?: string } = {}) {
      super(data.error ?? `Request failed with status ${status}`)
      this.status = status
    }
  },
  getMe: vi.fn(),
  getMyForks: vi.fn(),
  getMyQueries: vi.fn(),
  getNotifications: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('#/lib/route-auth', () => ({
  requireAuthenticated: vi.fn(),
  setCachedUser: vi.fn(),
}))

vi.mock('#/lib/utils', () => ({
  formatCompactNumber: (value: number) => String(value),
  formatFullNumber: (value: number) => String(value),
}))

const baseMe = {
  id: 'user-1',
  username: 'ash',
  displayName: 'Ash',
  team: null,
  level: null,
  avatarUrl: null,
  hasTrainer: true,
  profileCompleted: true,
  role: 'member' as const,
  email: null,
  pogoUsername: null,
  visibleUsername: 'pokequery' as const,
  trainerCode: null,
  isProfilePublic: true,
  deactivatedAt: null,
  queryCount: 0,
  favoriteCount: 0,
  followerCount: 0,
  forkCount: 0,
}

const DashboardComponent = (
  dashboardRouteModule.Route as unknown as { component: () => ReactNode }
).component

describe('DashboardRoute', () => {
  afterEach(() => {
    window.localStorage.clear()
    cleanup()
  })

  beforeEach(() => {
    mockUseQuery.mockReset()
    mockUseAuth.mockReset()
    mockUnreadCount.mockReset()

    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[1] === 'me') {
        return { data: baseMe, isLoading: false, error: null }
      }

      if (queryKey[1] === 'queries') {
        return { data: { queries: [] }, isLoading: false, error: null }
      }

      if (queryKey[1] === 'forks') {
        return { data: { forks: [] }, isLoading: false, error: null }
      }

      if (queryKey[1] === 'activity') {
        return { data: { notifications: [] }, isLoading: false, error: null }
      }

      return { data: undefined, isLoading: false, error: null }
    })

    mockUnreadCount.mockReturnValue({ data: { unreadCount: 0 } })
  })

  it('shows the upgrade prompt for anonymous users', () => {
    mockUseAuth.mockReturnValue({
      user: { email: undefined },
      isLoading: false,
      signOut: vi.fn(),
    })

    render(<DashboardComponent />)

    expect(
      screen.getByText('Add email sign-in before you leave this device.'),
    ).toBeTruthy()
    expect(screen.getByText('Secure account')).toBeTruthy()
  })

  it('hides the upgrade prompt for email-backed users', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'ash@example.com' },
      isLoading: false,
      signOut: vi.fn(),
    })

    render(<DashboardComponent />)

    expect(
      screen.queryByText('Add email sign-in before you leave this device.'),
    ).toBeNull()
  })

  it('shows a one-time upgrade success chip for newly upgraded users', () => {
    window.localStorage.setItem(
      'poke-query:account-upgrade-success-email',
      'ash@example.com',
    )

    mockUseAuth.mockReturnValue({
      user: { email: 'ash@example.com' },
      isLoading: false,
      signOut: vi.fn(),
    })

    render(<DashboardComponent />)

    expect(screen.getByText('Account upgrade complete')).toBeTruthy()
    expect(
      screen.getByText(
        'ash@example.com is now linked to this account. Your strings and activity are still here.',
      ),
    ).toBeTruthy()
    expect(
      window.localStorage.getItem('poke-query:account-upgrade-success-email'),
    ).toBeNull()
  })
})
