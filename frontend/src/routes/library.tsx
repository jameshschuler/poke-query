import { createFileRoute } from '@tanstack/react-router'

import { PageShell } from '#/components/page-shell'
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
    <PageShell
      title="My Library"
      subtitle="Manage your personal search strings and draft queries."
      contentHeaderVariant="floating"
      showSidebar
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Owned Strings', value: '87' },
          { label: 'Drafts', value: '14' },
          { label: 'Published', value: '53' },
          { label: 'Last Edited', value: '3 min ago' },
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
