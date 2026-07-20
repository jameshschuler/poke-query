import { useQuery } from '@tanstack/react-query'
import { getUnreadNotificationCount } from '#/lib/poke-query-api'
import { useAuth } from '#/lib/auth-context'

/**
 * Hook for polling unread notification count.
 * Automatically deduplicates across the app using a shared query key.
 * Only runs when user is authenticated.
 */
export function useUnreadNotificationCount() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadNotificationCount,
    enabled: Boolean(user),
    staleTime: 15_000,
    refetchInterval: 15_000,
  })
}
