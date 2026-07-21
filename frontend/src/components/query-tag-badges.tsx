import { Badge } from '#/components/ui/badge'

type QueryTagBadgesProps = {
  userTags?: string[]
  autoTags?: string[]
}

function QueryTagBadges({ userTags = [], autoTags = [] }: QueryTagBadgesProps) {
  const normalizedUserTags = Array.from(new Set(userTags))
  const allTags = Array.from(new Set([...normalizedUserTags, ...autoTags]))

  if (allTags.length === 0) {
    return null
  }

  const userTagSet = new Set(normalizedUserTags)

  const userTagClassName =
    'rounded-md border-amber-300/70 bg-amber-100/70 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200'
  const autoTagClassName =
    'rounded-md border-border/70 bg-card text-muted-foreground'

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      {allTags.map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          className={userTagSet.has(tag) ? userTagClassName : autoTagClassName}
        >
          {tag}
        </Badge>
      ))}
    </div>
  )
}

export { QueryTagBadges }
