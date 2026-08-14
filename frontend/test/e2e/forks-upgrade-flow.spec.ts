import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function mockAnonymousAuthWithIncompleteProfile(page: Page) {
  let signupCallCount = 0
  let forksRequestCount = 0

  await page.route('https://example.supabase.co/auth/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname

    if (pathname === '/auth/v1/signup') {
      signupCallCount += 1

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'anon-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'anon-refresh-token',
          user: {
            id: 'anon-user-id',
            aud: 'authenticated',
            role: 'authenticated',
            email: null,
            is_anonymous: true,
            identities: [],
            user_metadata: {},
            app_metadata: {},
            created_at: new Date().toISOString(),
          },
        }),
      })
    }

    if (pathname === '/auth/v1/user') {
      const authHeader = request.headers()['authorization']

      if (authHeader === 'Bearer anon-access-token') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'anon-user-id',
            aud: 'authenticated',
            role: 'authenticated',
            email: null,
            is_anonymous: true,
            identities: [],
            user_metadata: {},
            app_metadata: {},
            created_at: new Date().toISOString(),
          }),
        })
      }

      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid token' }),
      })
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname
    const authHeader = request.headers()['authorization']
    const hasAnonymousToken = authHeader === 'Bearer anon-access-token'

    if (pathname === '/api/v1/users/me') {
      if (!hasAnonymousToken) {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid Session' }),
        })
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'anon-user-id',
          username: null,
          displayName: 'Guest trainer',
          team: null,
          level: null,
          avatarUrl: null,
          hasTrainer: true,
          profileCompleted: false,
          role: 'member',
          email: null,
          pogoUsername: null,
          visibleUsername: null,
          trainerCode: null,
          isProfilePublic: false,
          deactivatedAt: null,
          queryCount: 0,
          favoriteCount: 0,
          followerCount: 0,
          forkCount: 0,
        }),
      })
    }

    if (pathname === '/api/v1/users/me/forks') {
      forksRequestCount += 1
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Account upgrade required to access this feature',
        }),
      })
    }

    if (pathname === '/api/v1/users/me/favorites/ids') {
      return route.fulfill({
        status: hasAnonymousToken ? 200 : 401,
        contentType: 'application/json',
        body: JSON.stringify(
          hasAnonymousToken
            ? { favoriteQueryIds: [] }
            : { error: 'Invalid Session' },
        ),
      })
    }

    if (pathname === '/api/v1/notifications/unread-count') {
      return route.fulfill({
        status: hasAnonymousToken ? 200 : 401,
        contentType: 'application/json',
        body: JSON.stringify(
          hasAnonymousToken ? { unreadCount: 0 } : { error: 'Invalid Session' },
        ),
      })
    }

    if (pathname === '/api/v1/notifications/preferences') {
      return route.fulfill({
        status: hasAnonymousToken ? 200 : 401,
        contentType: 'application/json',
        body: JSON.stringify(
          hasAnonymousToken
            ? {
                notifyNewFollower: true,
                notifyQueryFork: true,
                notifyQueryFavorite: true,
                inAppToasts: true,
              }
            : { error: 'Invalid Session' },
        ),
      })
    }

    if (pathname === '/api/v1/notifications') {
      return route.fulfill({
        status: hasAnonymousToken ? 200 : 401,
        contentType: 'application/json',
        body: JSON.stringify(
          hasAnonymousToken
            ? {
                notifications: [],
                pagination: {
                  limit: 10,
                  offset: 0,
                  nextOffset: null,
                  hasMore: false,
                  total: 0,
                },
              }
            : { error: 'Invalid Session' },
        ),
      })
    }

    if (pathname === '/api/v1/moderation/access') {
      return route.fulfill({
        status: hasAnonymousToken ? 200 : 401,
        contentType: 'application/json',
        body: JSON.stringify(
          hasAnonymousToken
            ? { isReviewer: false, role: 'member' }
            : { error: 'Invalid Session' },
        ),
      })
    }

    if (pathname === '/api/v1/metrics/surfacing') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          weeklyPicks: [],
          featuredToday: [],
          allTimeTrusted: [],
          contextualPicks: [],
          generatedAt: new Date().toISOString(),
          dateKey: '2026-08-11',
        }),
      })
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })

  return {
    getSignupCallCount: () => signupCallCount,
    getForksRequestCount: () => forksRequestCount,
  }
}

test('shows locked forks experience for incomplete profiles', async ({
  page,
}) => {
  const metrics = await mockAnonymousAuthWithIncompleteProfile(page)

  await page.goto('/forks')

  await expect(page).toHaveURL(/\/forks$/)
  await expect(
    page.getByRole('heading', { name: 'Forks' }).first(),
  ).toBeVisible()
  await expect(page.getByText('Account setup')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Finish your account' }),
  ).toBeVisible()
  await expect(
    page.getByText(
      'Head to your account to finish setup and unlock this library.',
    ),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Go to account' })).toBeVisible()
  await expect(page.getByText('No forks yet')).toBeVisible()

  await expect.poll(() => metrics.getSignupCallCount()).toBe(1)
  await expect.poll(() => metrics.getForksRequestCount()).toBe(0)
})
