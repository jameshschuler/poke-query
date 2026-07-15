import type { ReactNode } from 'react'

type QueryCardActionsProps = {
  children: ReactNode
}

function QueryCardActions({ children }: QueryCardActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl bg-background/70 p-1.5">
      {children}
    </div>
  )
}

export { QueryCardActions }
