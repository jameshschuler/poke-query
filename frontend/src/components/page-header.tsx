import type { ReactNode } from 'react'

import { PageBreadcrumbNav } from '#/components/page-breadcrumb-nav'

type PageHeaderProps = {
  title?: string | null
  actions?: ReactNode
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border/60">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-8 lg:px-10">
        <PageBreadcrumbNav title={title} className="min-w-0" />
        {actions ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-4 sm:w-auto sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  )
}
