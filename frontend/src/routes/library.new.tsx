import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PageShell } from '#/components/page-shell'
import { Button } from '#/components/ui/button'
import { findBlockedTerm } from '#/lib/content-policy'
import { createQuery } from '#/lib/poke-query-api'
import { requireAuthenticated } from '#/lib/route-auth'

type VisibilityMode = 'public' | 'private'

export const Route = createFileRoute('/library/new')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/library/new')
  },
  component: NewLibraryQueryPage,
})

function NewLibraryQueryPage() {
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

  const createMutation = useMutation({
    mutationFn: async (nextVisibility: VisibilityMode) =>
      createQuery({
        title: title.trim(),
        query: query.trim(),
        description: description.trim() || undefined,
        isPublic: nextVisibility === 'public',
      }),
    onSuccess: async (result, nextVisibility) => {
      await queryClient.invalidateQueries({ queryKey: ['my-queries'] })
      toast.success(
        nextVisibility === 'public'
          ? 'String published.'
          : 'String saved as a draft.',
      )

      if (nextVisibility === 'public') {
        await navigate({
          to: '/queries/$queryId',
          params: { queryId: result.id },
          replace: true,
        })
        return
      }

      await navigate({ to: '/library', replace: true })
    },
    onError: () => {
      toast.error('Could not save string.')
    },
  })

  const canSubmit =
    title.trim().length >= 3 &&
    query.trim().length > 0 &&
    !titleBlockedTerm &&
    !descriptionBlockedTerm

  function handleSubmit(nextVisibility: VisibilityMode) {
    if (!canSubmit || createMutation.isPending) {
      return
    }

    setVisibility(nextVisibility)
    createMutation.mutate(nextVisibility)
  }

  const isPublic = visibility === 'public'

  return (
    <PageShell
      title="New String"
      subtitle="Draft it privately or publish it to the community."
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
            <span className="text-foreground">New</span>
          </nav>

          <div className="ml-auto flex flex-row flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={!canSubmit || createMutation.isPending}
              onClick={() => handleSubmit('private')}
            >
              {createMutation.isPending && visibility === 'private' ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Save Draft
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={!canSubmit || createMutation.isPending}
              onClick={() => handleSubmit('public')}
            >
              {createMutation.isPending && visibility === 'public' ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Publish
            </Button>
          </div>
        </div>

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
          <p className="text-xs text-muted-foreground">
            {isPublic
              ? 'Public strings can be discovered by the community.'
              : 'Private drafts stay in your library until you publish them.'}
          </p>
        </div>
      </div>
    </PageShell>
  )
}
