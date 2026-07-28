import { renderHook, act } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { useDiscoverSearch } from '#/hooks/use-discover-search'

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

describe('useDiscoverSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockNavigate.mockReset()
    mockNavigate.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('restores search and filter from share-link route search', () => {
    const { result } = renderHook(() =>
      useDiscoverSearch({
        routeSearch: {
          q: 'shadow machop',
          filter: 'tag:raid',
        },
        availableTags: [
          { id: 't-1', name: 'raid', queryCount: 12 },
          { id: 't-2', name: 'great-league', queryCount: 22 },
        ],
      }),
    )

    expect(result.current.searchTerm).toBe('shadow machop')
    expect(result.current.activeFilterKey).toBe('tag:raid')
    expect(result.current.activeFilter.tag).toBe('raid')
  })

  it('syncs debounced query and filter changes to route search', () => {
    const { result } = renderHook(() =>
      useDiscoverSearch({
        routeSearch: {
          q: undefined,
          filter: undefined,
        },
        availableTags: [{ id: 't-1', name: 'raid', queryCount: 12 }],
      }),
    )

    act(() => {
      result.current.setActiveFilterKey('popular')
      result.current.setSearchTerm('pvp')
    })

    act(() => {
      vi.advanceTimersByTime(360)
    })

    const calls = mockNavigate.mock.calls.map((call) => call[0])
    const debouncedCall = calls.find(
      (call) =>
        call?.to === '/discover' &&
        call?.search?.filter === 'popular' &&
        call?.search?.q === 'pvp',
    )

    expect(debouncedCall).toMatchObject({
      to: '/discover',
      search: {
        q: 'pvp',
        filter: 'popular',
      },
      replace: true,
      resetScroll: false,
    })
  })
})
