import { useEffect, useMemo, useState } from 'react'

import type { ManagedForkQuery } from '#/lib/poke-query-api'

export type VisibilityFilter = 'all' | 'draft' | 'public'
export type SyncFilter = 'all' | 'up-to-date' | 'behind' | 'orphaned'
export type LayoutMode = 'list' | 'grid-2' | 'grid-3'

const FORKS_LAYOUT_STORAGE_KEY = 'poke-query:forks-layout'

function isLayoutMode(value: string | null): value is LayoutMode {
  return value === 'list' || value === 'grid-2' || value === 'grid-3'
}

export function useForksViewState(forks: ManagedForkQuery[]) {
  const [searchText, setSearchText] = useState('')
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>('all')
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('all')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    if (typeof window === 'undefined') {
      return 'grid-3'
    }

    const stored = window.localStorage.getItem(FORKS_LAYOUT_STORAGE_KEY)
    return isLayoutMode(stored) ? stored : 'grid-3'
  })

  useEffect(() => {
    window.localStorage.setItem(FORKS_LAYOUT_STORAGE_KEY, layoutMode)
  }, [layoutMode])

  const draftCount = forks.filter((fork) => !fork.isPublic).length
  const needSyncCount = forks.filter(
    (fork) => fork.syncStatus === 'behind',
  ).length
  const orphanedCount = forks.filter(
    (fork) => fork.syncStatus === 'orphaned',
  ).length
  const lastEdited = forks[0]?.updatedAt ?? null
  const normalizedSearch = searchText.trim().toLowerCase()

  const filteredForks = useMemo(
    () =>
      forks.filter((fork) => {
        if (visibilityFilter === 'draft' && fork.isPublic) {
          return false
        }

        if (visibilityFilter === 'public' && !fork.isPublic) {
          return false
        }

        if (syncFilter !== 'all' && fork.syncStatus !== syncFilter) {
          return false
        }

        if (!normalizedSearch) {
          return true
        }

        const searchableText = [
          fork.title,
          fork.query,
          fork.description ?? '',
          ...fork.userTags,
          ...fork.autoTags,
          fork.sourceQuery?.title ?? '',
          fork.sourceQuery?.query ?? '',
          fork.sourceQuery?.creator?.username ?? '',
        ]
          .join(' ')
          .toLowerCase()

        return searchableText.includes(normalizedSearch)
      }),
    [forks, normalizedSearch, syncFilter, visibilityFilter],
  )

  const resultsLayoutClass =
    layoutMode === 'list'
      ? 'mt-4 space-y-3'
      : layoutMode === 'grid-2'
        ? 'mt-4 grid gap-3 md:grid-cols-2'
        : 'mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3'

  const loadingCardClass =
    layoutMode === 'list'
      ? 'h-24 animate-pulse rounded-2xl border border-border/70 bg-card/95 dark:bg-card'
      : 'h-48 animate-pulse rounded-2xl border border-border/70 bg-card/95 dark:bg-card'

  return {
    draftCount,
    filteredForks,
    lastEdited,
    layoutMode,
    loadingCardClass,
    needSyncCount,
    orphanedCount,
    resultsLayoutClass,
    searchText,
    setLayoutMode,
    setSearchText,
    setSyncFilter,
    setVisibilityFilter,
    syncFilter,
    visibilityFilter,
  }
}
