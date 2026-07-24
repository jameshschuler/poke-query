import { createFileRoute } from '@tanstack/react-router'

import { AppUpdatesPage } from '#/components/updates/app-updates-page'

export const Route = createFileRoute('/updates')({
  ssr: false,
  component: AppUpdatesPage,
})
