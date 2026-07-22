import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Toaster, toast } from 'sonner'
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

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return
    }

    if (!('serviceWorker' in navigator)) {
      return
    }

    let isRefreshing = false

    const onControllerChange = () => {
      if (isRefreshing) {
        return
      }

      isRefreshing = true
      window.location.reload()
    }

    const showUpdateToast = (registration: ServiceWorkerRegistration) => {
      if (!registration.waiting) {
        return
      }

      toast.info('A new version of PokeQuery is ready.', {
        duration: Infinity,
        action: {
          label: 'Refresh',
          onClick: () => {
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
          },
        },
      })
    }

    const registerServiceWorker = () => {
      void navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          showUpdateToast(registration)

          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing
            if (!installingWorker) {
              return
            }

            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                showUpdateToast(registration)
              }
            })
          })
        })
        .catch(() => {
          // Keep SW registration failure silent for end users.
        })
    }

    if (document.readyState === 'complete') {
      registerServiceWorker()
    } else {
      window.addEventListener('load', registerServiceWorker, { once: true })
    }

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      onControllerChange,
    )

    return () => {
      window.removeEventListener('load', registerServiceWorker)
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        onControllerChange,
      )
    }
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
