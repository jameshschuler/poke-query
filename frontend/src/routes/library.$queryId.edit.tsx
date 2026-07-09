import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { PageShell } from '#/components/page-shell'
import { Button } from '#/components/ui/button'
import { findBlockedTerm } from '#/lib/content-policy'
import { getMyQueries, updateQuery } from '#/lib/poke-query-api'
import { requireAuthenticated } from '#/lib/route-auth'

type VisibilityMode = 'public' | 'private'

export const Route = createFileRoute('/library/$queryId/edit')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/library')
  },
  component: EditLibraryQueryPage,
})

function EditLibraryQueryPage() {
  const { queryId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [query, setQuery] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<VisibilityMode>('public')

  const titleBlockedTerm = findBlockedTerm(title.trim())
  const descriptionBlockedTerm = description.trim()
    ? findBlockedTerm(description.trim())
    : null

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-queries'],
    queryFn: getMyQueries,
  })

  const currentQuery = data?.queries.find((item) => item.id === queryId) ?? null

  useEffect(() => {
    if (!currentQuery) {
      return
    }

    setTitle(currentQuery.title)
    setQuery(currentQuery.query)
    setDescription(currentQuery.description ?? '')
    setVisibility(currentQuery.isPublic ? 'public' : 'private')
  }, [currentQuery])

  const updateMutation = useMutation({
    mutationFn: async () =>
      updateQuery(queryId, {
        title: title.trim(),
        query: query.trim(),
        description: description.trim() || undefined,
        isPublic: visibility === 'public',
      }),
    onSuccess: async () => {
      toast.success('String updated.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-queries'] }),
        queryClient.invalidateQueries({ queryKey: ['query', queryId] }),
      ])
      await navigate({ to: '/library', replace: true })
    },
    onError: () => {
      toast.error('Could not update string.')
    },
  })

  const canSubmit =
    title.trim().length >= 3 &&
    query.trim().length > 0 &&
    !titleBlockedTerm &&
    !descriptionBlockedTerm
  const isPublic = visibility === 'public'

  return (
    <PageShell
      title="Edit String"
      subtitle="Update the title, string, description, and visibility."
      contentHeaderVariant="floating"
      showSidebar
      showHeaderSearch={false}
    >
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              to="/library"
              className="hover:text-foreground hover:underline"
            >
              Library
            </Link>
            <span>/</span>
            {currentQuery ? (
              <span className="max-w-56 truncate text-foreground">
                {currentQuery.title}
              </span>
            ) : (
              <span className="text-foreground">String</span>
            )}
            <span>/</span>
            <span className="text-foreground">Edit</span>
          </nav>

          <div className="ml-auto flex flex-row flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => navigate({ to: '/library' })}
            >
              Cancel
            </Button>

            <Button
              type="button"
              className="rounded-xl"
              disabled={!canSubmit || updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-border/70 bg-card/95 p-6 text-sm text-muted-foreground">
            Loading string...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-border/70 bg-card/95 p-6 text-sm text-muted-foreground">
            Could not load this string.
          </div>
        ) : !currentQuery ? (
          <div className="space-y-4 rounded-2xl border border-border/70 bg-card/95 p-6 text-sm text-muted-foreground">
            <p>This string was not found in your library.</p>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => navigate({ to: '/library' })}
            >
              Back to Library
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <label className="space-y-2">
              <span className="text-sm font-medium">Name</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Max IV Attackers"
                className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                maxLength={100}
                autoComplete="off"
              />
              {titleBlockedTerm ? (
                <p className="text-xs text-destructive">
                  Remove blocked language from the name.
                </p>
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Search string</span>
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="4*&!traded&cp2500-"
                className="min-h-40 w-full resize-none rounded-2xl border border-border/60 bg-background px-3 py-3 font-mono text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What this string is for..."
                className="min-h-24 w-full resize-none rounded-2xl border border-border/60 bg-background px-3 py-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                maxLength={500}
              />
              {descriptionBlockedTerm ? (
                <p className="text-xs text-destructive">
                  Remove blocked language from the description.
                </p>
              ) : null}
            </label>

            <div className="space-y-2">
              <span className="text-sm font-medium">Visibility</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    isPublic
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/60 bg-background hover:bg-muted'
                  }`}
                  onClick={() => setVisibility('public')}
                >
                  Public
                </button>
                <button
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    !isPublic
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/60 bg-background hover:bg-muted'
                  }`}
                  onClick={() => setVisibility('private')}
                >
                  Private
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
