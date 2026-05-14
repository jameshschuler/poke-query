import { createFileRoute } from '@tanstack/react-router'

import { ProtectedPageShell } from '#/components/protected-page-shell'
import { requireAuthenticated } from '#/lib/route-auth'

export const Route = createFileRoute('/favorites')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/favorites')
  },
  component: FavoritesPage,
})

function FavoritesPage() {
  return (
    <ProtectedPageShell
      title="Favorites"
      subtitle="Quick access to the strings and prompts you saved for later."
      stats={[
        { label: 'Favorited', value: '64' },
        { label: 'Pinned', value: '9' },
        { label: 'Shared With Team', value: '18' },
        { label: 'Recently Opened', value: '6' },
      ]}
      rows={[
        {
          title: 'Master League Core Builder',
          meta: 'Opened 5 min ago',
          tags: ['Pinned', 'PvP'],
        },
        {
          title: 'Remote Raid Invite Template',
          meta: 'Opened today',
          tags: ['Template', 'Social'],
        },
        {
          title: 'Weekly Quest Reminder',
          meta: 'Opened yesterday',
          tags: ['Automation', 'Community'],
        },
      ]}
    />
  )
}
