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

type ReportTargetDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetLabel: string
  isSubmitting: boolean
  onSubmit: (payload: { reason: string; details?: string }) => void
}

const reasonOptions = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate_or_abuse', label: 'Hate or abusive language' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'misleading', label: 'Misleading content' },
  { value: 'other', label: 'Other' },
] as const

export function ReportTargetDialog({
  open,
  onOpenChange,
  targetLabel,
  isSubmitting,
  onSubmit,
}: ReportTargetDialogProps) {
  const [reason, setReason] = useState<string>(reasonOptions[0].value)
  const [details, setDetails] = useState('')

  function resetForm() {
    setReason(reasonOptions[0].value)
    setDetails('')
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  function handleSubmit() {
    const trimmedDetails = details.trim()
    if (trimmedDetails.length > 0 && trimmedDetails.length < 3) {
      toast.error('Details must be at least 3 characters.')
      return
    }

    onSubmit({
      reason,
      details: trimmedDetails.length > 0 ? trimmedDetails : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report content</DialogTitle>
          <DialogDescription>
            This sends a report to moderators for: {targetLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label
            className="block text-sm font-medium text-foreground"
            htmlFor="report-reason"
          >
            Reason
          </label>
          <select
            id="report-reason"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          >
            {reasonOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label
            className="block text-sm font-medium text-foreground"
            htmlFor="report-details"
          >
            Details (optional)
          </label>
          <textarea
            id="report-details"
            className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
            maxLength={1000}
            placeholder="Share context to help moderators review."
            value={details}
            onChange={(event) => setDetails(event.target.value)}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
