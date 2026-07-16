import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { createElement, lazy, Suspense, useEffect, useState } from 'react'
import appCss from '../globals.css?url'

import { AppProviders } from '#/app-providers'
import { AppErrorPage, AppNotFoundPage } from '#/components/app-route-feedback'

const RouterDevtools = lazy(async () => {
  const module = await import('@tanstack/react-devtools')
  return { default: module.TanStackDevtools as any }
})

const RouterDevtoolsPanel = lazy(async () => {
  const module = await import('@tanstack/react-router-devtools')
  return { default: module.TanStackRouterDevtoolsPanel as any }
})

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'PokeQuery',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  errorComponent: AppErrorPage,
  notFoundComponent: AppNotFoundPage,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
        <LocalRouterDevtools />
        <Scripts />
      </body>
    </html>
  )
}

function LocalRouterDevtools() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!import.meta.env.DEV || !mounted) {
    return null
  }

  return (
    <Suspense fallback={null}>
      {createElement(RouterDevtools as any, {
        config: {
          position: 'bottom-left',
        },
        plugins: [
          {
            name: 'Tanstack Router',
            render: <RouterDevtoolsPanel />,
          },
        ],
      })}
    </Suspense>
  )
}
