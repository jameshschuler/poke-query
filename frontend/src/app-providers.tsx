import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { TooltipProvider } from '#/components/ui/tooltip'
import { NotificationToastListener } from '#/components/notification-toast-listener'
import { initializeThemePreferences } from '#/lib/theme-preferences'
import { AuthProvider } from '#/lib/auth-context'

// Lazy-load React Query Devtools only in development (prevents SSR errors)
const ReactQueryDevtools =
  process.env.NODE_ENV === 'production'
    ? () => null
    : React.lazy(() =>
        import('@tanstack/react-query-devtools').then((res) => ({
          default: res.ReactQueryDevtools,
        })),
      )

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

  useEffect(() => {
    initializeThemePreferences()
  }, [])

  return (
    <TooltipProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <NotificationToastListener />
          <Toaster richColors position="bottom-right" />
          {process.env.NODE_ENV !== 'production' && (
            <React.Suspense fallback={null}>
              <ReactQueryDevtools buttonPosition="bottom-right" />
            </React.Suspense>
          )}
        </QueryClientProvider>
      </AuthProvider>
    </TooltipProvider>
  )
}
