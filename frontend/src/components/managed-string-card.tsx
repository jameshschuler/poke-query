import type { ReactNode } from 'react'

import { QueryCardActions } from '#/components/query-card-actions'
import { QueryCardHeader } from '#/components/query-card-header'
import { QueryTagBadges } from '#/components/query-tag-badges'

type ManagedStringCardProps = {
  title: string
  onTitleClick: () => void
  titleClassName?: string
  headerAction?: ReactNode
  statusBadges: ReactNode
  description?: string | null
  query: string
  details?: ReactNode
  tags: string[]
  footer: ReactNode
}

export function ManagedStringCard({
  title,
  onTitleClick,
  titleClassName,
  headerAction,
  statusBadges,
  description,
  query,
  details,
  tags,
  footer,
}: ManagedStringCardProps) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/70 bg-card/95 px-4 py-4 text-foreground dark:bg-card">
      <div className="flex h-full flex-col gap-4">
        <div className="min-w-0 flex-1">
          <QueryCardHeader
            title={title}
            onTitleClick={onTitleClick}
            titleClassName={titleClassName}
            action={headerAction}
          >
            {statusBadges}
          </QueryCardHeader>

          <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {description ?? 'No description yet.'}
            </p>

            <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
              <p className="font-mono text-xs text-muted-foreground">{query}</p>
            </div>

            {details ? (
              <div className="space-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                {details}
              </div>
            ) : null}

            <div className="border-t border-border/60 pt-2">
              <QueryTagBadges tags={tags} />
            </div>
          </div>
        </div>

        <div className="flex h-14 w-full items-end justify-center border-t border-border/60 pb-1">
          <QueryCardActions>{footer}</QueryCardActions>
        </div>
      </div>
    </article>
  )
}
