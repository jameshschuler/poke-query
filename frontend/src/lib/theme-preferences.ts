export type ThemeMode = 'light' | 'dark'
export type ThemePreset =
  'default' | 'ocean' | 'sunset' | 'forest' | 'citrus' | 'slate'

export const THEME_MODE_STORAGE_KEY = 'poke-query-theme'
export const THEME_PRESET_STORAGE_KEY = 'poke-query-theme-preset'

export const THEME_PRESET_OPTIONS: Array<{
  value: ThemePreset
  label: string
}> = [
  { value: 'default', label: 'Default' },
  { value: 'slate', label: 'Slate' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'forest', label: 'Forest' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'citrus', label: 'Citrus' },
]

function isThemePreset(value: string | null): value is ThemePreset {
  return (
    value === 'default' ||
    value === 'ocean' ||
    value === 'sunset' ||
    value === 'forest' ||
    value === 'citrus' ||
    value === 'slate'
  )
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

export function applyThemeMode(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

export function applyThemePreset(preset: ThemePreset) {
  if (preset === 'default') {
    document.documentElement.removeAttribute('data-theme')
    return
  }

  document.documentElement.setAttribute('data-theme', preset)
}

export function getPreferredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const savedTheme = window.localStorage.getItem(THEME_MODE_STORAGE_KEY)
  if (isThemeMode(savedTheme)) {
    return savedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function getThemePreset(): ThemePreset {
  if (typeof window === 'undefined') {
    return 'default'
  }

  const savedPreset = window.localStorage.getItem(THEME_PRESET_STORAGE_KEY)
  return isThemePreset(savedPreset) ? savedPreset : 'default'
}

export function setThemeMode(mode: ThemeMode) {
  applyThemeMode(mode)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode)
  }
}

export function setThemePreset(preset: ThemePreset) {
  applyThemePreset(preset)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_PRESET_STORAGE_KEY, preset)
  }
}

export function initializeThemePreferences() {
  const mode = getPreferredThemeMode()
  const preset = getThemePreset()
  applyThemeMode(mode)
  applyThemePreset(preset)
  return { mode, preset }
}
