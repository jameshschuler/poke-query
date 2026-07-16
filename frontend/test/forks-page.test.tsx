import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ComponentProps, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ForksPage } from '#/routes/forks'

const { mockNavigate, mockGetMyForks, mockSyncForkQuery } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetMyForks: vi.fn(),
  mockSyncForkQuery: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as Record<string, unknown>),
    useSearch: () => ({}),
  }),
  Link: ({ children, ...props }: ComponentProps<'a'>) => (
    <a {...props}>{children}</a>
  ),
  useNavigate: () => mockNavigate,
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => string
  }) =>
    select({
      location: {
        pathname: '/forks',
      },
    }),
}))

vi.mock('#/components/page-shell', () => ({
  PageShell: ({ title, children }: { title: string; children: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <div>{children}</div>
    </div>
  ),
}))

vi.mock('#/components/query-create-drawer', () => ({
  QueryCreateDrawer: () => null,
}))

vi.mock('#/components/ui/button', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('#/components/ui/badge', () => ({
  Badge: ({ children, ...props }: ComponentProps<'span'>) => (
    <span {...props}>{children}</span>
  ),
}))

vi.mock('#/components/ui/input', () => ({
  Input: (props: ComponentProps<'input'>) => <input {...props} />,
}))

vi.mock('#/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
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

vi.mock('#/lib/poke-query-api', () => ({
  ApiRequestError: class ApiRequestError extends Error {
    status: number

    constructor(status: number, data: { error?: string } = {}) {
      super(data.error ?? `Request failed with status ${status}`)
      this.status = status
    }
  },
  deleteQuery: vi.fn(),
  getMyForks: mockGetMyForks,
  syncForkQuery: mockSyncForkQuery,
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ForksPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockGetMyForks.mockReset()
    mockSyncForkQuery.mockReset()
  })

  it('renders forks data and syncs a behind fork from source', async () => {
    mockGetMyForks.mockResolvedValue({
      forks: [
        {
          id: 'fork-1',
          title: 'Fork of Shadow Hundos',
          query: 'shadow&4*',
          description: 'My saved fork',
          isPublic: false,
          copyCount: 0,
          favoriteCount: 0,
          forkCount: 0,
          autoTags: ['high-iv'],
          createdAt: '2026-06-01T12:00:00.000Z',
          updatedAt: '2026-06-02T12:00:00.000Z',
          parentQueryId: 'source-1',
          originalQuerySnapshot: 'shadow&4*',
          syncStatus: 'behind',
          sourceQuery: {
            id: 'source-1',
            title: 'Shadow Hundos',
            query: 'shadow&4*&age0-30',
            isPublic: true,
            updatedAt: '2026-06-03T12:00:00.000Z',
            creator: {
              id: 'trainer-2',
              username: 'Misty',
              avatarUrl: null,
              team: 'mystic',
              level: 44,
            },
          },
        },
      ],
    })
    mockSyncForkQuery.mockResolvedValue({ id: 'fork-1' })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ForksPage />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Fork of Shadow Hundos')).toBeTruthy()
    expect(screen.getAllByText('Needs sync').length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByText('Sync from source')[0])

    await waitFor(() => {
      expect(mockSyncForkQuery).toHaveBeenCalledTimes(1)
      expect(mockSyncForkQuery.mock.calls[0]?.[0]).toBe('fork-1')
    })
  })
})
