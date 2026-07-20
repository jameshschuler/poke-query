import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Route } from '#/routes/login'

const { mockNavigate, mockSignInWithOtp, mockUseSearch, mockVerifyOtp } =
  vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    mockSignInWithOtp: vi.fn(),
    mockUseSearch: vi.fn(() => ({})),
    mockVerifyOtp: vi.fn(),
  }))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as Record<string, unknown>),
    useSearch: mockUseSearch,
  }),
  Link: ({
    children,
    ...rest
  }: {
    children: ReactNode
    [key: string]: unknown
  }) => <a {...rest}>{children}</a>,
  useNavigate: () => mockNavigate,
}))

vi.mock('#/components/page-shell', () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('#/lib/route-auth', () => ({
  requireGuest: vi.fn(),
}))

vi.mock('#/lib/auth-context', () => ({
  useAuth: () => ({
    signInWithOtp: mockSignInWithOtp,
    verifyOtp: mockVerifyOtp,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('LoginPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    mockNavigate.mockReset()
    mockSignInWithOtp.mockReset()
    mockUseSearch.mockReset()
    mockVerifyOtp.mockReset()

    mockUseSearch.mockReturnValue({})
    mockSignInWithOtp.mockResolvedValue(undefined)
    mockVerifyOtp.mockResolvedValue(undefined)
  })

  it('requests email OTP', async () => {
    render(<Route.component />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ash@example.com' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }))

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'ash@example.com',
      })
    })
  })

  it.skip('verifies OTP and navigates to dashboard', async () => {
    render(<Route.component />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ash@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }))

    await screen.findByLabelText('OTP digit 1')

    // Find the hidden input created by input-otp and simulate typing
    const otpInput = document.querySelector(
      '[data-slot="input-otp"] input',
    ) as HTMLInputElement
    if (otpInput) {
      // Simulate typing each digit with keyboard events
      for (const digit of '123456') {
        fireEvent.keyDown(otpInput, {
          key: digit,
          code: `Digit${digit}`,
        })
        otpInput.value += digit
        fireEvent.input(otpInput, { target: { value: otpInput.value } })
      }
    }

    fireEvent.click(screen.getByRole('button', { name: 'Verify OTP' }))

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'ash@example.com',
        token: '123456',
        type: 'email',
      })
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/dashboard',
        replace: true,
      })
    })
  })

  it.skip('verifies OTP and navigates to redirect target', async () => {
    mockUseSearch.mockReturnValue({ redirect: '/account' })

    render(<Route.component />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ash@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }))

    await screen.findByLabelText('OTP digit 1')

    // Find the hidden input created by input-otp and simulate typing
    const otpInput = document.querySelector(
      '[data-slot="input-otp"] input',
    ) as HTMLInputElement
    if (otpInput) {
      // Simulate typing each digit with keyboard events
      for (const digit of '123456') {
        fireEvent.keyDown(otpInput, {
          key: digit,
          code: `Digit${digit}`,
        })
        otpInput.value += digit
        fireEvent.input(otpInput, { target: { value: otpInput.value } })
      }
    }

    fireEvent.click(screen.getByRole('button', { name: 'Verify OTP' }))

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'ash@example.com',
        token: '123456',
        type: 'email',
      })
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/account',
        replace: true,
      })
    })
  })
})
