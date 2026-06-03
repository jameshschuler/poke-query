## What This API Does

Trainers can create, save, update, fork, favorite, and discover reusable Pokemon GO search strings.

Recent backend changes added:

- normalized user tags plus parser-generated `autoTags`
- community discovery with text search, tag filters, sorting, and pagination
- follower endpoints and privacy-aware public trainer fields
- seed data that covers league, raid, and other common discovery tags

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

## Trainer Profile Endpoints

Public trainer profiles are split for better caching and tab loading on the frontend:

- `GET /api/v1/users/by-username/:username` returns public profile metadata and aggregate counts.
- `GET /api/v1/users/:id/strings` returns up to 20 public non-fork queries.
- `GET /api/v1/users/:id/forks` returns up to 20 public forks.
- `GET /api/v1/users/:id/favorites` returns up to 20 public favorites.
- `GET /api/v1/users/:id/followers` returns the trainer's follower list with privacy-aware trainer fields.
- `GET /api/v1/users/me/followers` returns the authenticated trainer's follower list.

## Seed Data

The backend includes seed scripts for local QA and demo data:

- `npm run db:seed:trainers`
- `npm run db:seed:search`
- `npm run db:seed:followers`
- `npm run db:seed`

The search seed script includes public and private queries plus tag coverage for great league, ultra league, master league, raid, community-day style searches, and other common filter cases.
