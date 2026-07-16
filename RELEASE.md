# Release And Deployment Guide

This document is the week-of-launch checklist for deploying and sharing poke-query.

## Deployment Targets

- Backend API: Render web service from `backend/`
- Frontend app: Render web service (Node) from `frontend/`
- Docs site: Render static site from `docs-site/`

Source of truth: `render.yaml`.

## Deployment Model

- QA deploys only when a PR is merged to `main`; GitHub Actions posts to the QA Render deploy hook.
- Production deploys only when the manual GitHub Actions workflow is run; that workflow posts to the production Render deploy hook.
- Render auto-deploy is disabled for all services in `render.yaml`.

## Required Secrets

- `RENDER_QA_DEPLOY_HOOK`
- `RENDER_PROD_DEPLOY_HOOK`

## Environment Variables

### Backend

Required in staging and production:

- `NODE_ENV=production`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COOKIE_SECRET`
- `CORS_ORIGIN`
- `LOG_LEVEL` (recommended: `info`)

Local template: `backend/.env.example`.

### Frontend

Required in staging and production:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AUTH_REDIRECT_URL`

Local template: `frontend/.env.example`.

### Docs Site

No direct runtime env vars required. Build depends on backend dependencies and schema export.

## Rollout Order

1. Merge the PR to `main`.
2. Let the QA workflow deploy the Render QA services.
3. Confirm the QA backend health check passes.
4. Run the manual production workflow.
5. Confirm the production backend migrations complete (`preDeployCommand` in the blueprint).

## Pre-Deploy Checklist

1. Backend checks:
   - `cd backend && npm run lint`
   - `npm run build`
   - `npm run test:integration`
2. Frontend checks:
   - `cd frontend && npm run lint`
   - `npm run build`
   - `npm test`
3. Docs checks:
   - `cd docs-site && npm run docs:generate`
4. Confirm env vars are set for each Render service.
5. Confirm domain/origin wiring:
   - Frontend domain is included in backend `CORS_ORIGIN`.
   - Frontend `VITE_API_BASE_URL` matches backend public URL.
   - Frontend `VITE_AUTH_REDIRECT_URL` matches frontend public URL.

## Post-Deploy Verification

1. Auth flow
   - Request login link and complete verification.
   - Confirm session persists across refresh.
2. Core query flow
   - Create, edit, delete a query in library.
   - Discover public query and fork it.
3. Favorites and notifications
   - Favorite/unfavorite and verify state refresh.
   - Trigger follow/favorite/fork notifications and verify unread/read behavior.
4. Privacy checks
   - Private profile hides team/level/trainer code.
   - Private query is not visible in discover and direct public detail returns not found.
5. Docs
   - Open docs site and verify latest endpoints/schema are present.

## Rollback Triggers

- Login/session flow is broken in production.
- Query CRUD or discover is unavailable.
- Widespread 5xx errors or elevated auth failures.
- Incorrect privacy exposure of private profile/query fields.

## Rollback Steps

1. In Render, roll backend service back to the previous healthy deploy.
2. If frontend depends on incompatible API shape, roll frontend back to the last healthy deploy.
3. Roll docs site back if published schema no longer matches live backend.
4. Re-run post-deploy verification for auth, core query flow, and privacy checks.
5. Record incident notes in the release thread with root cause and next fix.

## Launch Day Notes

- Announce release only after post-deploy verification passes.
- Keep at least one maintainer available for rapid rollback during the first hour.
- Capture any launch issues and turn them into follow-up TODO items.
