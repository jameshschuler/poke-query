import { useQuery } from '@tanstack/react-query'
import { Loader2Icon, SparklesIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { getCommunitySurfacingMetrics } from '#/lib/poke-query-api'
import { formatCompactNumber } from '#/lib/utils'

type DashboardDiscoverMetricsCardProps = {
  isAdmin: boolean
}

function formatPercent(value: number, digits: number) {
  return `${(value * 100).toFixed(digits)}%`
}

function formatPercentPointDelta(value: number, digits = 1) {
  const scaled = value * 100
  const sign = scaled > 0 ? '+' : ''
  return `${sign}${scaled.toFixed(digits)} pp`
}

export function DashboardDiscoverMetricsCard({
  isAdmin,
}: DashboardDiscoverMetricsCardProps) {
  const {
    data: discoverMetrics,
    isLoading: isDiscoverMetricsLoading,
    error: discoverMetricsError,
  } = useQuery({
    queryKey: ['dashboard', 'discover-metrics', 14],
    queryFn: () => getCommunitySurfacingMetrics(14),
    enabled: isAdmin,
    staleTime: 60_000,
  })

  const {
    data: discoverMetrics7d,
    isLoading: isDiscoverMetrics7dLoading,
    error: discoverMetrics7dError,
  } = useQuery({
    queryKey: ['dashboard', 'discover-metrics', 7],
    queryFn: () => getCommunitySurfacingMetrics(7),
    enabled: isAdmin,
    staleTime: 60_000,
  })

  if (!isAdmin) {
    return null
  }

  const isDiscoverTrendsLoading =
    isDiscoverMetricsLoading || isDiscoverMetrics7dLoading
  const hasDiscoverTrendsError =
    Boolean(discoverMetricsError) || Boolean(discoverMetrics7dError)

  const discoverCtrDelta =
    (discoverMetrics7d?.discoverToDetailCtr ?? 0) -
    (discoverMetrics?.discoverToDetailCtr ?? 0)
  const copyConversionDelta =
    (discoverMetrics7d?.copyConversion ?? 0) -
    (discoverMetrics?.copyConversion ?? 0)
  const uniqueImpressionDelta =
    (discoverMetrics7d?.impressionDistributionUniqueStrings ?? 0) -
    (discoverMetrics?.impressionDistributionUniqueStrings ?? 0)

  const discoverCtrPercent = formatPercent(
    discoverMetrics?.discoverToDetailCtr ?? 0,
    1,
  )
  const copyConversionPercent = formatPercent(
    discoverMetrics?.copyConversion ?? 0,
    1,
  )
  const uniqueImpressionSharePercent = formatPercent(
    discoverMetrics?.impressionDistributionUniqueStrings ?? 0,
    2,
  )

  return (
    <section className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="outline" size="lg">
            <SparklesIcon />
            Discover quality
          </Badge>
          <h2 className="mt-3 text-lg font-semibold tracking-tight">
            Discover surfacing performance
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Last {discoverMetrics?.windowDays ?? 14} days of CTR, copy
            conversion, and impression spread across unique strings.
          </p>
        </div>
      </div>

      {isDiscoverTrendsLoading ? (
        <div className="mt-5 rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
          <Loader2Icon className="mr-2 inline-block size-4 animate-spin" />
          Loading discover metrics...
        </div>
      ) : hasDiscoverTrendsError ? (
        <div className="mt-5 rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
          Discover metrics are unavailable right now.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-background/60 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Discover to detail CTR
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                {discoverCtrPercent}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Copy conversion
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                {copyConversionPercent}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Unique impression share
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                {uniqueImpressionSharePercent}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                7d vs 14d CTR
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${discoverCtrDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
              >
                {formatPercentPointDelta(discoverCtrDelta, 1)}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                7d vs 14d copy
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${copyConversionDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
              >
                {formatPercentPointDelta(copyConversionDelta, 1)}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                7d vs 14d spread
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${uniqueImpressionDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
              >
                {formatPercentPointDelta(uniqueImpressionDelta, 2)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
              Impressions:{' '}
              <span className="font-semibold text-foreground">
                {formatCompactNumber(discoverMetrics?.totals.impressions ?? 0)}
              </span>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
              Detail clicks:{' '}
              <span className="font-semibold text-foreground">
                {formatCompactNumber(discoverMetrics?.totals.detailClicks ?? 0)}
              </span>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
              Copy actions:{' '}
              <span className="font-semibold text-foreground">
                {formatCompactNumber(discoverMetrics?.totals.copyActions ?? 0)}
              </span>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
              Unique strings shown:{' '}
              <span className="font-semibold text-foreground">
                {formatCompactNumber(
                  discoverMetrics?.totals.uniqueImpressionStrings ?? 0,
                )}
              </span>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
