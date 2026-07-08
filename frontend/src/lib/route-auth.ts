import { redirect } from '@tanstack/react-router'

import type { GetMeResponse } from '#/lib/poke-query-api'
import { ApiRequestError, getMe } from '#/lib/poke-query-api'

// Module-level cache to avoid redundant /me requests
let cachedUser: GetMeResponse | null | undefined = undefined
let cacheTimestamp = 0
const CACHE_TTL = 30_000 // 30 seconds

export function setCachedUser(user: GetMeResponse | null) {
  cachedUser = user
  cacheTimestamp = Date.now()
}

const PROFILE_REDIRECT_STORAGE_KEY = 'poke-query:profile-redirected:'

function getProfileRedirectKey(userId: string) {
  return `${PROFILE_REDIRECT_STORAGE_KEY}${userId}`
}

function shouldRedirectToProfileOnce(user: GetMeResponse) {
  if (typeof window === 'undefined' || user.profileCompleted) {
    return false
  }

  const key = getProfileRedirectKey(user.id)
  const hasRedirected = window.localStorage.getItem(key) === '1'

  if (hasRedirected) {
    return false
  }

  window.localStorage.setItem(key, '1')
  return true
}

function clearProfileRedirectMarkerIfCompleted(user: GetMeResponse) {
  if (typeof window === 'undefined' || !user.profileCompleted) {
    return
  }

  window.localStorage.removeItem(getProfileRedirectKey(user.id))
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
    const user = await getUser()

    if (!user) {
      throw redirect({
        to: '/login',
        search: { redirect: redirectPath },
      })
    }

    clearProfileRedirectMarkerIfCompleted(user)

    if (redirectPath !== '/account' && shouldRedirectToProfileOnce(user)) {
      throw redirect({
        to: '/account',
        search: { redirect: redirectPath },
      })
    }
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
