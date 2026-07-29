# poke-query — Frontend

The frontend app for poke-query, built with TanStack Start, React, and TypeScript.

Repository: https://github.com/jameshschuler/poke-query

It provides:

- Public landing page and login flow
- Discover feed with search, tags, sorting, and pagination
- Query detail pages with explicit view tracking
- Trainer profile pages with follow/report actions and profile view tracking
- Authenticated library/forks/favorites management, including template-based string creation
- Account, notifications, and moderation screens
- Legal pages (privacy, terms, about)

## Tech Stack

- [TanStack Start](https://tanstack.com/start)
- [TanStack Router](https://tanstack.com/router)
- [TanStack Query](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vitest](https://vitest.dev/)

## Getting Started

Run from `frontend/`:

```bash
npm install
npm run dev
```

The app runs with Vite/TanStack Start and defaults to local backend APIs.

## Environment Variables

Common variables:

- `VITE_API_BASE_URL` (default: `http://localhost:4000`)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_AUTH_REDIRECT_URL`
- `VITE_DOCS_URL` (optional override for docs link)

Feature flags (set to `'true'` to enable):

- `VITE_ENABLE_AI_ASSISTANT` — enables the AI assistant UI (hidden by default)
- `VITE_ENABLE_ALL_TIME_TRUSTED` — enables the All-Time Trusted discover rail (hidden by default)

## Scripts

Run from `frontend/`:

- `npm run dev` — start local dev server
- `npm run build` — production build (client + SSR output)
- `npm run test` — run unit/component tests with Vitest
- `npm run test:e2e` — run Playwright end-to-end tests
- `npm run lint` — run ESLint
- `npm run check` — check formatting with Prettier
- `npm run format` — auto-format with Prettier + ESLint fix

## Notes

- Discover and card-level stats rely on backend aggregate fields.
- Query views are tracked with `POST /api/v1/queries/:id/views`.
- Trainer profile views are tracked with `POST /api/v1/users/:id/views`.
- The new string page includes a template import mode, supports partial template prefill, and provides a clipboard copy action for the starter template.
- Docs links in the app point to `/docs` unless `VITE_DOCS_URL` is set.
- Feature flags are exported from `src/lib/feature-flags.ts` and read from Vite env vars at build time.

## API Client

All requests go through `src/lib/poke-query-api.ts`. Key behaviors:

- Errors throw `ApiRequestError`, which exposes `status`, `message`, and `errorCode` — a stable snake_case code (e.g. `unauthorized`, `not_found`) for client-side branching without parsing human text.
- Successful mutation responses include `meta.requestId` for correlating UI errors with server logs.
- Both fields mirror the backend contract and are inferred client-side when the server does not provide them.
