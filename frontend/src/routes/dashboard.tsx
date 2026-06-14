import { useAuth } from '@authabase/react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PageShell } from '#/components/page-shell'
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

  const subtitle = `Signed in as ${user.email ?? 'trainer'}.`

  return (
    <PageShell title="Dashboard" subtitle={subtitle}>
      <div className="rounded-xl border border-border/70 bg-background/70 p-6">
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
      </div>
    </PageShell>
  )
}
