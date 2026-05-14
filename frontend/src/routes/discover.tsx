import { createFileRoute } from '@tanstack/react-router'

import { ProtectedPageShell } from '#/components/protected-page-shell'
import { requireAuthenticated } from '#/lib/route-auth'

export const Route = createFileRoute('/discover')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/discover')
  },
  component: DiscoverPage,
})

function DiscoverPage() {
  return (
    <ProtectedPageShell
      title="Discover"
      subtitle="Browse popular and recently updated community search strings."
      stats={[
        { label: 'Community Strings', value: '1,284' },
        { label: 'New Today', value: '42' },
        { label: 'Most Forked', value: 'Starter Prompt' },
        { label: 'Trending Tag', value: 'PVP' },
      ]}
      rows={[
        {
          title: 'Great League Safe Switches',
          meta: 'By Akira · Updated 12 min ago',
          tags: ['PvP', 'Meta'],
        },
        {
          title: 'Raid Counter Checklist',
          meta: 'By Mina · Updated 35 min ago',
          tags: ['Raid', 'Infographic'],
        },
        {
          title: 'Community Day Reminder Copy',
          meta: 'By Team Ops · Updated 1 hour ago',
          tags: ['Events', 'Automation'],
        },
      ]}
    />
  )
}
