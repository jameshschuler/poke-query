import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from '#/components/home-page'

vi.mock('#/lib/poke-query-api', () => ({
  apiBaseUrl: 'http://localhost:3000',
  fetchCommunityQueries: vi.fn().mockResolvedValue([]),
}))

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the product hero and community section', async () => {
    renderWithProviders(<HomePage />)

    expect(screen.getByText('Ship a real client for Poke Query')).toBeTruthy()
    expect(screen.getByText('Open API Docs')).toBeTruthy()
    expect(await screen.findByText('Popular community queries')).toBeTruthy()
    expect(
      await screen.findByText(
        'No public queries yet. Start the backend and create one to populate this list.',
      ),
    ).toBeTruthy()
  })
})
