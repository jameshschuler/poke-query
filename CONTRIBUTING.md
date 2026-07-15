# Contributing

Thanks for contributing to poke-query.

This repository is a monorepo with a backend API, frontend app, and docs site.

## Workspace Structure

- `backend/`: Fastify + TypeScript API, Drizzle schema/migrations, unit and integration tests
- `frontend/`: TanStack React app, shared UI, route-level and component tests
- `docs-site/`: Scalar API docs site generated from backend OpenAPI

## Prerequisites

- Node.js 20+
- npm
- Supabase/Postgres access for backend and integration tests

## Initial Setup

1. Install dependencies in each workspace:
   - `cd backend && npm install`
   - `cd ../frontend && npm install`
   - `cd ../docs-site && npm install`
2. Configure backend environment:
   - Create `backend/.env` with required variables.
   - Create `backend/.env.test` for integration test DB settings.
3. Apply database migrations:
   - `cd backend && npm run db:migrate`
4. Optional seed data for local QA:
   - `npm run db:seed`

## Local Development

Run each workspace in its own terminal.

- Backend API:
  - `cd backend && npm run dev`
- Frontend app:
  - `cd frontend && npm run dev`
- Docs site:
  - `cd docs-site && npm run docs:generate`
  - `npm start`

## Testing And Quality Checks

See [TESTING.md](TESTING.md) for the full testing strategy and guidance.

Minimum checks before opening a PR:

- Backend:
  - `cd backend && npm run lint`
  - `npm run build`
  - `npm test`
  - `npm run test:integration` for DB/auth/data-flow changes
- Frontend:
  - `cd frontend && npm run lint`
  - `npm run build`
  - `npm test`
- Docs changes:
  - `cd docs-site && npm run docs:generate`
  - `npm start` and verify spec loads

## Branching Expectations

- Branch from `main`.
- Use focused branches per change area.
- Suggested naming:
  - `feat/<scope>-<short-description>`
  - `fix/<scope>-<short-description>`
  - `docs/<scope>-<short-description>`
  - `test/<scope>-<short-description>`
- Keep unrelated refactors out of feature/fix branches.

## Pull Request Expectations

Each PR should include:

- Clear summary of what changed and why
- Testing evidence (commands run and outcomes)
- Screenshots or short recordings for UI changes
- Notes about migrations, env changes, or rollout impact when relevant

PRs should stay reviewable. Prefer multiple small PRs over one broad PR.

## Code Review Expectations

When requesting review:

- Call out risky areas and known tradeoffs
- Highlight anything that needs special QA
- Link related issues or TODO items

When reviewing:

- Prioritize correctness, security, privacy, and regressions
- Verify tests cover changed behavior
- Ask for concrete follow-ups when scope is too large

## Security And Privacy Basics

- Do not commit secrets, private keys, or real credentials.
- Preserve privacy controls and ownership checks.
- Keep logs structured and avoid logging sensitive payloads.

## Reporting Issues

Include:

- Expected behavior
- Actual behavior
- Repro steps
- Relevant logs/errors
- Environment details (OS, Node version, workspace affected)
