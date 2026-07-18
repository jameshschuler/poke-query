import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Route } from '#/routes/moderation'

const {
  mockGetModerationAccess,
  mockGetModerationReports,
  mockGetModerationReportDetail,
  mockUpdateModerationReportStatus,
} = vi.hoisted(() => ({
  mockGetModerationAccess: vi.fn(),
  mockGetModerationReports: vi.fn(),
  mockGetModerationReportDetail: vi.fn(),
  mockUpdateModerationReportStatus: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
}))

vi.mock('#/components/page-shell', () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('#/lib/route-auth', () => ({
  requireAuthenticated: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('#/lib/poke-query-api', () => ({
  ApiRequestError: class ApiRequestError extends Error {
    status: number

    constructor(status: number) {
      super(`Request failed with status ${status}`)
      this.status = status
    }
  },
  getModerationAccess: mockGetModerationAccess,
  getModerationReports: mockGetModerationReports,
  getModerationReportDetail: mockGetModerationReportDetail,
  updateModerationReportStatus: mockUpdateModerationReportStatus,
}))

describe('ModerationPage', () => {
  beforeEach(() => {
    mockGetModerationAccess.mockReset()
    mockGetModerationReports.mockReset()
    mockGetModerationReportDetail.mockReset()
    mockUpdateModerationReportStatus.mockReset()
  })

  it('updates report status from the moderation queue', async () => {
    mockGetModerationAccess.mockResolvedValue({ isReviewer: true })
    mockGetModerationReports.mockResolvedValue({
      reports: [
        {
          id: 'report-1',
          targetType: 'query',
          reason: 'spam',
          details: 'Repeated low-effort spam text',
          status: 'open',
          target: {
            queryId: 'query-1',
            trainerId: null,
            label: 'Public raid finder',
          },
          reporter: {
            id: 'trainer-1',
            username: 'ash',
            displayName: 'Ash',
          },
          reviewedBy: null,
          createdAt: '2026-07-17T12:00:00.000Z',
          updatedAt: '2026-07-17T12:00:00.000Z',
        },
      ],
      pagination: {
        limit: 50,
        offset: 0,
        nextOffset: null,
        hasMore: false,
        total: 1,
      },
    })
    mockGetModerationReportDetail.mockResolvedValue({
      report: {
        id: 'report-1',
        targetType: 'query',
        reason: 'spam',
        details: 'Repeated low-effort spam text',
        status: 'open',
        target: {
          queryId: 'query-1',
          trainerId: null,
          label: 'Public raid finder',
        },
        reporter: {
          id: 'trainer-1',
          username: 'ash',
          displayName: 'Ash',
        },
        reviewedBy: null,
        createdAt: '2026-07-17T12:00:00.000Z',
        updatedAt: '2026-07-17T12:00:00.000Z',
      },
      actions: [],
    })
    mockUpdateModerationReportStatus.mockResolvedValue({
      id: 'report-1',
      status: 'resolved',
      updatedAt: '2026-07-17T12:05:00.000Z',
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <Route.component />
      </QueryClientProvider>,
    )

    expect((await screen.findAllByText('Public raid finder')).length).toBe(2)

    fireEvent.click(screen.getAllByRole('button', { name: 'Resolved' })[1])

    await waitFor(() => {
      expect(mockUpdateModerationReportStatus).toHaveBeenCalledWith(
        'report-1',
        {
          status: 'resolved',
        },
      )
    })
  })
})
