import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import * as React from 'react'
import appCss from '../globals.css?url'

import { AppProviders } from '#/app-providers'
import { AppErrorPage, AppNotFoundPage } from '#/components/app-route-feedback'

// Lazy-load TanStack Devtools only in development (prevents SSR errors)
const TanStackDevtools =
  process.env.NODE_ENV === 'production'
    ? () => null
    : React.lazy(() =>
        import('@tanstack/react-devtools').then((res) => ({
          default: res.TanStackDevtools,
        })),
      )

const TanStackRouterDevtoolsPanel =
  process.env.NODE_ENV === 'production'
    ? () => null
    : React.lazy(() =>
        import('@tanstack/react-router-devtools').then((res) => ({
          default: res.TanStackRouterDevtoolsPanel,
        })),
      )

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
        {process.env.NODE_ENV !== 'production' && (
          <React.Suspense fallback={null}>
            <TanStackDevtools
              config={{
                position: 'bottom-left',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: (
                    <React.Suspense fallback={null}>
                      <TanStackRouterDevtoolsPanel />
                    </React.Suspense>
                  ),
                },
              ]}
            />
          </React.Suspense>
        )}
        <Scripts />
      </body>
    </html>
  )
}
