import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { PageShell } from '#/components/page-shell'
import { QueryTagsField } from '#/components/query-tags-field'
import { Button } from '#/components/ui/button'
import { findBlockedTerm } from '#/lib/content-policy'
import { ApiRequestError, getMyForks, updateQuery } from '#/lib/poke-query-api'
import { getMutationErrorMessage } from '#/lib/mutation-toast'
import type { ManagedForkQuery } from '#/lib/poke-query-api'
import { requireAuthenticated } from '#/lib/route-auth'

type VisibilityMode = 'public' | 'private'

export const Route = createFileRoute('/forks/$queryId/edit')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/forks')
  },
  component: EditForkPage,
})

function EditForkPage() {
  const { queryId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [query, setQuery] = useState('')
  const [description, setDescription] = useState('')
  const [referenceUrl, setReferenceUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [visibility, setVisibility] = useState<VisibilityMode>('public')

  const titleBlockedTerm = findBlockedTerm(title.trim())
  const descriptionBlockedTerm = description.trim()
    ? findBlockedTerm(description.trim())
    : null

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-forks'],
    queryFn: getMyForks,
  })

  const currentFork = data?.forks.find((item) => item.id === queryId) ?? null

  useEffect(() => {
    if (isLoading || error || currentFork) {
      return
    }

    toast.error('You can only edit forks in your own library.')
    void navigate({ to: '/forks', replace: true })
  }, [currentFork, error, isLoading, navigate])

  useEffect(() => {
    if (!currentFork) {
      return
    }

    setTitle(currentFork.title)
    setQuery(currentFork.query)
    setDescription(currentFork.description ?? '')
    setReferenceUrl(currentFork.referenceUrl ?? '')
    setTags(currentFork.userTags)
    setVisibility(currentFork.isPublic ? 'public' : 'private')
  }, [currentFork])

  const updateMutation = useMutation({
    mutationFn: async () =>
      updateQuery(queryId, {
        title: title.trim(),
        query: query.trim(),
        description: description.trim() || undefined,
        referenceUrl: referenceUrl.trim() || undefined,
        isPublic: visibility === 'public',
        tags,
      }),
    onSuccess: async () => {
      queryClient.setQueryData<{ forks: ManagedForkQuery[] }>(
        ['my-forks'],
        (previous) => {
          if (!previous) {
            return previous
          }

          return {
            forks: previous.forks.map((fork) =>
              fork.id === queryId
                ? {
                    ...fork,
                    title: title.trim(),
                    query: query.trim(),
                    description: description.trim() || null,
                    referenceUrl: referenceUrl.trim() || null,
                    isPublic: visibility === 'public',
                    userTags: tags,
                    updatedAt: new Date().toISOString(),
                  }
                : fork,
            ),
          }
        },
      )

      toast.success('Fork updated.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-forks'] }),
        queryClient.invalidateQueries({ queryKey: ['my-queries'] }),
        queryClient.invalidateQueries({ queryKey: ['query', queryId] }),
      ])
      await navigate({
        to: '/forks/$queryId',
        params: { queryId },
        replace: true,
      })
    },
    onError: (mutationError: unknown) => {
      if (mutationError instanceof ApiRequestError) {
        toast.error(mutationError.message)
        return
      }

      toast.error(
        getMutationErrorMessage(mutationError, 'Could not update fork.'),
      )
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
      title="Edit Fork"
      subtitle="Update this fork and choose whether to keep it private or publish it."
      contentHeaderVariant="floating"
      showSidebar
      showHeaderSearch={false}
    >
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/forks" className="hover:text-foreground hover:underline">
              Forks
            </Link>
            <span>/</span>
            <Link
              to="/forks/$queryId"
              params={{ queryId }}
              className="max-w-56 truncate hover:text-foreground hover:underline"
            >
              {currentFork?.title ?? 'Details'}
            </Link>
            <span>/</span>
            <span className="text-foreground">Edit</span>
          </nav>

          <div className="ml-auto flex flex-row flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() =>
                navigate({ to: '/forks/$queryId', params: { queryId } })
              }
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
            Loading fork...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-border/70 bg-card/95 p-6 text-sm text-muted-foreground">
            Could not load this fork.
          </div>
        ) : !currentFork ? null : (
          <div className="flex flex-col gap-8">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Name</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Forked string title"
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

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Search string</span>
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="4*&!traded&cp2500-"
                className="min-h-40 w-full resize-none rounded-2xl border border-border/60 bg-background px-3 py-3 font-mono text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What this fork is for..."
                className="min-h-24 w-full resize-none rounded-2xl border border-border/60 bg-background px-3 py-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                maxLength={500}
              />
              {descriptionBlockedTerm ? (
                <p className="text-xs text-destructive">
                  Remove blocked language from the description.
                </p>
              ) : null}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                Reference link (optional)
              </span>
              <input
                type="url"
                value={referenceUrl}
                onChange={(event) => setReferenceUrl(event.target.value)}
                placeholder="https://example.com/source"
                className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                maxLength={500}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Keep an attribution link so this fork stays easy to validate.
              </p>
            </label>

            <QueryTagsField
              tags={tags}
              onChange={setTags}
              helperText="Update tags to keep this fork easy to filter and revisit."
            />

            <div className="flex flex-col gap-2">
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
