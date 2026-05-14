import { PlusIcon, SearchIcon } from 'lucide-react'

import { AppSidebar } from '#/components/app-sidebar'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Separator } from '#/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'

type ShellStat = {
  label: string
  value: string
}

type ShellRow = {
  title: string
  meta: string
  tags?: string[]
}

type ProtectedPageShellProps = {
  title: string
  subtitle: string
  stats: ShellStat[]
  rows: ShellRow[]
}

export function ProtectedPageShell({
  title,
  subtitle,
  stats,
  rows,
}: ProtectedPageShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-1 data-[orientation=vertical]:h-4"
            />
            <h1 className="text-base font-semibold md:text-lg">{title}</h1>
          </div>

          <div className="flex w-full max-w-xl items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search queries..."
                className="h-10 rounded-full pl-9"
              />
            </div>
            <Button className="rounded-full px-4">
              <PlusIcon />
              New String
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col p-4 md:p-6">
          <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{stat.value}</p>
                </div>
              ))}
            </div>

            <Separator className="my-5" />

            <div className="space-y-3">
              {rows.map((row) => (
                <article
                  key={row.title}
                  className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{row.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {row.meta}
                      </p>
                    </div>

                    {row.tags?.length ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {row.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-muted px-2.5 py-1 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
