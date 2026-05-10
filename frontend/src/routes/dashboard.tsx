import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { useAuth } from '@authabase/react'

export const Route = createFileRoute('/dashboard')({
  component: DashboardRoute,
})

function DashboardRoute() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!isLoading && !user) {
      void navigate({
        to: '/login',
        search: { redirect: '/dashboard' },
        replace: true,
      })
    }
  }, [isLoading, user, navigate])

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
      </section>
    </main>
  )
}
