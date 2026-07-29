import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function mockApiResponses(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname

    if (pathname === '/api/v1/users/me') {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid Session' }),
      })
    }

    if (pathname === '/api/v1/queries/tags') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tags: [] }),
      })
    }

    if (pathname === '/api/v1/users/me/favorites/ids') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ favoriteQueryIds: [] }),
      })
    }

    if (pathname === '/api/v1/users/me/queries') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ queries: [] }),
      })
    }

    if (pathname === '/api/v1/users/me/forks') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ forks: [] }),
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
          dateKey: '2026-07-27',
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
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [],
          pagination: {
            limit: 20,
            offset: 0,
            nextOffset: null,
            hasMore: false,
            total: 0,
          },
        }),
      })
    }

    if (pathname === '/api/v1/notifications/unread-count') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unreadCount: 0 }),
      })
    }

    if (pathname === '/api/v1/notifications/preferences') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifyNewFollower: true,
          notifyQueryFork: true,
          notifyQueryFavorite: true,
          inAppToasts: true,
        }),
      })
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
}

test('renders the login page for auth flows', async ({ page }) => {
  await mockApiResponses(page)

  await page.goto('/login')

  await expect(page.getByText('Sign in to your account.')).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send OTP' })).toBeVisible()
})

test('renders discover with a usable shell', async ({ page }) => {
  await mockApiResponses(page)

  await page.goto('/discover')

  await expect(
    page.getByRole('heading', { name: 'Discover' }).first(),
  ).toBeVisible()
  await expect(page.getByPlaceholder('Search strings')).toBeVisible()
})

test('redirects unauthenticated library access to login', async ({ page }) => {
  await mockApiResponses(page)

  await page.goto('/library')

  await expect(page).toHaveURL(/\/login\?redirect=%2Flibrary/)
  await expect(page.getByText('Sign in to your account.')).toBeVisible()
})

test('redirects unauthenticated account access to login', async ({ page }) => {
  await mockApiResponses(page)

  await page.goto('/account')

  await expect(page).toHaveURL(/\/login\?redirect=%2Faccount/)
  await expect(page.getByText('Sign in to your account.')).toBeVisible()
})

test('redirects unauthenticated notifications access to login', async ({
  page,
}) => {
  await mockApiResponses(page)

  await page.goto('/notifications')

  await expect(page).toHaveURL(/\/login\?redirect=%2Fnotifications/)
  await expect(page.getByText('Sign in to your account.')).toBeVisible()
})

test('redirects unauthenticated forks access to login', async ({ page }) => {
  await mockApiResponses(page)

  await page.goto('/forks')

  await expect(page).toHaveURL(/\/login\?redirect=%2Fforks/)
  await expect(page.getByText('Sign in to your account.')).toBeVisible()
})
