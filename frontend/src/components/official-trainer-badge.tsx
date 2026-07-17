import { Badge } from '#/components/ui/badge'

export const OFFICIAL_TRAINER_USERNAME = 'PokeQueryOfficial'

type OfficialTrainerBadgeProps = {
  username?: string | null
  size?: 'sm' | 'md' | 'lg'
}

export function isOfficialTrainerUsername(username?: string | null): boolean {
  return username === OFFICIAL_TRAINER_USERNAME
}

export function OfficialTrainerBadge({
  username,
  size = 'sm',
}: OfficialTrainerBadgeProps) {
  if (!isOfficialTrainerUsername(username)) {
    return null
  }

  return (
    <Badge
      variant="outline"
      size={size}
      className="border-amber-300/80 bg-amber-100/80 text-amber-900"
    >
      Official
    </Badge>
  )
}
