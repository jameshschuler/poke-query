import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@authabase/react'
import * as React from 'react'

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Poke Query</h1>
      <p className="max-w-xl text-sm text-muted-foreground">
        Search and share Pokemon GO PvP queries with your community.
      </p>
      <button
        type="button"
        onClick={() =>
          void navigate({ to: '/login', search: { redirect: '/dashboard' } })
        }
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Continue to login
      </button>
    </main>
  )
}
