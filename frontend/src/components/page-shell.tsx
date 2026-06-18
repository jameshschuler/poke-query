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

type PageShellProps = {
  headerPrefix?: string
  title: string
  subtitle: string
  children: ReactNode
  headerControls?: ReactNode
  contentHeaderVariant?: 'inline' | 'floating' | 'none'
  showSidebar?: boolean
}

export function PageShell({
  headerPrefix,
  title,
  subtitle,
  children,
  headerControls,
  contentHeaderVariant = 'inline',
  showSidebar,
}: PageShellProps) {
  const { user } = useAuth()
  const shouldShowSidebar = showSidebar ?? Boolean(user)

  const pageContent = (
    <>
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border/60 px-5 py-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sm:flex-nowrap md:px-8 lg:px-10">
        <div className="flex items-center gap-2">
          {shouldShowSidebar ? <SidebarTrigger className="-ml-1" /> : null}
          {shouldShowSidebar ? (
            <Separator orientation="vertical" className="mr-1" />
          ) : null}
          {headerPrefix ? (
            <p className="text-sm font-medium text-muted-foreground md:text-base">
              {headerPrefix}
            </p>
          ) : null}
          {headerPrefix ? (
            <Separator orientation="vertical" className="mr-1" />
          ) : null}
          <h1 className="text-base font-semibold md:text-lg">{title}</h1>
        </div>

        {headerControls ? (
          headerControls
        ) : (
          <div className="flex w-full items-center gap-2 md:ml-auto md:max-w-xl">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search queries..."
                className="h-10 rounded-full pr-4"
                style={{ paddingLeft: '2.75rem' }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
              />
            </div>
            {user ? (
              <Button className="shrink-0 rounded-full px-3 sm:px-4">
                <PlusIcon />
                <span>New String</span>
              </Button>
            ) : null}
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col p-5 md:p-8 lg:p-10">
        {contentHeaderVariant === 'floating' ? (
          <div className="mb-6 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        ) : null}

        <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          {contentHeaderVariant === 'inline' ? (
            <>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
              <Separator className="my-5" />
            </>
          ) : null}

          {children}
        </section>
      </main>
    </>
  )

  if (!shouldShowSidebar) {
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
