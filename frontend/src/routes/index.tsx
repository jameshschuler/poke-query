import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@authabase/react'
import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { DashboardPage } from '#/components/dashboard-page'

export const Route = createFileRoute('/')({ component: IndexPage })

function IndexPage() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!isLoading && user) {
      void navigate({ to: '/dashboard', replace: true })
    }
  }, [isLoading, user, navigate])

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="rounded-xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur">
          {user ? `Loading your dashboard...` : `Loading PokeQuery...`}
        </div>
      </main>
    )
  }

  return <DashboardPage />
}
