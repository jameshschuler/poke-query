# Contributing

Thanks for contributing to poke-query.

## Project Structure

- `backend/`: Fastify + TypeScript API, tests, migrations
- `frontend/`: Frontend workspace

## Prerequisites

- Node.js 20+
- npm
- A Postgres/Supabase environment for backend work

## Setup

1. Install backend dependencies:
   - `cd backend`
   - `npm install`
2. Configure environment:
   - Copy `.env.example` to `.env` and fill required values.
   - For integration tests, also configure `.env.test`.
3. Run migrations:
   - `npm run db:migrate`

## Development Commands (backend)

- `npm run dev`: start API in watch mode
- `npm run build`: typecheck/compile
- `npm run lint`: lint source and tests
- `npm test`: unit-style test suite
- `npm run test:integration`: DB-backed integration tests

## Pull Request Guidelines

1. Create a focused branch per change.
2. Keep PRs small and scoped.
3. Include tests for behavior changes.
4. Ensure these pass before opening PR:
   - `npm run lint`
   - `npm run build`
   - `npm test`
   - `npm run test:integration` (when relevant)
5. Describe:
   - what changed
   - why it changed
   - how you tested it

## Code Style

- Follow existing TypeScript + Fastify patterns.
- Keep route schemas and handlers in sync.
- Prefer clear names and small functions.
- Do not commit secrets or real credentials.

## Reporting Issues

When filing an issue, include:

- Expected behavior
- Actual behavior
- Repro steps
- Relevant logs/errors
- Environment details (OS, Node version)
