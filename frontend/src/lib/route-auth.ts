import { redirect } from '@tanstack/react-router'

import { ApiRequestError, getMe } from '#/lib/poke-query-api'

// Module-level cache to avoid redundant /me requests
let cachedUser: { id: string } | null | undefined = undefined
let cacheTimestamp = 0
const CACHE_TTL = 30_000 // 30 seconds

export function setCachedUser(user: { id: string } | null) {
  cachedUser = user
  cacheTimestamp = Date.now()
}

async function getUser() {
  const now = Date.now()

  // Use cache if it's fresh and not undefined
  if (cachedUser !== undefined && now - cacheTimestamp < CACHE_TTL) {
    return cachedUser
  }

  // Cache miss or expired, fetch from server
  const user = await getMe()
  setCachedUser(user)
  return user
}

export async function requireAuthenticated(redirectPath: string) {
  try {
    await getUser()
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      throw redirect({
        to: '/login',
        search: { redirect: redirectPath },
      })
    }

    throw error
  }
}

export async function requireGuest() {
  try {
    await getUser()
    throw redirect({ to: '/dashboard' })
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return
    }

    throw error
  }
}
