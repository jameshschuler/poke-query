# poke-query

poke-query is a monorepo for a Pokemon GO query-sharing app.

At a high level, the project lets trainers create, manage, and discover reusable in-game search queries. The backend currently provides authentication, query CRUD, fork and favorite flows, follower relationships, privacy-aware profile endpoints, tag-aware community discovery, and integration-tested database workflows.

## Workspace Layout

- `backend/`: Fastify + TypeScript API, database schema/migrations, and tests
- `docs-site/`: API docs site (Scalar)

## Current Status

- Backend is fully set up and tested
- API docs site powered by Scalar
- Community discovery supports search, tag filters, sort modes, and pagination

## Backend Highlights

- Auth via Supabase (OTP/session cookies)
- Query lifecycle: create, update, delete, fork, copy, favorite, unfavorite
- Guest favorites (cookie-backed) with max 10 without authentication
- Authenticated favorites endpoints for paginated favorites pages and favorite-id hydration
- Query tags support both user-supplied tags and parser-generated `autoTags`
- Query tags endpoint for frontend filter options: `GET /api/v1/queries/tags`
- Community route supports text search, tag filtering, sort options, and pagination
- Community and profile responses hide trainer team, level, and trainer code when a profile is private
- `/api/v1/users/me` includes `profileCompleted` and `deactivatedAt` for onboarding/account UX
- Account deletion policy preserves public strings (anonymized) and removes private strings
- Trainer profiles by username with split public lists for strings, forks, favorites, and followers
- Seed scripts for trainers, search queries, and followers
- Drizzle ORM + Postgres schema/migrations
- Unit/integration test suites with Vitest

## Quick Start

1. Move into backend:
   - `cd backend`
2. Install dependencies:
   - `npm install`
3. Configure environment:
   - copy `.env.example` to `.env`
   - update credentials
4. Run migrations:
   - `npm run db:migrate`
5. Start development server:
   - `npm run dev`

## Testing

From `backend/`:

- `npm test` for standard tests
- `npm run test:integration` for database-backed integration tests

## Seed Data

From `backend/`:

- `npm run db:seed:trainers` to create sample trainers
- `npm run db:seed:search` to create sample queries with tag coverage for community filters
- `npm run db:seed:followers` to create sample follow relationships
- `npm run db:seed` to run all seed steps in sequence

## Documentation

- Backend details: [backend/README.md](backend/README.md)
- One-page API docs site: [docs-site/README.md](docs-site/README.md)
- Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Testing strategy: [TESTING.md](TESTING.md)
- Release and deployment guide: [RELEASE.md](RELEASE.md)
- License: [LICENSE](LICENSE)

## Deploy On Render

This repository includes a Render Blueprint at [render.yaml](render.yaml) that provisions:

- Backend web service (`backend/`)
- Frontend static site (`frontend/`)
- Docs static site (`docs-site/`)

### Steps

1. Push this repo to GitHub.
2. In Render, create a new Blueprint and select this repository.
3. Render will detect [render.yaml](render.yaml) and create all three services.
4. Set the required environment variables in each service (below), then deploy.

### Required Environment Variables

Backend service:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ORIGIN` (set to your frontend URL; include multiple origins comma-separated if needed)

Frontend service:

- `VITE_API_BASE_URL` (your backend Render URL)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AUTH_REDIRECT_URL` (your frontend URL)

Notes:

- Backend migrations run automatically during deploy via the blueprint `preDeployCommand`.
- The docs site build regenerates OpenAPI from the backend before publishing.
