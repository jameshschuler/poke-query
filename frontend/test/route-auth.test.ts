import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type MockUser = {
  id: string
  username: string
  displayName: string
  team: 'mystic' | 'valor' | 'instinct' | null
  level: number | null
  avatarUrl: string | null
  hasTrainer: boolean
  profileCompleted: boolean
  role: 'member' | 'admin'
  email: string | null
  pogoUsername: string | null
  visibleUsername: 'pokequery' | 'pogo'
  trainerCode: string | null
  isProfilePublic: boolean
  deactivatedAt: string | null
  queryCount: number
  favoriteCount: number
  followerCount: number
  forkCount: number
}

class MockApiRequestError extends Error {
  status: number
  data: unknown
  requestId: string | null

  constructor(status: number, data: unknown, requestId: string | null) {
    super(
      typeof data === 'object' &&
        data !== null &&
        'error' in data &&
        typeof data.error === 'string'
        ? data.error
        : `Request failed with status ${status}`,
    )
    this.name = 'ApiRequestError'
    this.status = status
    this.data = data
    this.requestId = requestId
  }
}

const baseUser: MockUser = {
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
}

async function loadRouteAuth(options?: {
  getMeResults?: Array<MockUser | null | Error>
  startAnonymousSessionImpl?: () => Promise<unknown>
}) {
  vi.resetModules()

  const redirect = vi.fn((options: unknown) => ({ __redirect: options }))
  const getMe = vi.fn(async () => {
    const next = options?.getMeResults?.shift()

    if (next instanceof Error) {
      throw next
    }

    return next ?? null
  })
  const startAnonymousSession = vi.fn(
    () => options?.startAnonymousSessionImpl?.() ?? Promise.resolve(undefined),
  )

  vi.doMock('@tanstack/react-router', () => ({ redirect }))
  vi.doMock('#/lib/auth-context', () => ({ startAnonymousSession }))
  vi.doMock('#/lib/poke-query-api', () => ({
    ApiRequestError: MockApiRequestError,
    getMe,
  }))

  const module = await import('#/lib/route-auth')

  return {
    redirect,
    getMe,
    startAnonymousSession,
    requireAuthenticated: module.requireAuthenticated,
    requireGuest: module.requireGuest,
  }
}

describe('route-auth', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('bootstraps an anonymous session for protected routes when no user exists yet', async () => {
    const anonymousUser = { ...baseUser, id: 'anon-1' }
    const routeAuth = await loadRouteAuth({
      getMeResults: [null, anonymousUser],
    })

    await expect(
      routeAuth.requireAuthenticated('/library/new'),
    ).resolves.toBeUndefined()

    expect(routeAuth.startAnonymousSession).toHaveBeenCalledTimes(1)
    expect(routeAuth.getMe).toHaveBeenCalledTimes(2)
  })

  it('redirects protected routes to login when session recovery fails', async () => {
    const routeAuth = await loadRouteAuth({
      getMeResults: [
        new MockApiRequestError(401, { error: 'Invalid Session' }, null),
      ],
      startAnonymousSessionImpl: () =>
        Promise.reject(new Error('anonymous disabled')),
    })

    await expect(routeAuth.requireAuthenticated('/dashboard')).rejects.toEqual({
      __redirect: {
        to: '/login',
        search: { redirect: '/dashboard' },
      },
    })
  })

  it('redirects incomplete email users to account once before other protected pages', async () => {
    const upgradingUser = {
      ...baseUser,
      email: 'ash@example.com',
      profileCompleted: false,
    }
    const routeAuth = await loadRouteAuth({
      getMeResults: [upgradingUser, upgradingUser],
    })

    await expect(routeAuth.requireAuthenticated('/library')).rejects.toEqual({
      __redirect: {
        to: '/account',
        search: { redirect: '/library' },
      },
    })

    await expect(
      routeAuth.requireAuthenticated('/library'),
    ).resolves.toBeUndefined()
  })

  it('redirects authenticated email users away from guest routes', async () => {
    const signedInUser = {
      ...baseUser,
      email: 'ash@example.com',
    }
    const routeAuth = await loadRouteAuth({
      getMeResults: [signedInUser],
    })

    await expect(routeAuth.requireGuest()).rejects.toEqual({
      __redirect: { to: '/dashboard' },
    })
  })

  it('allows anonymous users onto guest routes', async () => {
    const routeAuth = await loadRouteAuth({
      getMeResults: [{ ...baseUser, id: 'anon-2' }],
    })

    await expect(routeAuth.requireGuest()).resolves.toBeUndefined()
  })

  it('allows guest routes when the current session is missing', async () => {
    const routeAuth = await loadRouteAuth({
      getMeResults: [
        new MockApiRequestError(401, { error: 'Invalid Session' }, null),
      ],
    })

    await expect(routeAuth.requireGuest()).resolves.toBeUndefined()
  })
})
