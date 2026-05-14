import { createFileRoute } from '@tanstack/react-router'

import { ProtectedPageShell } from '#/components/protected-page-shell'
import { requireAuthenticated } from '#/lib/route-auth'

export const Route = createFileRoute('/forked')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/forked')
  },
  component: ForkedPage,
})

function ForkedPage() {
  return (
    <ProtectedPageShell
      title="Forked"
      subtitle="Track strings you forked from the community and keep them in sync."
      stats={[
        { label: 'Forked Strings', value: '29' },
        { label: 'Need Sync', value: '7' },
        { label: 'Updated This Week', value: '11' },
        { label: 'Conflicts', value: '2' },
      ]}
      rows={[
        {
          title: 'Silph Cup Announcement Copy',
          meta: 'Upstream updated 2 hours ago',
          tags: ['Sync Needed', 'Events'],
        },
        {
          title: 'Raid Hour Social Caption',
          meta: 'Synced yesterday',
          tags: ['Synced', 'Social'],
        },
        {
          title: 'Gym Defense Rotation Notes',
          meta: 'Conflict detected · 3 days ago',
          tags: ['Conflict', 'Internal'],
        },
      ]}
    />
  )
}
