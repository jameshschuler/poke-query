import type { ReactNode } from 'react'

import { cn } from '#/lib/utils'

type QueryCardHeaderProps = {
  title: string
  onTitleClick: () => void
  titleClassName?: string
  action?: ReactNode
  children: ReactNode
}

function QueryCardHeader({
  title,
  onTitleClick,
  titleClassName = 'text-left text-sm font-semibold hover:underline',
  action,
  children,
}: QueryCardHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          className={cn('min-w-0 flex-1', titleClassName)}
          onClick={onTitleClick}
        >
          {title}
        </button>

        {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">{children}</div>
    </div>
  )
}

export { QueryCardHeader }
