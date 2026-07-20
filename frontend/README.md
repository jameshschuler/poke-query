# poke-query — Frontend

The frontend app for poke-query, built with TanStack Start, React, and TypeScript.

Repository: https://github.com/jameshschuler/poke-query

It provides:

- Public landing page and login flow
- Discover feed with search, tags, sorting, and pagination
- Query detail pages with explicit view tracking
- Trainer profile pages with follow/report actions and profile view tracking
- Authenticated library/forks/favorites management
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

## Scripts

Run from `frontend/`:

- `npm run dev` — start local dev server
- `npm run build` — production build (client + SSR output)
- `npm run test` — run frontend tests
- `npm run lint` — run ESLint
- `npm run format` — run Prettier

## Notes

- Discover and card-level stats rely on backend aggregate fields.
- Query views are tracked with `POST /api/v1/queries/:id/views`.
- Trainer profile views are tracked with `POST /api/v1/users/:id/views`.
- Docs links in the app point to `/docs` unless `VITE_DOCS_URL` is set.
