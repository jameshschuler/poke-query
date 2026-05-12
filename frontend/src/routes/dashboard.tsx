import { useAuth } from '@authabase/react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { logout } from '#/lib/poke-query-api'
import { requireAuthenticated } from '#/lib/route-auth'

export const Route = createFileRoute('/dashboard')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/dashboard')
  },
  component: DashboardRoute,
})

function DashboardRoute() {
  const { user, isLoading, refreshSession } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logout()
      await refreshSession()
      void navigate({ to: '/', replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (isLoading || !user) {
    return null
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {user.email ?? 'trainer'}.
        </p>
      </header>
      <section className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Components were removed from this frontend build as requested.
        </p>
        <button
          type="button"
          onClick={() => {
            void handleLogout()
          }}
          disabled={isLoggingOut}
          className="mt-4 rounded-md border border-border px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoggingOut ? 'Logging out...' : 'Temp logout'}
        </button>
      </section>
    </main>
  )
}
