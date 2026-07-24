import { useMutation } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { generateAssistantSearchString } from '#/lib/poke-query-api'
import { getMutationErrorMessage } from '#/lib/mutation-toast'

export type AssistantFormFields = {
  title: string
  query: string
  description: string
  tags: string[]
}

type NewStringAssistantDialogProps = {
  open: boolean
  onOpenChange: (nextOpen: boolean) => void
  onApply: (fields: AssistantFormFields) => void
}

export function NewStringAssistantDialog({
  open,
  onOpenChange,
  onApply,
}: NewStringAssistantDialogProps) {
  const [assistantPrompt, setAssistantPrompt] = useState('')
  const [assistantError, setAssistantError] = useState<string | null>(null)

  const assistantMutation = useMutation({
    mutationFn: generateAssistantSearchString,
    onSuccess: (result) => {
      setAssistantError(null)
      onApply({
        title: result.title,
        query: result.query,
        description: result.description ?? '',
        tags: result.tags,
      })
      setAssistantPrompt('')
      onOpenChange(false)
      toast.success('Assistant output applied to form.')
    },
    onError: (error: unknown) => {
      setAssistantError(
        getMutationErrorMessage(
          error,
          'Could not generate a string right now.',
        ),
      )
    },
  })

  const canGenerateAssistant = assistantPrompt.trim().length >= 3

  function resetAssistantSession() {
    setAssistantPrompt('')
    setAssistantError(null)
  }

  function handleAssistantGenerate() {
    const prompt = assistantPrompt.trim()
    if (prompt.length < 3 || assistantMutation.isPending) {
      if (prompt.length < 3) {
        setAssistantError('Prompt must be at least 3 characters.')
      }
      return
    }

    assistantMutation.mutate({
      prompt,
      mode: 'auto',
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          resetAssistantSession()
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate with AI Assistant</DialogTitle>
          <DialogDescription>
            Describe what you want and generate directly into your form.
          </DialogDescription>
        </DialogHeader>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Prompt</span>
          <textarea
            value={assistantPrompt}
            onChange={(event) => {
              setAssistantPrompt(event.target.value)
              if (assistantError) {
                setAssistantError(null)
              }
            }}
            placeholder="Best counters for shadow groudon?"
            className="min-h-28 w-full resize-y rounded-2xl border border-border/60 bg-background px-3 py-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            aria-label="Assistant prompt"
          />
        </label>

        {assistantError ? (
          <p className="text-xs text-destructive">{assistantError}</p>
        ) : null}

        {assistantMutation.isPending ? (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Generating output...
          </div>
        ) : null}

        <DialogFooter className="items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Nothing is saved automatically. You can edit fields after
            generation.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={!canGenerateAssistant || assistantMutation.isPending}
              onClick={handleAssistantGenerate}
            >
              {assistantMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Generate
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
