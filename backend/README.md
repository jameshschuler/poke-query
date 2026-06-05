# poke-query — Backend

A REST API for sharing and discovering Pokemon GO search queries. Trainers can create, save, and share in-game search strings with the community, tag them for discoverability, and favorite or copy queries from other players.

Recent backend changes added normalized user tags, richer parser-generated `autoTags`, community search and pagination controls, follower endpoints, privacy-aware public profile fields, and seed data covering common tag filters.

## Tech Stack

- **[Fastify](https://fastify.dev/)** — HTTP framework with TypeBox type provider
- **[Drizzle ORM](https://orm.drizzle.team/)** — Type-safe SQL query builder
- **[Supabase](https://supabase.com/)** — Postgres database + Auth (JWT / cookie sessions)
- **[Pino](https://getpino.io/)** — Structured JSON logging
- **[Vitest](https://vitest.dev/)** — Unit and integration tests

## Project Structure

```text
backend/
├── src/
│   ├── app.ts              # App factory (plugins, routes)
│   ├── index.ts            # Entry point
│   ├── db/
│   │   ├── index.ts        # Drizzle client
│   │   └── schema.ts       # Database schema
│   ├── modules/
│   │   ├── auth/           # Login, logout, session
│   │   ├── community/      # Public query feed
│   │   ├── queries/        # CRUD for search queries
│   │   └── users/          # Trainer profiles
│   ├── plugins/
│   │   ├── auth.ts         # Supabase session plugin
│   │   └── db.ts           # Drizzle plugin
│   └── utils/
│       └── pogo-parser.ts  # Query string parser
├── scripts/                # Seed and export scripts
├── test/                   # Unit and integration tests
└── supabase/               # SQL migrations
```

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com/) project

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=...
COOKIE_SECRET=a-long-random-string
NODE_ENV=development
```

### Install & Run

```bash
npm install

# Development
npm run dev

# Production
npm run build
npm start
```

The server starts on `http://localhost:3000`. Interactive API docs are available at `http://localhost:3000/docs`.

## Scripts

| Command                     | Description                           |
| --------------------------- | ------------------------------------- |
| `npm run dev`               | Start with hot reload                 |
| `npm run build`             | Compile TypeScript to `dist/`         |
| `npm start`                 | Run compiled build                    |
| `npm test`                  | Run tests                             |
| `npm run test:integration`  | Run integration tests                 |
| `npm run lint`              | Lint source files                     |
| `npm run format`            | Format with Prettier                  |
| `npm run db:generate`       | Generate a new migration              |
| `npm run db:migrate`        | Apply pending migrations              |
| `npm run db:seed`           | Seed trainers, queries, and followers |
| `npm run db:seed:trainers`  | Seed trainer profiles                 |
| `npm run db:seed:search`    | Seed search queries with tag coverage |
| `npm run db:seed:followers` | Seed follower relationships           |
| `npm run docs:openapi`      | Export OpenAPI JSON for the docs site |

## API Routes

| Method   | Path                                  | Auth | Description                                                          |
| -------- | ------------------------------------- | ---- | -------------------------------------------------------------------- |
| `POST`   | `/api/v1/auth/login`                  |      | Send OTP to email                                                    |
| `POST`   | `/api/v1/auth/verify`                 |      | Verify OTP and set session cookie                                    |
| `POST`   | `/api/v1/auth/logout`                 | ✓    | End session                                                          |
| `GET`    | `/api/v1/users/me`                    | ✓    | Get your own profile with query, favorite, follower, and fork counts |
| `GET`    | `/api/v1/users/me/followers`          | ✓    | List trainers who follow you                                         |
| `PATCH`  | `/api/v1/users/me`                    | ✓    | Update your profile                                                  |
| `POST`   | `/api/v1/users/me/deactivate`         | ✓    | Deactivate your account                                              |
| `POST`   | `/api/v1/users/me/reactivate`         | ✓    | Reactivate your account                                              |
| `DELETE` | `/api/v1/users/me`                    | ✓    | Delete your account                                                  |
| `GET`    | `/api/v1/users/by-username/:username` |      | Get a public trainer profile and aggregate public counts             |
| `GET`    | `/api/v1/users/:id/strings`           |      | List up to 20 public non-fork queries by trainer                     |
| `GET`    | `/api/v1/users/:id/forks`             |      | List up to 20 public forks by trainer                                |
| `GET`    | `/api/v1/users/:id/favorites`         |      | List up to 20 public favorites by trainer                            |
| `GET`    | `/api/v1/users/:id`                   |      | Get a trainer's public profile                                       |
| `GET`    | `/api/v1/users/:id/followers`         |      | List followers for a specific trainer                                |
| `POST`   | `/api/v1/users/:id/follow`            | ✓    | Follow another trainer                                               |
| `POST`   | `/api/v1/users/:id/unfollow`          | ✓    | Unfollow another trainer                                             |
| `GET`    | `/api/v1/queries`                     | ✓    | List your queries                                                    |
| `GET`    | `/api/v1/queries/tags`                |      | List public query tags with usage counts for discovery filters       |
| `GET`    | `/api/v1/queries/:id`                 |      | Get one public query with public fork metadata                       |
| `POST`   | `/api/v1/queries`                     | ✓    | Create a query                                                       |
| `PATCH`  | `/api/v1/queries/:id`                 | ✓    | Update a query you own                                               |
| `DELETE` | `/api/v1/queries/:id`                 | ✓    | Delete a query                                                       |
| `POST`   | `/api/v1/queries/:id/fork`            | ✓    | Fork a public query                                                  |
| `PATCH`  | `/api/v1/queries/:id/copy`            |      | Increment the copy count                                             |
| `POST`   | `/api/v1/queries/:id/favorite`        | ✓    | Favorite a visible query                                             |
| `POST`   | `/api/v1/queries/:id/unfavorite`      | ✓    | Remove a query from your favorites                                   |
| `GET`    | `/api/v1/community`                   |      | Browse public queries with tag, search, sort, and pagination         |

## Query Endpoints

### Create Query

Create a new search query. The request body is strict: only the documented fields are accepted.

```json
{
  "title": "string (3-100 chars)",
  "query": "string",
  "description": "string (optional, max 500 chars)",
  "isPublic": false,
  "tags": ["great-league", "pvp"]
}
```

- `tags` is optional.
- User tags are trimmed, lowercased, and deduplicated before storage.
- Parser-generated `autoTags` are derived from the query string.
- Community tag filtering matches both stored user tags and generated `autoTags`.

### Update Query

Update an existing search query that you own. The request body is strict: only the documented fields are accepted.

```json
{
  "title": "string (3-100 chars)",
  "query": "string",
  "description": "string (optional, max 500 chars)",
  "isPublic": true,
  "tags": ["raid", "dragon"]
}
```

- The `tags` field is optional.
- Existing query-to-tag links are replaced on update.
- Auto-tags are regenerated from the updated query string.
- Unknown fields are rejected by request validation.

## Community Discovery

`GET /api/v1/community` returns public queries only.

`GET /api/v1/queries/tags` returns available tags for public queries and includes a `queryCount` for each tag. This is useful for building dynamic tag filters in the frontend.

Supported query params:

- `tag`: filters by either a user tag or an `autoTag`
- `search`: matches query title, query text, description, or creator username
- `filter`: one of `all`, `new`, or `popular`
- `sort`: one of `created_desc`, `created_asc`, `title_asc`, `title_desc`, or `popular`
- `limit`: 1-50, defaults to 20
- `offset`: pagination offset, defaults to 0

Notes:

- `filter=new` restricts results to the last 30 days.
- `filter=popular` defaults to popularity-based ordering when `sort` is omitted.
- Response items include creator info, but `team`, `level`, and `trainerCode` are `null` when the creator's profile is private.

## Trainer Profiles And Privacy

- `GET /api/v1/users/by-username/:username` returns public profile metadata and aggregate counts.
- `GET /api/v1/users/:id/strings`, `/forks`, and `/favorites` each return up to 20 public records.
- `GET /api/v1/users/:id/followers` and `GET /api/v1/users/me/followers` return follower lists with privacy-aware trainer fields.
- Public endpoints hide `team`, `level`, and `trainerCode` when `isProfilePublic` is `false`.

## Seed Data

The backend includes sample seed scripts for demos, local QA, and filter validation:

- `npm run db:seed:trainers` creates trainer profiles
- `npm run db:seed:search` creates public and private queries with broad tag coverage, including league, raid, and community-day style tags
- `npm run db:seed:followers` creates follower relationships between sample trainers
- `npm run db:seed` runs all seed steps in order

The search seed data is intended to exercise community feed filters, including tags stored in the tag tables and tags generated automatically from the query parser.

## One-Page Docs Site

The repo includes a generated one-page API site in `../docs-site`.

1. From `docs-site/`, install dependencies:
   - `npm install`
2. Generate docs from backend OpenAPI:
   - `npm run docs:generate`
3. Start the docs site locally:
   - `npm start`

Regenerate the docs site after backend schema changes or edits to `src/openapi-description.md`.
