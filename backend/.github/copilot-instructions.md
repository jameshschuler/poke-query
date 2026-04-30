# Copilot Instructions

## Architecture

- This repo is a small Fastify 5 + TypeScript ESM API. `src/index.ts` boots the server; `src/app.ts` composes plugins and registers all route modules.
- Route code is organized by feature under `src/modules/*`. Each feature usually has a `*.routes.ts` file plus a matching schema file (`auth.schema.ts`, `queries.schemas.ts`, `community.schemas.ts`).
- Infrastructure is attached through Fastify plugins, not passed around manually. `src/plugins/db.ts` decorates `fastify.db`; `src/plugins/auth.ts` decorates `fastify.authenticate` and sets `request.user`.
- Fastify type augmentation lives in `src/types/fastify.ts`. If you add decorators or request properties, update that file so handlers stay type-safe.
- The database layer uses Drizzle over `postgres-js` (`src/db/index.ts`). Tables are defined in `src/db/schema.ts` under the Postgres schema `pokequery`; Supabase auth users live in `auth.users` and are referenced from app tables.
- Supabase is only used for auth/session work (`src/lib/supabase.ts`, `src/plugins/auth.ts`, `src/modules/auth/auth.routes.ts`). Application data still goes through Drizzle.

## API patterns

- Register new endpoints inside the relevant feature module and let `src/app.ts` own the top-level prefix.
- Be careful with prefix + local path composition. Example: `communityRoutes` is registered with `/api/v1/community` and currently defines `server.get("/community")`, so the effective path is `/api/v1/community/community`.
- Protected routes use `preHandler: [fastify.authenticate]`; read the current user from `request.user`, usually `request.user.id`.
- Inside handlers, prefer `fastify.db` over importing `db` directly so code matches the plugin/decorator pattern used across the app.
- Reads often use Drizzle relational queries (`fastify.db.query.searchQueries.findFirst/findMany`); writes use `insert`, `update`, `returning`, and `eq/sql` helpers from `drizzle-orm`.
- Query creation/forking keeps Pokémon Go search parsing centralized in `src/utils/pogo-parser.ts`. Reuse `generateMetadata(query)` instead of duplicating tag logic in routes.

## Schema and typing conventions

- This codebase prefers TypeBox-backed route schemas with `withTypeProvider<TypeBoxTypeProvider>()` inside route registrars.
- Keep request body destructuring in sync with the TypeBox schema. `npm run build` catches schema/handler drift quickly.
- Response schemas are defined alongside request schemas and are used for Swagger generation. Update both when changing handler payloads.
- Keep the existing ESM import style (`.js` extensions in TS source) and preserve NodeNext-compatible imports.

## Auth and cookies

- Login starts with Supabase OTP (`POST /auth/login`), and verification (`POST /auth/verify`) creates a trainer row if needed.
- Session state is carried in HttpOnly cookies named `sb-access-token` and `sb-refresh-token`. The auth plugin only checks `sb-access-token`.
- Cookie security depends on `NODE_ENV === "production"`; avoid changing cookie names or auth flow unless you update both the plugin and auth routes.

## Database and migrations

- Drizzle migrations are generated from `src/db/schema.ts` via `npm run db:generate` and written to `supabase/migrations`.
- Keep `drizzle.config.ts` aligned with the app schema: migrations target PostgreSQL and filter to the `pokequery` schema.
- The schema already models self-referential forks (`search_queries.parent_query_id`), JSONB metadata (`metadata.autoTags`), and junction tables (`favorites`, `queries_to_tags`). Follow those patterns instead of inventing ad hoc columns.

## Developer workflow

- Use `npm run dev` for local development (`tsx watch --env-file=.env src/index.ts`).
- Use `npm run build` before finishing TypeScript changes; the repo is strict (`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`).
- Use `npm test` for Vitest. Tests create the app with `buildApp()` and hit routes with `app.inject()` instead of starting a real server.
- Shared Supabase mocking lives in `test/setup.ts`; auth-heavy tests should follow that style rather than calling real Supabase.
- Required env vars are inferred from the code: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `COOKIE_SECRET`.

## When adding code

- Mirror the existing feature layout: add/update the route file, the matching schema file, and any Drizzle schema changes together.
- If a new route needs auth, wire it through `fastify.authenticate` instead of custom token parsing.
- If you change serialized response shapes, update the TypeBox response schema and any affected `app.inject()` tests in `test/`.
