import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig(({ mode }) => {
  const isTest = mode === 'test' || process.env.VITEST === 'true'

  return {
    resolve: {
      tsconfigPaths: true,
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '#': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      environment: 'jsdom',
    },
    plugins: isTest
      ? [viteReact()]
      : [
          nitro({ rollupConfig: { external: [/^@sentry\//] } }),
          tailwindcss(),
          tanstackStart(),
          viteReact(),
        ],
  }
})

export default config
