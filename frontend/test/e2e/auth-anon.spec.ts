import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

type MockAuthOptions = {
  anonymousSignupSucceeds: boolean
}

async function mockAuthAndProtectedApi(page: Page, options: MockAuthOptions) {
  let signupCallCount = 0

  await page.route('https://example.supabase.co/auth/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname

    if (pathname === '/auth/v1/signup') {
      signupCallCount += 1

      if (!options.anonymousSignupSucceeds) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'unexpected_failure',
            message: 'Database error creating anonymous user',
          }),
        })
      }

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
          username: 'guest-trainer',
          displayName: 'guest-trainer',
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
      })
    }

    if (pathname === '/api/v1/users/me/queries') {
      return route.fulfill({
        status: hasAnonymousToken ? 200 : 401,
        contentType: 'application/json',
        body: JSON.stringify(
          hasAnonymousToken ? { queries: [] } : { error: 'Invalid Session' },
        ),
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

    if (pathname === '/api/v1/queries/tags') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tags: [] }),
      })
    }

    if (pathname === '/api/v1/community') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          pagination: {
            limit: 20,
            offset: 0,
            nextOffset: null,
            hasMore: false,
          },
        }),
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
          dateKey: '2026-08-05',
        }),
      })
    }

    if (pathname === '/api/v1/metrics/surfacing/weekly-picks') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      })
    }

    if (pathname === '/api/v1/metrics/surfacing/events') {
      return route.fulfill({ status: 200, body: '' })
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
                  limit: 20,
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

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })

  return {
    getSignupCallCount: () => signupCallCount,
  }
}

test('bootstraps anonymous auth on arrival and opens protected library route', async ({
  page,
}) => {
  const auth = await mockAuthAndProtectedApi(page, {
    anonymousSignupSucceeds: true,
  })

  await page.goto('/library')

  await expect(page).toHaveURL(/\/library/)
  await expect(
    page.getByRole('heading', { name: 'My Library' }).first(),
  ).toBeVisible()
  expect(auth.getSignupCallCount()).toBeGreaterThan(0)
})

test('redirects protected route to login when anonymous bootstrap fails', async ({
  page,
}) => {
  await mockAuthAndProtectedApi(page, {
    anonymousSignupSucceeds: false,
  })

  await page.goto('/library')

  await expect(page).toHaveURL(/\/login\?redirect=%2Flibrary/)
  await expect(page.getByText('Sign in to your account.')).toBeVisible()
})

test('keeps anonymous session after landing on discover, then opens library', async ({
  page,
}) => {
  const auth = await mockAuthAndProtectedApi(page, {
    anonymousSignupSucceeds: true,
  })

  await page.goto('/discover')
  await expect(page).toHaveURL(/\/discover/)

  await page.goto('/library')
  await expect(page).toHaveURL(/\/library/)
  await expect(
    page.getByRole('heading', { name: 'My Library' }).first(),
  ).toBeVisible()

  // We should not repeatedly create anonymous accounts during same run.
  expect(auth.getSignupCallCount()).toBe(1)
})
