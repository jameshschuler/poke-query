import { useEffect, useMemo, useState } from 'react'

import type { ManagedQuery } from '#/lib/poke-query-api'

export type StatusFilter = 'all' | 'draft' | 'public'
export type LayoutMode = 'list' | 'grid-2' | 'grid-3'

const LIBRARY_LAYOUT_STORAGE_KEY = 'poke-query:library-layout'

function isLayoutMode(value: string | null): value is LayoutMode {
  return value === 'list' || value === 'grid-2' || value === 'grid-3'
}

export function useLibraryViewState(queries: ManagedQuery[]) {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    if (typeof window === 'undefined') {
      return 'grid-3'
    }

    const stored = window.localStorage.getItem(LIBRARY_LAYOUT_STORAGE_KEY)
    return isLayoutMode(stored) ? stored : 'grid-3'
  })

  useEffect(() => {
    window.localStorage.setItem(LIBRARY_LAYOUT_STORAGE_KEY, layoutMode)
  }, [layoutMode])

  const normalizedSearch = searchText.trim().toLowerCase()

  const filteredQueries = useMemo(
    () =>
      queries.filter((query) => {
        if (statusFilter === 'draft' && query.isPublic) {
          return false
        }

        if (statusFilter === 'public' && !query.isPublic) {
          return false
        }

        if (!normalizedSearch) {
          return true
        }

        const searchableText = [
          query.title,
          query.query,
          query.description ?? '',
          ...query.userTags,
          ...query.autoTags,
        ]
          .join(' ')
          .toLowerCase()

        return searchableText.includes(normalizedSearch)
      }),
    [normalizedSearch, queries, statusFilter],
  )

  const draftCount = queries.filter((query) => !query.isPublic).length
  const publicCount = queries.length - draftCount
  const totalViews = queries.reduce((sum, query) => sum + query.viewCount, 0)
  const lastEdited = queries[0]?.updatedAt ?? null

  const resultsLayoutClass =
    layoutMode === 'list'
      ? 'mt-5 space-y-4'
      : layoutMode === 'grid-2'
        ? 'mt-5 grid gap-4 md:grid-cols-2'
        : 'mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3'

  const loadingCardClass =
    layoutMode === 'list'
      ? 'h-24 animate-pulse rounded-2xl border border-border/70 bg-card/95 dark:bg-card'
      : 'h-40 animate-pulse rounded-2xl border border-border/70 bg-card/95 dark:bg-card'

  return {
    draftCount,
    filteredQueries,
    lastEdited,
    layoutMode,
    loadingCardClass,
    publicCount,
    resultsLayoutClass,
    searchText,
    setLayoutMode,
    setSearchText,
    setStatusFilter,
    statusFilter,
    totalViews,
  }
}
