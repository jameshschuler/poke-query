import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { PageShell } from '#/components/page-shell'
import {
  getCommunityQueriesPage,
  deleteWeeklyPick,
  getMe,
  getWeeklyPicks,
  upsertWeeklyPick,
} from '#/lib/poke-query-api'
import { getMutationErrorMessage } from '#/lib/mutation-toast'
import { requireAuthenticated } from '#/lib/route-auth'

export const Route = createFileRoute('/admin/weekly-picks')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/admin/weekly-picks')

    const me = await getMe()
    if (me.role !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: WeeklyPicksAdminPage,
})

function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  const timezoneOffset = parsed.getTimezoneOffset() * 60_000
  return new Date(parsed.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

function toIsoOrNull(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

function WeeklyPicksAdminPage() {
  const queryClient = useQueryClient()
  const [queryId, setQueryId] = useState('')
  const [querySearch, setQuerySearch] = useState('')
  const [debouncedQuerySearch, setDebouncedQuerySearch] = useState('')
  const [displayOrder, setDisplayOrder] = useState('0')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuerySearch(querySearch.trim())
    }, 250)

    return () => clearTimeout(handle)
  }, [querySearch])

  const { data: me, isLoading: isMeLoading } = useQuery({
    queryKey: ['weekly-picks-admin', 'me'],
    queryFn: getMe,
    retry: false,
  })

  const isAdmin = me?.role === 'admin'

  const {
    data: weeklyPicksData,
    isLoading: isWeeklyPicksLoading,
    error: weeklyPicksError,
  } = useQuery({
    queryKey: ['weekly-picks-admin', 'list'],
    queryFn: getWeeklyPicks,
    enabled: isAdmin,
  })

  const { data: querySearchResults, isFetching: isQuerySearchFetching } =
    useQuery({
      queryKey: ['weekly-picks-admin', 'query-search', debouncedQuerySearch],
      queryFn: () =>
        getCommunityQueriesPage({
          search: debouncedQuerySearch,
          filter: 'all',
          limit: 8,
          offset: 0,
        }),
      enabled: isAdmin && debouncedQuerySearch.length >= 2,
      staleTime: 20_000,
    })

  const upsertMutation = useMutation({
    mutationFn: upsertWeeklyPick,
    onSuccess: () => {
      toast.success('Weekly pick saved.')
      setQueryId('')
      setQuerySearch('')
      setDebouncedQuerySearch('')
      setDisplayOrder('0')
      setStartsAt('')
      setEndsAt('')
      setNotes('')
      setIsActive(true)
      void queryClient.invalidateQueries({
        queryKey: ['weekly-picks-admin', 'list'],
      })
      void queryClient.invalidateQueries({ queryKey: ['community-surfacing'] })
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, 'Could not save weekly pick.'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWeeklyPick,
    onSuccess: () => {
      toast.success('Weekly pick removed.')
      void queryClient.invalidateQueries({
        queryKey: ['weekly-picks-admin', 'list'],
      })
      void queryClient.invalidateQueries({ queryKey: ['community-surfacing'] })
    },
    onError: (error: unknown) => {
      toast.error(
        getMutationErrorMessage(error, 'Could not remove weekly pick.'),
      )
    },
  })

  const items = useMemo(
    () => weeklyPicksData?.items ?? [],
    [weeklyPicksData?.items],
  )

  const searchItems = useMemo(
    () => querySearchResults?.items ?? [],
    [querySearchResults?.items],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedQueryId = queryId.trim()
    if (!trimmedQueryId) {
      toast.error('Query ID is required.')
      return
    }

    const parsedOrder = Number(displayOrder)
    if (!Number.isFinite(parsedOrder) || parsedOrder < 0) {
      toast.error('Display order must be a non-negative number.')
      return
    }

    const startsAtIso = toIsoOrNull(startsAt)
    const endsAtIso = toIsoOrNull(endsAt)

    if (startsAt.trim() && !startsAtIso) {
      toast.error('Start date is invalid.')
      return
    }

    if (endsAt.trim() && !endsAtIso) {
      toast.error('End date is invalid.')
      return
    }

    if (
      startsAtIso &&
      endsAtIso &&
      new Date(startsAtIso) > new Date(endsAtIso)
    ) {
      toast.error('Start date must be before end date.')
      return
    }

    upsertMutation.mutate({
      queryId: trimmedQueryId,
      displayOrder: Math.floor(parsedOrder),
      isActive,
      startsAt: startsAtIso,
      endsAt: endsAtIso,
      notes: notes.trim().length > 0 ? notes.trim() : null,
    })
  }

  function handleEdit(item: {
    queryId: string
    title: string
    displayOrder: number
    isActive: boolean
    startsAt: string | null
    endsAt: string | null
    notes: string | null
  }) {
    setQueryId(item.queryId)
    setQuerySearch(item.title)
    setDisplayOrder(String(item.displayOrder))
    setIsActive(item.isActive)
    setStartsAt(toDateTimeLocalValue(item.startsAt))
    setEndsAt(toDateTimeLocalValue(item.endsAt))
    setNotes(item.notes ?? '')
  }

  if (isMeLoading) {
    return (
      <PageShell
        title="Weekly Picks"
        subtitle="Admin curation workspace"
        contentHeaderVariant="floating"
        showSidebar
        showHeaderSearch={false}
      >
        <p className="text-sm text-muted-foreground">Loading access...</p>
      </PageShell>
    )
  }

  if (!isAdmin) {
    return (
      <PageShell
        title="Weekly Picks"
        subtitle="Admin curation workspace"
        contentHeaderVariant="floating"
        showSidebar
        showHeaderSearch={false}
      >
        <p className="text-sm text-muted-foreground">
          Admin access is required to open this page.
        </p>
      </PageShell>
    )
  }

  return (
    <PageShell
      title="Weekly Picks"
      subtitle="Hand-pick discover highlights and control rotation windows."
      contentHeaderVariant="floating"
      showSidebar
      showHeaderSearch={false}
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-border/70 bg-card p-4">
          <h3 className="text-sm font-semibold">Add or update pick</h3>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2"
            onSubmit={handleSubmit}
          >
            <div className="md:col-span-2">
              <label
                htmlFor="weekly-pick-query-search"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Find public query
              </label>
              <Input
                id="weekly-pick-query-search"
                value={querySearch}
                onChange={(event) => setQuerySearch(event.target.value)}
                placeholder="Search by title, tags, or query text"
                autoComplete="off"
              />
              {querySearch.trim().length > 0 ? (
                <div className="mt-2 rounded-md border border-border/70 bg-background p-2">
                  {querySearch.trim().length < 2 ? (
                    <p className="text-xs text-muted-foreground">
                      Type at least 2 characters to search.
                    </p>
                  ) : isQuerySearchFetching ? (
                    <p className="text-xs text-muted-foreground">
                      Searching public queries...
                    </p>
                  ) : searchItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No matching public queries.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {searchItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="flex w-full items-center justify-between rounded-md border border-border/60 px-2 py-1.5 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setQueryId(item.id)
                            setQuerySearch(item.title)
                          }}
                        >
                          <span className="truncate pr-2">{item.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            Select
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="weekly-pick-query-id"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Query ID
              </label>
              <Input
                id="weekly-pick-query-id"
                value={queryId}
                onChange={(event) => setQueryId(event.target.value)}
                placeholder="UUID of public query"
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor="weekly-pick-display-order"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Display order
              </label>
              <Input
                id="weekly-pick-display-order"
                value={displayOrder}
                onChange={(event) => setDisplayOrder(event.target.value)}
                inputMode="numeric"
                autoComplete="off"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                />
                Active
              </label>
            </div>

            <div>
              <label
                htmlFor="weekly-pick-starts-at"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Starts at (optional)
              </label>
              <Input
                id="weekly-pick-starts-at"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="weekly-pick-ends-at"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Ends at (optional)
              </label>
              <Input
                id="weekly-pick-ends-at"
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="weekly-pick-notes"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Notes (optional)
              </label>
              <textarea
                id="weekly-pick-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Why this pick is featured"
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? 'Saving...' : 'Save weekly pick'}
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-border/70 bg-card p-4">
          <h3 className="text-sm font-semibold">Current picks</h3>
          {isWeeklyPicksLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Loading picks...
            </p>
          ) : weeklyPicksError ? (
            <p className="mt-3 text-sm text-destructive">
              Could not load weekly picks.
            </p>
          ) : items.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No weekly picks configured.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {items.map((item) => (
                <article
                  key={item.queryId}
                  className="rounded-lg border border-border/70 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.queryId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(item.queryId)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Order {item.displayOrder} •{' '}
                    {item.isActive ? 'Active' : 'Inactive'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Window: {item.startsAt ?? 'any time'} to{' '}
                    {item.endsAt ?? 'any time'}
                  </p>
                  {item.notes ? (
                    <p className="mt-1 text-sm">{item.notes}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  )
}
