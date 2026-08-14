import type { ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  BookOpenIcon,
  GitForkIcon,
  HeartIcon,
  LayoutDashboardIcon,
  SearchIcon,
} from 'lucide-react'

import { AppSidebar } from '#/components/app-sidebar'
import { ThemeToggle } from '#/components/theme-toggle'
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
  outsideCardContent?: ReactNode
  headerControls?: ReactNode
  contentHeaderVariant?: 'inline' | 'floating' | 'none'
}

export function PageShell({
  headerPrefix,
  title,
  subtitle,
  children,
  outsideCardContent,
  headerControls,
  contentHeaderVariant = 'inline',
}: PageShellProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const mobileNavItems = [
    { to: '/', label: 'Discover', icon: SearchIcon },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
    { to: '/library', label: 'Library', icon: BookOpenIcon },
    { to: '/forks', label: 'Forks', icon: GitForkIcon },
    { to: '/favorites', label: 'Favorites', icon: HeartIcon },
  ]

  const mobileBottomNav = (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 px-3 py-2 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {mobileNavItems.map((item) => {
          const isActive =
            item.to === '/'
              ? pathname === '/' || pathname === '/discover'
              : pathname === item.to || pathname.startsWith(`${item.to}/`)

          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-colors ${
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )

  const pageContent = (
    <>
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border/60 bg-zinc-50 px-5 py-4 text-foreground transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 dark:bg-zinc-900 sm:flex-nowrap md:px-8 lg:px-10">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1 text-foreground" />
          <Separator orientation="vertical" className="mr-1" />
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
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle placement="inline" />
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col bg-zinc-50 p-5 pb-24 dark:bg-zinc-900 md:p-8 md:pb-8 lg:p-10">
        {contentHeaderVariant === 'floating' ? (
          <div className="mb-6 rounded-2xl border border-border/70 bg-card/95 p-4 text-foreground shadow-sm backdrop-blur dark:bg-card">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        ) : null}

        {outsideCardContent ? (
          <div className="mb-6">{outsideCardContent}</div>
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

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>{pageContent}</SidebarInset>
      </SidebarProvider>
      {mobileBottomNav}
    </>
  )
}
