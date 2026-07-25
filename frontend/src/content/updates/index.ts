import { parseAppUpdates } from '#/lib/app-updates'

import anonAuthUpdate from './2026-07-24-anon-auth.md?raw'
import assistantLaunchUpdate from './2026-07-19-ai-assistant.md?raw'
import discoverRefreshUpdate from './2026-07-14-discover-carousel.md?raw'

export const appUpdates = parseAppUpdates([
  {
    slug: 'anon-auth',
    markdown: anonAuthUpdate,
  },
  {
    slug: 'ai-assistant',
    markdown: assistantLaunchUpdate,
  },
  {
    slug: 'discover-carousel',
    markdown: discoverRefreshUpdate,
  },
])
