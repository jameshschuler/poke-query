import { createFileRoute } from '@tanstack/react-router'

import { DashboardPage } from '#/components/dashboard-page'
import { requireAuthenticated } from '#/lib/route-auth'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ location }) => {
    await requireAuthenticated(location.pathname)
  },
  component: DashboardPage,
})
