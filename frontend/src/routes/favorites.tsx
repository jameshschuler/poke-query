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
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Favorited', value: '64' },
          { label: 'Pinned', value: '9' },
          { label: 'Shared With Team', value: '18' },
          { label: 'Recently Opened', value: '6' },
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
    </ProtectedPageShell>
  )
}
