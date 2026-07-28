import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createQuery,
  deleteQuery,
  favoriteQuery,
  followTrainer,
  unfavoriteQuery,
  unfollowTrainer,
  updateQuery,
} from '#/lib/poke-query-api'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('poke-query API user flows', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('sends query CRUD requests with expected methods and payloads', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ id: 'query-created' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'query-updated' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await createQuery({
      title: 'Raid CP Filter',
      query: 'cp2500-',
      description: 'raid prep',
      isPublic: true,
      tags: ['raid'],
    })

    await updateQuery('query-created', {
      title: 'Raid CP Filter v2',
      query: 'cp2000-',
      description: 'raid prep updated',
      isPublic: false,
      tags: ['raid', 'daily-catch'],
    })

    await deleteQuery('query-created')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:4000/api/v1/queries',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:4000/api/v1/queries/query-created',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
      }),
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:4000/api/v1/queries/query-created',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include',
      }),
    )
  })

  it('sends favorite and unfavorite requests', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await favoriteQuery('query-42')
    await unfavoriteQuery('query-42')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:4000/api/v1/queries/query-42/favorite',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:4000/api/v1/queries/query-42/unfavorite',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    )
  })

  it('sends follow and unfollow requests', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await followTrainer('trainer-abc')
    await unfollowTrainer('trainer-abc')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:4000/api/v1/users/trainer-abc/follow',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:4000/api/v1/users/trainer-abc/unfollow',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    )
  })
})
