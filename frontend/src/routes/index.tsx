import { createFileRoute } from '@tanstack/react-router'

import { DiscoverPage, validateDiscoverSearch } from './discover'

export const Route = createFileRoute('/')({
  ssr: false,
  validateSearch: validateDiscoverSearch,
  component: HomePage,
})

function HomePage() {
  const routeSearch = Route.useSearch()

  return <DiscoverPage routeSearch={routeSearch} searchRoutePath="/" />
}
