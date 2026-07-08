## What This API Does

Trainers can create, save, update, fork, favorite, and discover reusable Pokemon GO search strings.

Recent backend changes added:

- normalized user tags plus parser-generated `autoTags`
- community discovery with text search, tag filters, sorting, and pagination
- follower endpoints and privacy-aware public trainer fields
- seed data that covers league, raid, and other common discovery tags
- authenticated favorites endpoints for paginated favorites pages and favorite id hydration
- account metadata fields (`profileCompleted`, `deactivatedAt`) for onboarding UX
- account deletion policy that removes private strings but preserves public strings

**Repository:** [github.com/jameshschuler/poke-query](https://github.com/jameshschuler/poke-query)

## Getting Started

### 1. Run the backend locally

```bash
cd backend
npm install
npm run db:migrate
npm run dev
```

The server starts at **http://localhost:3000**.

### 2. Authenticate

1. `POST /api/v1/auth/login` with your email to request an OTP.
2. `POST /api/v1/auth/verify` with `email` and `token` or `token_hash`.
3. `POST /api/v1/auth/logout` clears the session cookies.
4. Protected endpoints require the `sb-access-token` HttpOnly cookie set during verification.

### 3. Call a protected endpoint

```bash
curl -X POST "http://localhost:3000/api/v1/queries" \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{"title":"Great League IV","query":"4*&cp-1500","isPublic":false,"tags":["great-league","pvp"]}'
```

## Authentication Model

This API uses cookie-based auth via Supabase.

| Detail           | Value                                         |
| ---------------- | --------------------------------------------- |
| Cookie name      | `sb-access-token`                             |
| Lifetime         | 1 hour access, 7 day refresh                  |
| Protected routes | Declared with the cookie auth security scheme |

## Query Payload Rules

- Create and update requests accept `title`, `query`, `description`, `isPublic`, and optional `tags`
- Unknown fields are rejected by validation
- User tags are trimmed, lowercased, and deduplicated before storage
- Parser-generated `autoTags` are derived from the query string and used by community discovery

Current generated tag coverage includes `high-iv`, `nundo-hunt`, `pvp`, `great-league`, `ultra-league`, `master-league`, `legacy-moves`, `raid`, `mass-evolve`, `distance-trade`, and `daily-catch`.

## Community Discovery

`GET /api/v1/community` supports these query params:

- `tag`: matches either stored user tags or generated `autoTags`
- `search`: matches title, query text, description, or creator username
- `filter`: `all`, `new`, or `popular`
- `sort`: `created_desc`, `created_asc`, `title_asc`, `title_desc`, or `popular`
- `limit`: 1-50
- `offset`: pagination offset

Only public queries are returned. Creator `team`, `level`, and `trainerCode` are returned as `null` when the creator's profile is private.

`GET /api/v1/queries/tags` returns tag metadata for public queries only:

- `tags[].id`: tag id
- `tags[].name`: normalized tag name
- `tags[].queryCount`: number of public queries associated with the tag

This endpoint is intended for frontend filter UIs so tag options stay synchronized with real data.

## Guest Favorites

Guest users can favorite public queries without creating an account.

- `POST /api/v1/queries/guest/session` creates/reuses a cookie-backed guest identity.
- `GET /api/v1/queries/guest/favorites` returns guest favorite ids and current usage.
- `POST /api/v1/queries/guest/favorites/:id` favorites a public query.
- `POST /api/v1/queries/guest/favorites/:id/unfavorite` removes a guest favorite.

Rules:

- max 10 guest favorites per guest id
- duplicate favorites are idempotent
- missing/non-public query favorite attempts return `404`

## Trainer Profile Endpoints

Public trainer profiles are split for better caching and tab loading on the frontend:

- `GET /api/v1/users/by-username/:username` returns public profile metadata and aggregate counts.
- `GET /api/v1/users/:id/strings` returns up to 20 public non-fork queries.
- `GET /api/v1/users/:id/forks` returns up to 20 public forks.
- `GET /api/v1/users/:id/favorites` returns up to 20 public favorites.
- `GET /api/v1/users/:id/followers` returns the trainer's follower list with privacy-aware trainer fields.
- `GET /api/v1/users/me/followers` returns the authenticated trainer's follower list.

Authenticated trainer management endpoints:

- `GET /api/v1/users/me/queries` returns the authenticated trainer's strings.
- `GET /api/v1/users/me/forks` returns the authenticated trainer's forks with sync metadata.
- `GET /api/v1/users/me/favorites` returns paginated favorites for authenticated users.
- `GET /api/v1/users/me/favorites/ids` returns favorite query ids for UI hydration.

`GET /api/v1/users/me` now includes:

- `profileCompleted`: frontend onboarding/account-completion flag
- `deactivatedAt`: deactivation timestamp or `null`

`PATCH /api/v1/users/me` returns `409` when the requested username is already taken.

Account lifecycle behavior:

- `POST /api/v1/users/me/deactivate` marks an account as deactivated and leaves strings unchanged.
- `DELETE /api/v1/users/me` removes non-public strings and preserves public strings with anonymized ownership.

## Seed Data

The backend includes seed scripts for local QA and demo data:

- `npm run db:seed:trainers`
- `npm run db:seed:search`
- `npm run db:seed:followers`
- `npm run db:seed`

The search seed script includes public and private queries plus tag coverage for great league, ultra league, master league, raid, community-day style searches, and other common filter cases.
