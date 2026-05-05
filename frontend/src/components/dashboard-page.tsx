import * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { AppSidebar } from '#/components/app-sidebar'
import { ChartAreaInteractive } from '#/components/chart-area-interactive'
import { DataTable, schema } from '#/components/data-table'
import { SectionCards } from '#/components/section-cards'
import { SiteHeader } from '#/components/site-header'
import { Badge } from '#/components/ui/badge'
import { SidebarInset, SidebarProvider } from '#/components/ui/sidebar'
import type { GetMeResponse } from '#/lib/poke-query-api'
import { getMe } from '#/lib/poke-query-api'
import dashboardData from '#/app/dashboard/data.json'

export function DashboardPage() {
  const meQuery = useQuery<GetMeResponse>({
    queryKey: ['me'],
    queryFn: getMe,
  })

  const tableData = React.useMemo(() => schema.array().parse(dashboardData), [])

  return (
    <SidebarProvider
      style={
        {
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-6 py-4">
          <section className="px-4 lg:px-6">
            <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Signed In As
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {meQuery.data?.username ?? 'Trainer'}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">
                  Queries: {meQuery.data?.queryCount ?? 0}
                </Badge>
                <Badge variant="outline">
                  Favorites: {meQuery.data?.favoriteCount ?? 0}
                </Badge>
                <Badge variant="outline">
                  Followers: {meQuery.data?.followerCount ?? 0}
                </Badge>
                <Badge variant="outline">
                  Forks: {meQuery.data?.forkCount ?? 0}
                </Badge>
              </div>
            </div>
          </section>

          <SectionCards />

          <section className="px-4 lg:px-6">
            <ChartAreaInteractive />
          </section>

          <section className="px-4 lg:px-6">
            <DataTable data={tableData} />
          </section>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
