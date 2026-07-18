import { useAuth } from '#/lib/auth-context'
import { Link } from '@tanstack/react-router'
import { PlusIcon, SearchIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { AppSidebar } from '#/components/app-sidebar'
import { ThemeToggle } from '#/components/theme-toggle'
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
  showHeaderSearch?: boolean
}

export function PageShell({
  headerPrefix,
  title,
  subtitle,
  children,
  headerControls,
  contentHeaderVariant = 'inline',
  showSidebar,
  showHeaderSearch = true,
}: PageShellProps) {
  const { user } = useAuth()
  const shouldShowSidebar = showSidebar ?? Boolean(user)

  const pageContent = (
    <>
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border/60 bg-zinc-50 px-5 py-4 text-foreground transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 dark:bg-zinc-900 sm:flex-nowrap md:px-8 lg:px-10">
        <div className="flex items-center gap-2">
          {shouldShowSidebar ? (
            <SidebarTrigger className="-ml-1 text-foreground" />
          ) : null}
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
          <div className="ml-auto flex items-center gap-2">
            {headerControls}
            <ThemeToggle placement="inline" />
          </div>
        ) : showHeaderSearch ? (
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
              <Button
                nativeButton={false}
                className="shrink-0 rounded-full px-3 sm:px-4"
                render={<Link to="/library/new" />}
              >
                <PlusIcon />
                <span>New String</span>
              </Button>
            ) : null}
            <ThemeToggle placement="inline" />
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle placement="inline" />
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col bg-zinc-50 p-5 dark:bg-zinc-900 md:p-8 lg:p-10">
        {contentHeaderVariant === 'floating' ? (
          <div className="mb-6 rounded-2xl border border-border/70 bg-card/95 p-4 text-foreground shadow-sm backdrop-blur dark:bg-card">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        ) : null}

        <section className="rounded-3xl border border-border/70 bg-card/95 p-6 text-foreground shadow-sm backdrop-blur dark:bg-card">
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
