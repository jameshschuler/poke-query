import { redirect } from '@tanstack/react-router'

import { startAnonymousSession } from '#/lib/auth-context'
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

function clearCachedUser() {
  cachedUser = undefined
  cacheTimestamp = 0
}

function isRecoverableAuthError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === 401
}

const PROFILE_REDIRECT_STORAGE_KEY = 'poke-query:profile-redirected:'

function getProfileRedirectKey(userId: string) {
  return `${PROFILE_REDIRECT_STORAGE_KEY}${userId}`
}

function shouldRedirectToProfileOnce(user: GetMeResponse) {
  if (typeof window === 'undefined' || user.profileCompleted || !user.email) {
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
  const maybeRedirectToProfile = (user: GetMeResponse) => {
    clearProfileRedirectMarkerIfCompleted(user)

    if (redirectPath !== '/account' && shouldRedirectToProfileOnce(user)) {
      throw redirect({
        to: '/account',
        search: { redirect: redirectPath },
      })
    }
  }

  try {
    const user = await getUser()

    if (!user) {
      await startAnonymousSession()
      clearCachedUser()
      const anonymousUser = await getUser()

      if (!anonymousUser) {
        throw new ApiRequestError(401, { error: 'Invalid Session' }, null)
      }

      maybeRedirectToProfile(anonymousUser)
      return
    }

    maybeRedirectToProfile(user)
  } catch (error) {
    if (isRecoverableAuthError(error)) {
      try {
        await startAnonymousSession()
        clearCachedUser()
        const anonymousUser = await getUser()

        if (anonymousUser) {
          maybeRedirectToProfile(anonymousUser)
          return
        }
      } catch {
        // Fall through to login redirect if anonymous sign-in is unavailable.
      }

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
    const user = await getUser()

    // Keep OTP users out of guest routes, but allow anonymous users so they can upgrade.
    if (user?.email) {
      throw redirect({ to: '/dashboard' })
    }

    return
  } catch (error) {
    if (isRecoverableAuthError(error)) {
      return
    }

    throw error
  }
}
