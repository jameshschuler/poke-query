import { Link } from '@tanstack/react-router'

type PageBreadcrumbNavProps = {
  title?: string | null
}

export function PageBreadcrumbNav({ title }: PageBreadcrumbNavProps) {
  const normalizedTitle = title?.trim() ?? ''

  return (
    <nav className="flex min-w-0 flex-1 basis-0 items-center gap-2 text-sm">
      <Link
        to="/discover"
        className="shrink-0 whitespace-nowrap text-muted-foreground hover:text-foreground"
      >
        ← Discover
      </Link>
      {normalizedTitle ? (
        <>
          <span className="shrink-0 text-muted-foreground">/</span>
          <span className="block min-w-0 flex-1 truncate text-base font-semibold">
            {normalizedTitle}
          </span>
        </>
      ) : null}
    </nav>
  )
}
