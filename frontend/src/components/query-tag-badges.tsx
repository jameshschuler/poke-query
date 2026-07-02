import { Badge } from '#/components/ui/badge'

type QueryTagBadgesProps = {
  tags: string[]
}

function QueryTagBadges({ tags }: QueryTagBadgesProps) {
  if (tags.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary">
          {tag}
        </Badge>
      ))}
    </div>
  )
}

export { QueryTagBadges }
