import { Link } from '@tanstack/react-router'

type PublicInfoLinksProps = {
  className?: string
}

export function PublicInfoLinks({ className = '' }: PublicInfoLinksProps) {
  return (
    <p
      className={`text-center text-xs text-muted-foreground ${className}`.trim()}
    >
      <Link to="/about" className="underline underline-offset-2">
        About
      </Link>{' '}
      ·{' '}
      <Link to="/privacy" className="underline underline-offset-2">
        Privacy Policy
      </Link>{' '}
      ·{' '}
      <Link to="/terms" className="underline underline-offset-2">
        Terms
      </Link>
    </p>
  )
}
