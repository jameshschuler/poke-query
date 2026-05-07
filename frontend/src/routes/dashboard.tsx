import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@authabase/react'

import { DashboardPage } from '#/components/dashboard-page'

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

  return <DashboardPage />
}
