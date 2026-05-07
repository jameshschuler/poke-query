import * as React from 'react'
import { useAuth } from '@authabase/react'

import { AppSidebar } from '#/components/app-sidebar'
import { ChartAreaInteractive } from '#/components/chart-area-interactive'
import { DataTable } from '#/components/data-table'
import { SectionCards } from '#/components/section-cards'
import { SiteHeader } from '#/components/site-header'
import { SidebarInset, SidebarProvider } from '#/components/ui/sidebar'

export function DashboardPage() {
  const { user } = useAuth()
  const isSignedIn = Boolean(user)

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      {isSignedIn ? <AppSidebar variant="inset" /> : null}
      <SidebarInset>
        <SiteHeader showSidebarControls={isSignedIn} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable data={[]} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
