import { XIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '#/components/ui/button'
import { getQueryTags } from '#/lib/poke-query-api'

type QueryTagsFieldProps = {
  tags: string[]
  onChange: (nextTags: string[]) => void
  helperText?: string
}

const MAX_TAG_LENGTH = 32

function normalizeTag(rawValue: string): string {
  return rawValue.trim().toLowerCase().slice(0, MAX_TAG_LENGTH)
}

export function QueryTagsField({
  tags,
  onChange,
  helperText = 'Press Enter or comma to add tags. Tags are lowercased automatically.',
}: QueryTagsFieldProps) {
  const [draftTag, setDraftTag] = useState('')
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const { data: availableTags = [] } = useQuery({
    queryKey: ['query-tags'],
    queryFn: getQueryTags,
    staleTime: 5 * 60_000,
  })

  const normalizedTags = useMemo(
    () =>
      Array.from(new Set(tags.map((tag) => normalizeTag(tag)).filter(Boolean))),
    [tags],
  )

  const suggestions = useMemo(() => {
    const drafted = normalizeTag(draftTag)
    if (!drafted) {
      return []
    }

    const usedTags = new Set(normalizedTags)
    return availableTags
      .map((tag) => normalizeTag(tag.name))
      .filter((tag) => tag.startsWith(drafted) && !usedTags.has(tag))
      .slice(0, 8)
  }, [availableTags, draftTag, normalizedTags])

  useEffect(() => {
    if (suggestions.length === 0) {
      setActiveSuggestionIndex(-1)
      return
    }

    setActiveSuggestionIndex((current) =>
      current >= 0 && current < suggestions.length ? current : 0,
    )
  }, [suggestions])

  function addTag(rawValue: string) {
    const normalized = normalizeTag(rawValue)
    if (!normalized) {
      return
    }

    if (normalizedTags.includes(normalized)) {
      setDraftTag('')
      return
    }

    onChange([...normalizedTags, normalized])
    setDraftTag('')
  }

  function removeTag(tagToRemove: string) {
    onChange(normalizedTags.filter((tag) => tag !== tagToRemove))
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Tags</span>

      <div className="flex gap-2">
        <input
          value={draftTag}
          onChange={(event) => {
            setDraftTag(event.target.value)
            setActiveSuggestionIndex(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && suggestions.length > 0) {
              event.preventDefault()
              setActiveSuggestionIndex((current) =>
                current >= suggestions.length - 1 ? 0 : current + 1,
              )
              return
            }

            if (event.key === 'ArrowUp' && suggestions.length > 0) {
              event.preventDefault()
              setActiveSuggestionIndex((current) =>
                current <= 0 ? suggestions.length - 1 : current - 1,
              )
              return
            }

            if (event.key === 'Escape' && suggestions.length > 0) {
              setActiveSuggestionIndex(-1)
              return
            }

            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              const activeSuggestion =
                activeSuggestionIndex >= 0
                  ? suggestions[activeSuggestionIndex]
                  : undefined
              addTag(activeSuggestion ?? draftTag)
            }

            if (event.key === 'Tab' && draftTag.trim()) {
              event.preventDefault()
              const activeSuggestion =
                activeSuggestionIndex >= 0
                  ? suggestions[activeSuggestionIndex]
                  : undefined
              addTag(activeSuggestion ?? draftTag)
            }
          }}
          placeholder="great-league"
          className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          maxLength={MAX_TAG_LENGTH}
          autoComplete="off"
        />
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => addTag(draftTag)}
        >
          Add
        </Button>
      </div>

      {suggestions.length > 0 ? (
        <div
          className="flex flex-wrap gap-2"
          role="listbox"
          aria-label="Tag suggestions"
        >
          {suggestions.map((tag, index) => (
            <button
              key={tag}
              type="button"
              role="option"
              aria-selected={index === activeSuggestionIndex}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                index === activeSuggestionIndex
                  ? 'border-slate-400/60 bg-slate-200 text-slate-800 dark:bg-slate-700 dark:border-slate-500 dark:text-slate-100'
                  : 'border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800/60 dark:border-slate-600/50 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
              onMouseEnter={() => setActiveSuggestionIndex(index)}
              onClick={() => addTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{helperText}</p>

      {normalizedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {normalizedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-700 dark:bg-slate-800/60 dark:border-slate-600/50 dark:text-slate-200"
            >
              {tag}
              <button
                type="button"
                className="rounded-full p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
