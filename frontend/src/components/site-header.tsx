import { Search } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Input } from '#/components/ui/input'
import { Separator } from '#/components/ui/separator'
import { SidebarTrigger } from '#/components/ui/sidebar'

export function SiteHeader({
  showSidebarControls = true,
}: {
  showSidebarControls?: boolean
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  function handleSearch(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    void navigate({ to: '/', search: { q: trimmed } })
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {showSidebarControls ? <SidebarTrigger className="-ml-1" /> : null}
        {showSidebarControls ? (
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
        ) : null}

        <Link
          to="/"
          className="flex items-center gap-1.5 font-semibold tracking-tight text-foreground"
        >
          <span className="text-primary">Poke</span>Query
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <form
            onSubmit={handleSearch}
            className="relative hidden w-80 sm:flex"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search public queries…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </form>
          <Link
            to="/login"
            className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
          >
            Log in
          </Link>
        </div>
      </div>
    </header>
  )
}
