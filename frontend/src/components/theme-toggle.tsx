import { useEffect, useState } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { getPreferredThemeMode, setThemeMode } from '#/lib/theme-preferences'
import type { ThemeMode } from '#/lib/theme-preferences'

type ThemeTogglePlacement = 'floating' | 'inline'

type ThemeToggleProps = {
  placement?: ThemeTogglePlacement
}

export function ThemeToggle({ placement = 'floating' }: ThemeToggleProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>('light')

  useEffect(() => {
    const initialTheme = getPreferredThemeMode()
    setTheme(initialTheme)
    setIsMounted(true)
  }, [])

  function handleToggle() {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    setThemeMode(nextTheme)
  }

  if (!isMounted) {
    return null
  }

  const isDark = theme === 'dark'
  const isFloating = placement === 'floating'

  return (
    <Button
      variant="outline"
      size="icon"
      className={[
        isFloating
          ? 'fixed z-100 rounded-full shadow-md'
          : 'shrink-0 rounded-full',
        isDark ? 'border-border bg-card text-foreground hover:bg-muted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        isFloating
          ? {
              right: 'max(1rem, env(safe-area-inset-right))',
              bottom: 'max(1rem, env(safe-area-inset-bottom))',
            }
          : undefined
      }
      onClick={handleToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
