import { beforeEach, describe, expect, it, vi } from 'vitest'

type LoadOptions = {
  sessionToken: string | null
  throwGetSession?: boolean
}

async function loadApiModule(options: LoadOptions) {
  vi.resetModules()

  const getSession = vi.fn(async () => {
    if (options.throwGetSession) {
      throw new Error('session unavailable')
    }

    return {
      data: {
        session: options.sessionToken
          ? { access_token: options.sessionToken }
          : null,
      },
    }
  })

  vi.doMock('#/lib/supabase-client', () => ({
    supabase: {
      auth: {
        getSession,
      },
    },
  }))

  const module = await import('#/lib/poke-query-api')
  return { module, getSession }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('poke-query API auth headers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('adds authorization header from live supabase session token', async () => {
    const { module, getSession } = await loadApiModule({
      sessionToken: 'live-session-token',
    })

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({
        id: 'user-1',
        username: 'ash',
        displayName: 'Ash',
        team: null,
        level: null,
        avatarUrl: null,
        hasTrainer: true,
        profileCompleted: true,
        role: 'member',
        email: null,
        pogoUsername: null,
        visibleUsername: 'pokequery',
        trainerCode: null,
        isProfilePublic: true,
        deactivatedAt: null,
        queryCount: 0,
        favoriteCount: 0,
        followerCount: 0,
        forkCount: 0,
      }),
    )

    await module.getMe()

    expect(getSession).toHaveBeenCalledTimes(1)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(headers.get('authorization')).toBe('Bearer live-session-token')
  })

  it('does not add authorization header when no supabase session exists', async () => {
    const { module } = await loadApiModule({ sessionToken: null })

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({
        id: 'user-1',
        username: 'ash',
        displayName: 'Ash',
        team: null,
        level: null,
        avatarUrl: null,
        hasTrainer: true,
        profileCompleted: true,
        role: 'member',
        email: null,
        pogoUsername: null,
        visibleUsername: 'pokequery',
        trainerCode: null,
        isProfilePublic: true,
        deactivatedAt: null,
        queryCount: 0,
        favoriteCount: 0,
        followerCount: 0,
        forkCount: 0,
      }),
    )

    await module.getMe()

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(headers.get('authorization')).toBeNull()
  })

  it('ignores stale localStorage token data when session lookup fails', async () => {
    window.localStorage.setItem(
      'sb-stale-auth-token',
      JSON.stringify({ access_token: 'stale-token' }),
    )

    const { module } = await loadApiModule({
      sessionToken: null,
      throwGetSession: true,
    })

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({
        id: 'user-1',
        username: 'ash',
        displayName: 'Ash',
        team: null,
        level: null,
        avatarUrl: null,
        hasTrainer: true,
        profileCompleted: true,
        role: 'member',
        email: null,
        pogoUsername: null,
        visibleUsername: 'pokequery',
        trainerCode: null,
        isProfilePublic: true,
        deactivatedAt: null,
        queryCount: 0,
        favoriteCount: 0,
        followerCount: 0,
        forkCount: 0,
      }),
    )

    await module.getMe()

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(headers.get('authorization')).toBeNull()
  })
})
