import * as React from 'react'
import { OTPInput } from 'input-otp'
import type { SlotProps } from 'input-otp'

import { cn } from '@/lib/utils'

type InputOTPProps = React.ComponentPropsWithoutRef<typeof OTPInput> & {
  children: React.ReactNode
  className?: string
}

type InputOTPSlotProps = React.HTMLAttributes<HTMLDivElement> & {
  index: number
}

const InputOTPContext = React.createContext<SlotProps[] | null>(null)

function InputOTP({
  className,
  children,
  containerClassName,
  ...props
}: InputOTPProps) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        'group flex items-center has-[:disabled]:opacity-30',
        containerClassName,
      )}
      render={({ slots }) => (
        <InputOTPContext.Provider value={slots}>
          <div
            className={cn(
              'flex items-center justify-center gap-0.5 sm:gap-2',
              className,
            )}
          >
            {children}
          </div>
        </InputOTPContext.Provider>
      )}
      {...props}
    />
  )
}

function InputOTPGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-0.5 sm:gap-1', className)}
      {...props}
    />
  )
}

function InputOTPSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      aria-hidden="true"
      className={cn('mx-1 h-px w-2 shrink-0 bg-border/80', className)}
      {...props}
    />
  )
}

function InputOTPSlot({ index, className, ...props }: InputOTPSlotProps) {
  const slots = React.useContext(InputOTPContext)
  const slot = slots?.[index]

  return (
    <div
      data-slot="input-otp-slot"
      aria-label={`OTP digit ${index + 1}`}
      className={cn(
        'relative flex h-10 w-9 items-center justify-center rounded-xl border border-border bg-background text-base font-semibold text-foreground shadow-sm transition-all sm:h-14 sm:w-11 sm:text-xl',
        'group-has-focus-visible:border-foreground group-has-focus-visible:ring-2 group-has-focus-visible:ring-foreground/20',
        slot?.isActive && 'border-foreground ring-2 ring-foreground/20',
        className,
      )}
      {...props}
    >
      <div className="tabular-nums">{slot?.char ?? ''}</div>
      {slot?.hasFakeCaret ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-px animate-pulse bg-foreground" />
        </div>
      ) : null}
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot }
