import { createFileRoute } from '@tanstack/react-router'

import { ProtectedPageShell } from '#/components/protected-page-shell'
import { requireAuthenticated } from '#/lib/route-auth'

export const Route = createFileRoute('/library')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/library')
  },
  component: LibraryPage,
})

function LibraryPage() {
  return (
    <ProtectedPageShell
      title="My Library"
      subtitle="Manage your personal search strings and draft queries."
      stats={[
        { label: 'Owned Strings', value: '87' },
        { label: 'Drafts', value: '14' },
        { label: 'Published', value: '53' },
        { label: 'Last Edited', value: '3 min ago' },
      ]}
      rows={[
        {
          title: 'UL Team Builder Notes',
          meta: 'Draft · Edited just now',
          tags: ['PvP', 'Draft'],
        },
        {
          title: 'Shadow Raid Prep Prompt',
          meta: 'Published · Edited today',
          tags: ['Raid', 'Template'],
        },
        {
          title: 'Trainer Outreach Follow-up',
          meta: 'Published · Edited yesterday',
          tags: ['CRM', 'Reusable'],
        },
      ]}
    />
  )
}
