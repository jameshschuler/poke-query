# Testing Strategy

This document defines how poke-query tests should be written, organized, and run.

## Goals

- Catch regressions before release.
- Keep tests fast enough for daily development.
- Cover privacy, authorization, and data-integrity paths.
- Make failures easy to diagnose.

## Test Pyramid For This Repo

- Unit tests (most tests):
  - Fast, isolated logic checks.
  - Parser utilities, service helpers, validation logic.
- Integration tests (targeted):
  - Backend routes with database + auth context.
  - Ownership checks, privacy gating, and query behavior.
- UI flow tests (incremental):
  - Frontend route/component behavior around mutations, filters, and state transitions.

## What To Test When You Change Code

- Backend route/schema changes:
  - Add or update route-level tests.
  - Add integration coverage for auth and persistence behavior.
- Privacy or authorization changes:
  - Add explicit allow/deny tests.
  - Validate fallback responses for unauthorized access.
- Frontend mutation or form changes:
  - Add component/route tests for success + error flows.
  - Verify loading, empty, and failure states.
- Data model/migration changes:
  - Add integration tests that cover new shape/constraints.

## Commands

### Backend

Run from `backend/`:

- `npm test` for unit and route-level tests
- `npm run test:integration` for DB-backed integration coverage
- `npm run lint`
- `npm run build`

### Frontend

Run from `frontend/`:

- `npm test`
- `npm run lint`
- `npm run build`

### Docs Site

Run from `docs-site/`:

- `npm run docs:generate`
- `npm start` and verify docs render with the latest OpenAPI data

## Suggested Pre-PR Checklist

1. Run backend lint/build/tests for backend-touching changes.
2. Run frontend lint/build/tests for frontend-touching changes.
3. Run docs generation when API schema/docs changed.
4. Verify no unintended file changes are included.

## CI Direction

If CI is expanded, use this order for fast feedback:

1. Lint (backend + frontend)
2. Build (backend + frontend)
3. Backend unit tests
4. Frontend tests
5. Backend integration tests

## Test Data Guidance

- Prefer deterministic fixtures and seed values.
- Avoid coupling tests to mutable production-like data.
- Keep test setup local to each test file when possible.
- Use shared helpers only when they reduce duplication without hiding intent.
- For bulk fixture creation in integration tests, prefer direct DB inserts over high-volume API calls to avoid triggering route rate limits.
- Use API-level setup only when the endpoint behavior itself is what the test is validating.

## Reliability Rules

- No network calls to third-party services in unit tests.
- Avoid time-dependent assertions unless time is mocked or bounded.
- Keep assertions specific to behavior, not implementation details.
- Add regression tests for every bug fix that can reasonably recur.

## Ownership And Privacy Coverage

Given project priorities, tests should explicitly cover:

- Owner-only query edit/delete behavior.
- Private profile and private query visibility boundaries.
- Follow/favorite flows with correct auth and permission checks.
- Notification flows for expected actors and targets.

## Where To Add New Tests

- Backend unit/integration tests:
  - `backend/test/`
  - `backend/test/integration/`
- Frontend tests:
  - `frontend/test/`

Name tests by user behavior, not internal implementation.
