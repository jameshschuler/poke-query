import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon } from 'lucide-react'
import type { ClassValue } from 'clsx'

import { cn } from '@/lib/utils'

type PageBreadcrumbNavProps = {
  title?: string | null
  className?: ClassValue
}

export function PageBreadcrumbNav({
  title,
  className,
}: PageBreadcrumbNavProps) {
  const normalizedTitle = title?.trim() ?? ''

  return (
    <nav className={cn('flex min-w-0 items-center gap-2 text-sm', className)}>
      <Link
        to="/discover"
        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-muted-foreground hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" aria-hidden="true" />
        Discover
      </Link>
      {normalizedTitle ? (
        <>
          <span className="shrink-0 text-muted-foreground">/</span>
          <span className="block min-w-0 truncate text-base font-semibold text-foreground">
            {normalizedTitle}
          </span>
        </>
      ) : null}
    </nav>
  )
}
