import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import { formatTagLabel } from '#/lib/utils'
import type { QueryTag } from '#/lib/poke-query-api'

export type DiscoverSearchState = {
  q?: string
  filter?: string
}

export type DiscoverFilterOption = {
  key: string
  label: string
  filter?: 'all' | 'new' | 'popular' | 'official'
  tag?: string
}

const BASE_FILTERS: DiscoverFilterOption[] = [
  { key: 'all', label: 'All', filter: 'all' },
  { key: 'official', label: 'Official', filter: 'official' },
  { key: 'popular', label: 'Popular', filter: 'popular' },
  { key: 'new', label: 'New', filter: 'new' },
]

const DEFAULT_TAG_FILTERS: Array<{ tag: string; label: string }> = [
  { tag: 'master-league', label: 'Master League' },
  { tag: 'ultra-league', label: 'Ultra League' },
  { tag: 'great-league', label: 'Great League' },
  { tag: 'raid', label: 'Raid' },
  { tag: 'daily-catch', label: 'Community Day' },
]

export function useDiscoverSearch({
  routeSearch,
  availableTags,
  searchRoutePath = '/discover',
}: {
  routeSearch: DiscoverSearchState
  availableTags: QueryTag[]
  searchRoutePath?: string
}) {
  const navigate = useNavigate()
  const [activeFilterKey, setActiveFilterKey] = useState(
    routeSearch.filter ?? 'new',
  )
  const [searchTerm, setSearchTerm] = useState(routeSearch.q ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(routeSearch.q ?? '')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 350)

    return () => clearTimeout(handler)
  }, [searchTerm])

  useEffect(() => {
    const nextQ = routeSearch.q ?? ''
    const nextFilter = routeSearch.filter ?? 'new'

    setSearchTerm((current) => (current === nextQ ? current : nextQ))
    setDebouncedSearch((current) => (current === nextQ ? current : nextQ))
    setActiveFilterKey((current) =>
      current === nextFilter ? current : nextFilter,
    )
  }, [routeSearch.filter, routeSearch.q])

  useEffect(() => {
    void navigate({
      to: searchRoutePath,
      search: {
        q: debouncedSearch.trim().length > 0 ? debouncedSearch : undefined,
        filter: activeFilterKey,
      },
      replace: true,
      resetScroll: false,
    })
  }, [activeFilterKey, debouncedSearch, navigate, searchRoutePath])

  const { visibleFilters, dropdownFilters, allFilters } = useMemo(() => {
    const tagCounts = new Map(
      availableTags.map((tag) => [tag.name, tag.queryCount] as const),
    )
    const defaultTagSet = new Set(DEFAULT_TAG_FILTERS.map((tag) => tag.tag))

    const inlineTagFilters: DiscoverFilterOption[] = DEFAULT_TAG_FILTERS.map(
      (tag) => {
        const count = tagCounts.get(tag.tag)

        return {
          key: `tag:${tag.tag}`,
          label: count ? `${tag.label} (${count})` : tag.label,
          tag: tag.tag,
        }
      },
    )

    const extraTagFilters: DiscoverFilterOption[] = availableTags
      .filter((tag) => !defaultTagSet.has(tag.name))
      .map((tag) => ({
        key: `tag:${tag.name}`,
        label: `${formatTagLabel(tag.name)} (${tag.queryCount})`,
        tag: tag.name,
      }))

    const inlineFilters = [...BASE_FILTERS, ...inlineTagFilters]

    return {
      visibleFilters: inlineFilters,
      dropdownFilters: extraTagFilters,
      allFilters: [...inlineFilters, ...extraTagFilters],
    }
  }, [availableTags])

  useEffect(() => {
    const hasKnownFilter = allFilters.some(
      (option) => option.key === activeFilterKey,
    )
    const isCustomTagFilter = activeFilterKey.startsWith('tag:')

    if (!hasKnownFilter && !isCustomTagFilter) {
      setActiveFilterKey('new')
    }
  }, [allFilters, activeFilterKey])

  const activeFilter =
    allFilters.find((option) => option.key === activeFilterKey) ??
    (activeFilterKey.startsWith('tag:')
      ? {
          key: activeFilterKey,
          label: formatTagLabel(activeFilterKey.slice(4)),
          tag: activeFilterKey.slice(4),
        }
      : allFilters[0])

  const activeDropdownFilter =
    dropdownFilters.find((option) => option.key === activeFilterKey) ??
    (activeFilter.tag &&
    !visibleFilters.some((option) => option.key === activeFilter.key)
      ? activeFilter
      : undefined)

  return {
    activeFilterKey,
    activeFilter,
    activeDropdownFilter,
    activeDropdownLabel: activeDropdownFilter?.label,
    debouncedSearch,
    dropdownFilters,
    searchTerm,
    setActiveFilterKey,
    setSearchTerm,
    visibleFilters,
  }
}
