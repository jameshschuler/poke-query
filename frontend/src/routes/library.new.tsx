import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PageShell } from '#/components/page-shell'
import { QueryTagsField } from '#/components/query-tags-field'
import { Button } from '#/components/ui/button'
import { findBlockedTerm } from '#/lib/content-policy'
import { createQuery } from '#/lib/poke-query-api'
import { getMutationErrorMessage } from '#/lib/mutation-toast'
import { requireAuthenticated } from '#/lib/route-auth'

type VisibilityMode = 'public' | 'private'
type EntryMode = 'manual' | 'json'

const JSON_SKELETON = {
  title: 'Max IV Attackers',
  query: '4*&!traded&cp2500-',
  description: 'What this string is for...',
  referenceUrl: 'https://example.com/source',
  tags: ['raid', 'master-league'],
  visibility: 'public',
} as const

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
  const [entryMode, setEntryMode] = useState<EntryMode>('manual')
  const [jsonDraft, setJsonDraft] = useState('')
  const [jsonImportError, setJsonImportError] = useState<string | null>(null)
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

  const createMutation = useMutation({
    mutationFn: async (nextVisibility: VisibilityMode) =>
      createQuery({
        title: title.trim(),
        query: query.trim(),
        description: description.trim() || undefined,
        referenceUrl: referenceUrl.trim() || undefined,
        isPublic: nextVisibility === 'public',
        tags,
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
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, 'Could not save string.'))
    },
  })

  const canSubmit =
    title.trim().length >= 3 &&
    query.trim().length > 0 &&
    !titleBlockedTerm &&
    !descriptionBlockedTerm

  async function copyJsonSkeleton() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast.error('Clipboard is not available in this browser.')
      return
    }

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(JSON_SKELETON, null, 2),
      )
      toast.success('Template copied to clipboard.')
    } catch {
      toast.error('Could not copy template.')
    }
  }

  function applyJsonImport() {
    try {
      const parsed = JSON.parse(jsonDraft) as Record<string, unknown>

      if (parsed === null || typeof parsed !== 'object') {
        setJsonImportError('Template must be an object.')
        return
      }

      if (typeof parsed.title === 'string') {
        setTitle(parsed.title.trim())
      }

      if (typeof parsed.query === 'string') {
        setQuery(parsed.query.trim())
      }

      if (typeof parsed.description === 'string') {
        setDescription(parsed.description)
      }

      if (typeof parsed.referenceUrl === 'string') {
        setReferenceUrl(parsed.referenceUrl)
      }

      if (Array.isArray(parsed.tags)) {
        setTags(
          parsed.tags
            .filter((value): value is string => typeof value === 'string')
            .map((value) => value.trim())
            .filter(Boolean),
        )
      }

      if (parsed.visibility === 'private') {
        setVisibility('private')
      } else if (parsed.visibility === 'public') {
        setVisibility('public')
      } else if (parsed.isPublic === false) {
        setVisibility('private')
      } else if (parsed.isPublic === true) {
        setVisibility('public')
      }

      setJsonImportError(null)
      setEntryMode('manual')
      toast.success('Template imported into the form.')
    } catch {
      setJsonImportError('Invalid template. Check formatting and try again.')
    }
  }

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
      <div className="flex flex-col gap-8">
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

        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-4">
          <div
            className="inline-flex w-fit items-center gap-1 rounded-xl border border-border/60 bg-background p-1"
            role="tablist"
            aria-label="Entry mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={entryMode === 'manual'}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                entryMode === 'manual'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              onClick={() => setEntryMode('manual')}
            >
              Manual
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={entryMode === 'json'}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                entryMode === 'json'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              onClick={() => setEntryMode('json')}
            >
              Import Template
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                void copyJsonSkeleton()
              }}
            >
              Copy Template
            </Button>
          </div>
          {entryMode === 'json' ? (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">
                  Search string template
                </span>
                <textarea
                  value={jsonDraft}
                  onChange={(event) => {
                    setJsonDraft(event.target.value)
                    if (jsonImportError) {
                      setJsonImportError(null)
                    }
                  }}
                  placeholder={JSON.stringify(JSON_SKELETON, null, 2)}
                  className="min-h-56 w-full resize-y rounded-2xl border border-border/60 bg-background px-3 py-3 font-mono text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  aria-label="Search string template"
                />
              </label>
              {jsonImportError ? (
                <p className="text-xs text-destructive">{jsonImportError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Paste a template object and apply it to pre-fill the form.
                </p>
              )}
              <div>
                <Button
                  type="button"
                  className="rounded-xl"
                  onClick={applyJsonImport}
                >
                  Apply
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <label className="flex flex-col gap-2">
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

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Reference link (optional)</span>
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
            Add where this string came from so others can verify or learn more.
          </p>
        </label>

        <QueryTagsField
          tags={tags}
          onChange={setTags}
          helperText="Add your own tags to improve discovery for this string."
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
