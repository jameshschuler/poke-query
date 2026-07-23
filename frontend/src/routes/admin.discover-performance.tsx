import { createFileRoute, Link, redirect } from '@tanstack/react-router'

import { DashboardDiscoverMetricsCard } from '#/components/dashboard-discover-metrics-card'
import { Button } from '#/components/ui/button'
import { PageShell } from '#/components/page-shell'
import { getMe } from '#/lib/poke-query-api'
import { requireAuthenticated } from '#/lib/route-auth'

export const Route = createFileRoute('/admin/discover-performance')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/admin/discover-performance')

    const me = await getMe()
    if (me.role !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DiscoverPerformanceAdminPage,
})

function DiscoverPerformanceAdminPage() {
  return (
    <PageShell
      title="Discover performance"
      subtitle="Monitor surfacing quality, CTR, and impression spread for Discover."
      contentHeaderVariant="floating"
      showSidebar
      showHeaderSearch={false}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Admin analytics
            </p>
            <h2 className="text-lg font-semibold tracking-tight">
              Discover surfacing performance
            </h2>
          </div>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/dashboard" />}
          >
            Back to dashboard
          </Button>
        </div>

        <DashboardDiscoverMetricsCard isAdmin />
      </div>
    </PageShell>
  )
}
