import { AuthProvider } from '@authabase/react'
import type { AuthConfig } from '@authabase/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { ApiRequestError, getMe } from '#/lib/poke-query-api'
import { setCachedUser } from '#/lib/route-auth'
import { TooltipProvider } from '#/components/ui/tooltip'
import { NotificationToastListener } from '#/components/notification-toast-listener'
import { initializeThemePreferences } from '#/lib/theme-preferences'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  const authConfig: AuthConfig = useMemo(
    () => ({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
      redirectUrl:
        import.meta.env.VITE_AUTH_REDIRECT_URL ??
        (typeof window !== 'undefined' ? window.location.origin : undefined),
      getCurrentUser: async () => {
        try {
          const user = await getMe()
          setCachedUser(user)

          return {
            id: user.id,
            email: user.email ?? undefined,
            user_metadata: {
              username: user.username,
              team: user.team,
              level: user.level,
              avatarUrl: user.avatarUrl,
              hasTrainer: user.hasTrainer,
            },
          }
        } catch (error) {
          if (error instanceof ApiRequestError && error.status === 401) {
            setCachedUser(null)
            return null
          }

          throw error
        }
      },
    }),
    [],
  )

  useEffect(() => {
    initializeThemePreferences()
  }, [])

  return (
    <TooltipProvider>
      <AuthProvider config={authConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
          <NotificationToastListener />
          <Toaster richColors position="bottom-right" />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </AuthProvider>
    </TooltipProvider>
  )
}
