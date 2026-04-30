# poke-query

poke-query is a monorepo for a Pokemon GO query-sharing app.

At a high level, the project lets trainers create, manage, and discover reusable in-game search queries. The backend currently provides authentication, query CRUD, public community discovery, profile endpoints, and integration-tested database workflows.

## Workspace Layout

- `backend/`: Fastify + TypeScript API, database schema/migrations, and tests
- `frontend/`: frontend app workspace (reserved for UI work)

## Current Status

- Backend is fully set up and tested
- Frontend workspace exists and is ready for scaffolding

## Backend Highlights

- Auth via Supabase (OTP/session cookies)
- Query lifecycle: create, update, delete, fork, copy
- Community route with filtering/sorting and creator profile info
- Trainer profiles with per-user stats
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

## Documentation

- Backend details: [backend/README.md](backend/README.md)
- Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- License: [LICENSE](LICENSE)
