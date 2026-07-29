import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('feature flags', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('keeps all-time trusted hidden by default', async () => {
    vi.stubEnv('VITE_ENABLE_ALL_TIME_TRUSTED', '')

    const { isAllTimeTrustedEnabled } = await import('#/lib/feature-flags')

    expect(isAllTimeTrustedEnabled).toBe(false)
  })

  it('enables all-time trusted when explicitly enabled', async () => {
    vi.stubEnv('VITE_ENABLE_ALL_TIME_TRUSTED', 'true')

    const { isAllTimeTrustedEnabled } = await import('#/lib/feature-flags')

    expect(isAllTimeTrustedEnabled).toBe(true)
  })
})
