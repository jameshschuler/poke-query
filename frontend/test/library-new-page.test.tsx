import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as newLibraryRouteModule from '#/routes/library.new'

const {
  mockCreateQuery,
  mockNavigate,
  mockRequireAuthenticated,
  mockUseMutation,
  mockUseNavigate,
  mockUseQueryClient,
} = vi.hoisted(() => ({
  mockCreateQuery: vi.fn(),
  mockNavigate: vi.fn(),
  mockRequireAuthenticated: vi.fn(),
  mockUseMutation: vi.fn(),
  mockUseNavigate: vi.fn(),
  mockUseQueryClient: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as Record<string, unknown>),
    useSearch: () => ({}),
  }),
  Link: ({ children, ...props }: ComponentProps<'a'>) => (
    <a {...props}>{children}</a>
  ),
  useNavigate: () => mockUseNavigate,
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => mockUseMutation(options),
  useQueryClient: () => mockUseQueryClient(),
}))

vi.mock('#/components/page-shell', () => ({
  PageShell: ({ title, children }: { title: string; children: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <div>{children}</div>
    </div>
  ),
}))

vi.mock('#/components/query-tags-field', () => ({
  MAX_QUERY_TAGS: 5,
  QueryTagsField: () => <div>Tags</div>,
}))

vi.mock('#/components/ui/button', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('#/lib/content-policy', () => ({
  findBlockedTerm: () => null,
}))

vi.mock('#/lib/poke-query-api', () => ({
  createQuery: (payload: unknown) => mockCreateQuery(payload),
}))

vi.mock('#/lib/mutation-toast', () => ({
  getMutationErrorMessage: () => 'Mutation failed',
}))

vi.mock('#/lib/route-auth', () => ({
  requireAuthenticated: (...args: unknown[]) =>
    mockRequireAuthenticated(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

const NewLibraryComponent = (
  newLibraryRouteModule.Route as unknown as { component: () => ReactNode }
).component

describe('NewLibraryQueryPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })

    mockCreateQuery.mockReset()
    mockNavigate.mockReset()
    mockRequireAuthenticated.mockReset()
    mockUseMutation.mockReset()
    mockUseNavigate.mockReset()
    mockUseQueryClient.mockReset()

    mockCreateQuery.mockResolvedValue({ id: 'query-1' })
    mockNavigate.mockResolvedValue(undefined)
    mockUseNavigate.mockImplementation(() => mockNavigate)
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    })
    mockUseMutation.mockImplementation(
      (options: {
        mutationFn: (nextVisibility: 'public' | 'private') => Promise<unknown>
      }) => ({
        isPending: false,
        mutate: (nextVisibility: 'public' | 'private') => {
          void options.mutationFn(nextVisibility)
        },
      }),
    )
  })

  it('imports a partial template into the form and saves draft with imported values', async () => {
    render(<NewLibraryComponent />)

    fireEvent.click(screen.getByRole('button', { name: 'Import Template' }))

    const jsonInput = screen.getByLabelText('Search string template')
    fireEvent.change(jsonInput, {
      target: {
        value: JSON.stringify({
          query: '4*&cp2500-',
          tags: ['raid'],
        }),
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(screen.getByDisplayValue('4*&cp2500-')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Imported title' },
    })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Imported description' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))

    await waitFor(() => {
      expect(mockCreateQuery).toHaveBeenCalledTimes(1)
      expect(mockCreateQuery).toHaveBeenCalledWith({
        title: 'Imported title',
        query: '4*&cp2500-',
        description: 'Imported description',
        referenceUrl: undefined,
        isPublic: false,
        tags: ['raid'],
      })
    })
  })

  it('copies a JSON skeleton template to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    })

    render(<NewLibraryComponent />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Copy Template' })[0])

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1)
      expect(writeText).toHaveBeenCalledWith(
        JSON.stringify(
          {
            title: 'Max IV Attackers',
            query: '4*&!traded&cp2500-',
            description: 'What this string is for...',
            referenceUrl: 'https://example.com/source',
            tags: ['raid', 'master-league'],
            visibility: 'public',
          },
          null,
          2,
        ),
      )
    })
  })
})
