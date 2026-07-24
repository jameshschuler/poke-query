import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const routePath = (fileName: string) =>
  resolve(process.cwd(), 'src', 'routes', fileName)

function readRoute(fileName: string) {
  return readFileSync(routePath(fileName), 'utf8')
}

describe('Route protection configuration', () => {
  it.each([
    ['account.tsx', '/account'],
    ['admin.discover-performance.tsx', '/admin/discover-performance'],
    ['admin.weekly-picks.tsx', '/admin/weekly-picks'],
    ['dashboard.tsx', '/dashboard'],
    ['favorites.tsx', '/favorites'],
    ['following.tsx', '/following'],
    ['forks.$queryId.edit.tsx', '/forks'],
    ['forks.$queryId.tsx', '/forks'],
    ['forks.tsx', '/forks'],
    ['library.$queryId.edit.tsx', '/library'],
    ['library.new.tsx', '/library/new'],
    ['library.tsx', '/library'],
    ['moderation.tsx', '/moderation'],
    ['notifications.tsx', '/notifications'],
  ])('%s requires authenticated access', (fileName, expectedPath) => {
    const source = readRoute(fileName)

    expect(source).toContain('beforeLoad: async () => {')
    expect(source).toContain(`await requireAuthenticated('${expectedPath}')`)
  })

  it.each(['index.tsx', 'login.tsx'])(
    '%s requires guest access',
    (fileName) => {
      const source = readRoute(fileName)

      expect(source).toContain('beforeLoad: async () => {')
      expect(source).toContain('await requireGuest()')
    },
  )

  it('discover remains public', () => {
    const source = readRoute('discover.tsx')

    expect(source).not.toContain('requireAuthenticated(')
    expect(source).not.toContain('requireGuest()')
  })
})
