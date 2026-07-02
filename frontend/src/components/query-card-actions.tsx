import type { ReactNode } from 'react'

type QueryCardActionsProps = {
  children: ReactNode
}

function QueryCardActions({ children }: QueryCardActionsProps) {
  return <div className="flex flex-wrap gap-2">{children}</div>
}

export { QueryCardActions }
