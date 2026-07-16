import { Badge } from '#/components/ui/badge'

type QueryTagBadgesProps = {
  tags: string[]
}

function QueryTagBadges({ tags }: QueryTagBadgesProps) {
  if (tags.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          className="rounded-md border-border/70 bg-card text-muted-foreground"
        >
          {tag}
        </Badge>
      ))}
    </div>
  )
}

export { QueryTagBadges }
