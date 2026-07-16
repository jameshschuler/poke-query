declare module '@tanstack/react-devtools' {
  import type { ComponentType, ReactNode } from 'react'

  type DevtoolsPlugin = {
    name: string
    render: ReactNode
  }

  export const TanStackDevtools: ComponentType<{
    config?: {
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    }
    plugins?: DevtoolsPlugin[]
  }>
}

declare module '@tanstack/react-router-devtools' {
  import type { ComponentType } from 'react'

  export const TanStackRouterDevtoolsPanel: ComponentType
}
