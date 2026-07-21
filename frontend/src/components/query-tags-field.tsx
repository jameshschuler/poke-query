import { XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '#/components/ui/button'

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

  const normalizedTags = useMemo(
    () =>
      Array.from(new Set(tags.map((tag) => normalizeTag(tag)).filter(Boolean))),
    [tags],
  )

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
    <div className="space-y-2">
      <span className="text-sm font-medium">Tags</span>

      <div className="flex gap-2">
        <input
          value={draftTag}
          onChange={(event) => setDraftTag(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              addTag(draftTag)
            }

            if (event.key === 'Tab' && draftTag.trim()) {
              event.preventDefault()
              addTag(draftTag)
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

      <p className="text-xs text-muted-foreground">{helperText}</p>

      {normalizedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {normalizedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/80 px-2.5 py-1 text-xs"
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
