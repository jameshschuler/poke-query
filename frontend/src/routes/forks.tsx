import { createFileRoute } from '@tanstack/react-router'

import { PageShell } from '#/components/page-shell'
import { requireAuthenticated } from '#/lib/route-auth'

export const Route = createFileRoute('/forks')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/forks')
  },
  component: ForksPage,
})

function ForksPage() {
  return (
    <PageShell
      title="Forks"
      subtitle="Track strings you forked from the community and keep them in sync."
      contentHeaderVariant="floating"
      showSidebar
      showHeaderSearch={false}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Forked Strings', value: '29' },
          { label: 'Need Sync', value: '7' },
          { label: 'Updated This Week', value: '11' },
          { label: 'Conflicts', value: '2' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 text-lg font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {[
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
        ].map((row) => (
          <article
            key={row.title}
            className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm font-semibold">{row.title}</h3>
                <p className="text-xs text-muted-foreground">{row.meta}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {row.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  )
}
