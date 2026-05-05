import { redirect } from '@tanstack/react-router'

import { ApiRequestError, getMe } from '#/lib/poke-query-api'

export async function requireAuthenticated(redirectPath: string) {
  try {
    await getMe()
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
    await getMe()
    throw redirect({ to: '/dashboard' })
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return
    }

    throw error
  }
}
