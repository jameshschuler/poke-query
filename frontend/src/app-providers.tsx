import { AuthProvider, type AuthConfig } from '@authabase/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useMemo, useState } from 'react'

export function AppProviders({ children }: { children: React.ReactNode }) {
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
    }),
    [],
  )

  return (
    <AuthProvider config={authConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </AuthProvider>
  )
}
