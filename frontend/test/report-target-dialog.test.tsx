import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReportTargetDialog } from '#/components/report-target-dialog'

describe('ReportTargetDialog', () => {
  it('submits selected reason and optional details', () => {
    const onSubmit = vi.fn()

    render(
      <ReportTargetDialog
        open
        onOpenChange={vi.fn()}
        targetLabel="Query: Raid Finder"
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'misleading' },
    })
    fireEvent.change(screen.getByLabelText('Details (optional)'), {
      target: { value: 'This query claims impossible filters.' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }))

    expect(onSubmit).toHaveBeenCalledWith({
      reason: 'misleading',
      details: 'This query claims impossible filters.',
    })
  })
})
