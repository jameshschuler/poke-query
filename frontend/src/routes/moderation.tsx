import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { PageShell } from '#/components/page-shell'
import {
  ApiRequestError,
  getModerationAccess,
  getModerationReportDetail,
  getModerationReports,
  updateModerationReportStatus,
} from '#/lib/poke-query-api'
import type { ModerationReport, ReportStatus } from '#/lib/poke-query-api'
import { getMutationErrorMessage } from '#/lib/mutation-toast'
import { requireAuthenticated } from '#/lib/route-auth'

export const Route = createFileRoute('/moderation')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/moderation')
  },
  component: ModerationPage,
})

const statusOptions: ReportStatus[] = [
  'open',
  'in_review',
  'resolved',
  'dismissed',
]

function formatStatus(status: ReportStatus): string {
  switch (status) {
    case 'in_review':
      return 'In review'
    case 'resolved':
      return 'Resolved'
    case 'dismissed':
      return 'Dismissed'
    default:
      return 'Open'
  }
}

function ModerationPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('open')
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)

  const { data: moderationAccess, isLoading: isAccessLoading } = useQuery({
    queryKey: ['moderation', 'access'],
    queryFn: getModerationAccess,
    retry: false,
  })

  const {
    data: reportsPage,
    isLoading: isReportsLoading,
    error: reportsError,
  } = useQuery({
    queryKey: ['moderation', 'reports', statusFilter],
    queryFn: () =>
      getModerationReports({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
      }),
    enabled: Boolean(moderationAccess && moderationAccess.isReviewer),
  })

  const selectedReport = useMemo<ModerationReport | null>(() => {
    if (!reportsPage?.reports.length) {
      return null
    }

    if (!selectedReportId) {
      return reportsPage.reports[0] ?? null
    }

    return (
      reportsPage.reports.find((item) => item.id === selectedReportId) ?? null
    )
  }, [reportsPage?.reports, selectedReportId])

  const { data: reportDetail } = useQuery({
    queryKey: [
      'moderation',
      'report',
      selectedReport ? selectedReport.id : null,
    ],
    queryFn: () => getModerationReportDetail(selectedReport!.id),
    enabled: Boolean(
      moderationAccess &&
      moderationAccess.isReviewer &&
      selectedReport &&
      selectedReport.id,
    ),
  })

  const transitionMutation = useMutation({
    mutationFn: (nextStatus: ReportStatus) => {
      if (!selectedReport) {
        throw new Error('Select a report first.')
      }

      return updateModerationReportStatus(selectedReport.id, {
        status: nextStatus,
      })
    },
    onSuccess: async () => {
      toast.success('Report status updated.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['moderation', 'reports'] }),
        queryClient.invalidateQueries({ queryKey: ['moderation', 'report'] }),
      ])
    },
    onError: (mutationError: unknown) => {
      toast.error(
        getMutationErrorMessage(mutationError, 'Could not update report.'),
      )
    },
  })

  if (isAccessLoading) {
    return (
      <PageShell
        title="Moderation"
        subtitle="Review and resolve abuse reports."
        contentHeaderVariant="floating"
        showSidebar
        showHeaderSearch={false}
      >
        <p className="text-sm text-muted-foreground">
          Loading moderation access...
        </p>
      </PageShell>
    )
  }

  if (!moderationAccess?.isReviewer) {
    return (
      <PageShell
        title="Moderation"
        subtitle="Reviewer workspace"
        contentHeaderVariant="floating"
        showSidebar
        showHeaderSearch={false}
      >
        <p className="text-sm text-muted-foreground">
          Reviewer access is required to open this page.
        </p>
      </PageShell>
    )
  }

  if (reportsError instanceof ApiRequestError && reportsError.status === 403) {
    return (
      <PageShell
        title="Moderation"
        subtitle="Reviewer workspace"
        contentHeaderVariant="floating"
        showSidebar
        showHeaderSearch={false}
      >
        <p className="text-sm text-muted-foreground">
          Reviewer access is required to open this page.
        </p>
      </PageShell>
    )
  }

  return (
    <PageShell
      title="Moderation"
      subtitle="Review incoming abuse reports and move them through the queue."
      contentHeaderVariant="floating"
      showSidebar
      showHeaderSearch={false}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {(['all', ...statusOptions] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              className="rounded-lg"
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? 'All' : formatStatus(status)}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border/70 bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Queue</h3>
            {isReportsLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading reports...
              </p>
            ) : reportsPage?.reports.length ? (
              <div className="space-y-2">
                {reportsPage.reports.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                      selectedReport?.id === report.id
                        ? 'border-foreground/40 bg-muted'
                        : 'border-border hover:bg-muted/60'
                    }`}
                    onClick={() => setSelectedReportId(report.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {report.target.label}
                      </p>
                      <Badge variant="outline" size="sm">
                        {formatStatus(report.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {report.targetType === 'query' ? 'Query' : 'Trainer'} •{' '}
                      {report.reason}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No reports in this filter.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-border/70 bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Details</h3>
            {!selectedReport ? (
              <p className="text-sm text-muted-foreground">
                Select a report to review.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {selectedReport.target.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reporter:{' '}
                    {selectedReport.reporter?.displayName ?? 'Unknown trainer'}
                  </p>
                  <p className="text-sm">Reason: {selectedReport.reason}</p>
                  {selectedReport.details ? (
                    <p className="text-sm text-muted-foreground">
                      {selectedReport.details}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={
                        selectedReport.status === status ? 'default' : 'outline'
                      }
                      disabled={transitionMutation.isPending}
                      onClick={() => transitionMutation.mutate(status)}
                    >
                      {formatStatus(status)}
                    </Button>
                  ))}
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Audit log
                  </p>
                  {reportDetail?.actions.length ? (
                    <ul className="space-y-2">
                      {reportDetail.actions.map((action) => (
                        <li
                          key={action.id}
                          className="text-xs text-muted-foreground"
                        >
                          <span className="font-medium text-foreground">
                            {action.actor?.displayName ?? 'System'}
                          </span>{' '}
                          {action.action.replace('_', ' ')}
                          {action.toStatus
                            ? ` -> ${formatStatus(action.toStatus)}`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No audit events yet.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  )
}
