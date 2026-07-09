import { useEffect, useState } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'

import { Button } from '#/components/ui/button'

type Theme = 'light' | 'dark'
type ThemeTogglePlacement = 'floating' | 'inline'

const THEME_STORAGE_KEY = 'poke-query-theme'

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function getPreferredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

type ThemeToggleProps = {
  placement?: ThemeTogglePlacement
}

export function ThemeToggle({ placement = 'floating' }: ThemeToggleProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const initialTheme = getPreferredTheme()
    setTheme(initialTheme)
    applyTheme(initialTheme)
    setIsMounted(true)
  }, [])

  function handleToggle() {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    applyTheme(nextTheme)
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
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
