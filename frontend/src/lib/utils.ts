import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTagLabel(tag: string) {
  return tag
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function formatCompactNumber(value: number) {
  const absolute = Math.abs(value)

  if (absolute < 1_000) {
    return value.toLocaleString()
  }

  const units: Array<{ threshold: number; suffix: string }> = [
    { threshold: 1_000_000_000_000, suffix: 't' },
    { threshold: 1_000_000_000, suffix: 'b' },
    { threshold: 1_000_000, suffix: 'm' },
    { threshold: 1_000, suffix: 'k' },
  ]

  const unit = units.find((item) => absolute >= item.threshold)
  if (!unit) {
    return value.toLocaleString()
  }

  const compact = absolute / unit.threshold
  const rounded = Math.round(compact * 10) / 10
  const formatted = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1)

  const signedValue = value < 0 ? `-${formatted}` : formatted
  return `${signedValue}${unit.suffix}`
}

export function formatFullNumber(value: number) {
  return value.toLocaleString()
}
