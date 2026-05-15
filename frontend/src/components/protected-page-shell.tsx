import { useAuth } from '@authabase/react'
import { PlusIcon, SearchIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { AppSidebar } from '#/components/app-sidebar'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Separator } from '#/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'

type ProtectedPageShellProps = {
  title: string
  subtitle: string
  children: ReactNode
}

export function ProtectedPageShell({
  title,
  subtitle,
  children,
}: ProtectedPageShellProps) {
  const { user } = useAuth()

  const pageContent = (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6">
        <div className="flex items-center gap-2">
          {user ? <SidebarTrigger className="-ml-1" /> : null}
          {user ? (
            <Separator
              orientation="vertical"
              className="mr-1 data-[orientation=vertical]:h-4"
            />
          ) : null}
          <h1 className="text-base font-semibold md:text-lg">{title}</h1>
        </div>

        <div className="flex w-full max-w-xl items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search queries..."
              className="h-10 rounded-full pr-4"
              style={{ paddingLeft: '2.75rem' }}
            />
          </div>
          {user ? (
            <Button className="rounded-full px-4">
              <PlusIcon />
              New String
            </Button>
          ) : null}
        </div>
      </header>

      <main className="flex flex-1 flex-col p-4 md:p-6">
        <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <Separator className="my-5" />
          {children}
        </section>
      </main>
    </>
  )

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {pageContent}
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{pageContent}</SidebarInset>
    </SidebarProvider>
  )
}
