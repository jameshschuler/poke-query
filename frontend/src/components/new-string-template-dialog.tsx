import { useState } from 'react'
import { toast } from 'sonner'

import { MAX_QUERY_TAGS } from '#/components/query-tags-field'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

export type TemplateFormFields = {
  title?: string
  query?: string
  description?: string
  referenceUrl?: string
  tags?: string[]
  visibility?: 'public' | 'private'
}

type TemplateImport = {
  title?: unknown
  query?: unknown
  description?: unknown
  referenceUrl?: unknown
  tags?: unknown
  visibility?: unknown
  isPublic?: unknown
}

type NewStringTemplateDialogProps = {
  open: boolean
  onOpenChange: (nextOpen: boolean) => void
  onApply: (fields: TemplateFormFields) => void
}

const JSON_SKELETON = {
  title: 'Max IV Attackers',
  query: '4*&!traded&cp2500-',
  description: 'What this string is for...',
  referenceUrl: 'https://example.com/source',
  tags: ['raid', 'master-league'],
  visibility: 'public',
} as const

export function NewStringTemplateDialog({
  open,
  onOpenChange,
  onApply,
}: NewStringTemplateDialogProps) {
  const [jsonDraft, setJsonDraft] = useState('')
  const [jsonImportError, setJsonImportError] = useState<string | null>(null)

  function resetSession() {
    setJsonImportError(null)
  }

  async function copyJsonSkeleton() {
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
      const parsed: unknown = JSON.parse(jsonDraft)

      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        setJsonImportError('Template must be an object.')
        return
      }

      const template = parsed as TemplateImport
      const nextFields: TemplateFormFields = {}

      if (typeof template.title === 'string') {
        nextFields.title = template.title.trim()
      }

      if (typeof template.query === 'string') {
        nextFields.query = template.query.trim()
      }

      if (typeof template.description === 'string') {
        nextFields.description = template.description
      }

      if (typeof template.referenceUrl === 'string') {
        nextFields.referenceUrl = template.referenceUrl
      }

      if (Array.isArray(template.tags)) {
        nextFields.tags = template.tags
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, MAX_QUERY_TAGS)
      }

      if (template.visibility === 'private') {
        nextFields.visibility = 'private'
      } else if (template.visibility === 'public') {
        nextFields.visibility = 'public'
      } else if (template.isPublic === false) {
        nextFields.visibility = 'private'
      } else if (template.isPublic === true) {
        nextFields.visibility = 'public'
      }

      onApply(nextFields)
      setJsonImportError(null)
      onOpenChange(false)
      toast.success('Template imported into the form.')
    } catch {
      setJsonImportError('Invalid template. Check formatting and try again.')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          resetSession()
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Template</DialogTitle>
          <DialogDescription>
            Paste a template object and apply it to pre-fill the form.
          </DialogDescription>
        </DialogHeader>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Search string template</span>
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
        ) : null}

        <DialogFooter className="items-center sm:justify-between">
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
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={applyJsonImport}
            >
              Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
