import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'

type TimestampTooltipProps = {
  iso: string
  children: string
}

function TimestampTooltip({ iso, children }: TimestampTooltipProps) {
  const exactDateTime = new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex cursor-default items-center">
            {children}
          </span>
        }
      />
      <TooltipContent>{exactDateTime}</TooltipContent>
    </Tooltip>
  )
}

export { TimestampTooltip }
