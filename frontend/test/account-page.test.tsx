import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as accountRouteModule from '#/routes/account'

const {
  mockRequestAccountUpgrade,
  mockUseAuth,
  mockUseMutation,
  mockUseNavigate,
  mockUseQuery,
  mockUseQueryClient,
  mockVerifyAccountUpgrade,
} = vi.hoisted(() => ({
  mockRequestAccountUpgrade: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUseMutation: vi.fn(),
  mockUseNavigate: vi.fn(),
  mockUseQuery: vi.fn(),
  mockUseQueryClient: vi.fn(),
  mockVerifyAccountUpgrade: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as Record<string, unknown>),
    useSearch: () => ({}),
  }),
  useNavigate: () => mockUseNavigate,
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => mockUseMutation(options),
  useQuery: (options: unknown) => mockUseQuery(options),
  useQueryClient: () => mockUseQueryClient(),
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

vi.mock('#/components/ui/badge', () => ({
  Badge: ({ children, ...props }: ComponentProps<'span'>) => (
    <span {...props}>{children}</span>
  ),
}))

vi.mock('#/components/ui/button', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('#/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('#/components/ui/input', () => ({
  Input: (props: ComponentProps<'input'>) => <input {...props} />,
}))

vi.mock('#/components/ui/input-otp', () => ({
  InputOTP: ({
    value,
    onChange,
    children,
  }: {
    value?: string
    onChange?: (value: string) => void
    children: ReactNode
  }) => (
    <div>
      <input
        aria-label="Verification code"
        value={value ?? ''}
        onChange={(event) => onChange?.(event.target.value)}
      />
      {children}
    </div>
  ),
  InputOTPGroup: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  InputOTPSeparator: () => <span>-</span>,
  InputOTPSlot: ({ index }: { index: number }) => (
    <input aria-label={`OTP digit ${index + 1}`} />
  ),
}))

vi.mock('#/lib/poke-query-api', () => ({
  ApiRequestError: class ApiRequestError extends Error {
    status: number

    constructor(status: number, data: { error?: string } = {}) {
      super(data.error ?? `Request failed with status ${status}`)
      this.status = status
    }
  },
  deactivateMe: vi.fn(),
  deleteMe: vi.fn(),
  getMe: vi.fn(),
  getNotificationPreferences: vi.fn(),
  reactivateMe: vi.fn(),
  updateMe: vi.fn(),
  updateNotificationPreferences: vi.fn(),
}))

vi.mock('#/lib/mutation-toast', () => ({
  getMutationErrorMessage: () => 'Mutation failed',
}))

vi.mock('#/lib/content-policy', () => ({
  findBlockedTerm: () => null,
}))

vi.mock('#/lib/route-auth', () => ({
  requireAuthenticated: vi.fn(),
  setCachedUser: vi.fn(),
}))

vi.mock('#/lib/theme-preferences', () => ({
  THEME_PRESET_OPTIONS: [
    { label: 'Default', value: 'default' },
    { label: 'Forest', value: 'forest' },
  ],
  getThemePreset: () => 'default',
  setThemePreset: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

const baseMe = {
  id: 'user-1',
  username: 'ash',
  displayName: 'Ash',
  team: 'mystic' as const,
  level: 40,
  avatarUrl: null,
  hasTrainer: true,
  profileCompleted: true,
  role: 'member' as const,
  email: null,
  pogoUsername: 'AshGO',
  visibleUsername: 'pokequery' as const,
  trainerCode: '1234 5678 9012',
  isProfilePublic: true,
  deactivatedAt: null,
  queryCount: 0,
  favoriteCount: 0,
  followerCount: 0,
  forkCount: 0,
}

const notificationPreferences = {
  notifyNewFollower: true,
  notifyQueryFork: true,
  notifyQueryFavorite: true,
  inAppToasts: true,
}

const AccountComponent = (
  accountRouteModule.Route as unknown as { component: () => ReactNode }
).component

describe('AccountPage', () => {
  afterEach(() => {
    window.localStorage.clear()
    cleanup()
  })

  beforeEach(() => {
    mockUseAuth.mockReset()
    mockUseMutation.mockReset()
    mockUseQuery.mockReset()
    mockUseQueryClient.mockReset()

    mockUseNavigate.mockResolvedValue(undefined)
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn(),
    })
    mockUseMutation.mockReturnValue({ isPending: false, mutate: vi.fn() })
    mockRequestAccountUpgrade.mockReset()
    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === 'me') {
        return { data: baseMe, isLoading: false, error: null }
      }

      if (queryKey[0] === 'notification-preferences') {
        return {
          data: notificationPreferences,
          isLoading: false,
          error: null,
        }
      }

      return { data: undefined, isLoading: false, error: null }
    })
    mockRequestAccountUpgrade.mockResolvedValue(undefined)
    mockVerifyAccountUpgrade.mockReset()
    mockVerifyAccountUpgrade.mockResolvedValue(undefined)
  })

  it('renders the guest upgrade section at the bottom for anonymous users', () => {
    mockUseAuth.mockReturnValue({
      user: { email: undefined },
      requestAccountUpgrade: mockRequestAccountUpgrade,
      signOut: vi.fn(),
      verifyAccountUpgrade: mockVerifyAccountUpgrade,
    })

    render(<AccountComponent />)

    const accountSections = screen.getByRole('tablist', {
      name: 'Account sections',
    })
    const upgradeHeading = screen.getByText(
      'Secure your guest account with email',
    )

    expect(upgradeHeading.compareDocumentPosition(accountSections)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    )
    expect(screen.getByLabelText('Email address')).toBeTruthy()
  })

  it('does not render the guest upgrade section for email-backed users', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'ash@example.com' },
      requestAccountUpgrade: mockRequestAccountUpgrade,
      signOut: vi.fn(),
      verifyAccountUpgrade: mockVerifyAccountUpgrade,
    })

    render(<AccountComponent />)

    expect(
      screen.queryByText('Secure your guest account with email'),
    ).toBeNull()
  })

  it('requests an email link for the current anonymous account', async () => {
    mockUseAuth.mockReturnValue({
      user: { email: undefined },
      requestAccountUpgrade: mockRequestAccountUpgrade,
      signOut: vi.fn(),
      verifyAccountUpgrade: mockVerifyAccountUpgrade,
    })

    render(<AccountComponent />)

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'ash@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }))

    await waitFor(() => {
      expect(mockRequestAccountUpgrade).toHaveBeenCalledWith({
        email: 'ash@example.com',
      })
    })
  })

  it('verifies the linked email as an email change, not a new sign-in', async () => {
    mockUseAuth.mockReturnValue({
      user: { email: undefined },
      requestAccountUpgrade: mockRequestAccountUpgrade,
      signOut: vi.fn(),
      verifyAccountUpgrade: mockVerifyAccountUpgrade,
    })

    render(<AccountComponent />)

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'ash@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }))

    await screen.findByText('Verify and secure account')

    fireEvent.change(screen.getByLabelText('Verification code'), {
      target: { value: '123456' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Verify and secure account' }),
    )

    await waitFor(() => {
      expect(mockVerifyAccountUpgrade).toHaveBeenCalledWith({
        email: 'ash@example.com',
        token: '123456',
        type: 'email_change',
      })
    })

    expect(screen.getByText('Account upgraded successfully')).toBeTruthy()
    expect(
      screen.getByText(
        'ash@example.com is now linked to this account. Your existing strings and activity stayed with the same profile.',
      ),
    ).toBeTruthy()
    expect(
      window.localStorage.getItem('poke-query:account-upgrade-success-email'),
    ).toBe('ash@example.com')
  })
})
