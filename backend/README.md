# poke-query — Backend

A REST API for sharing and discovering Pokémon GO search queries. Trainers can create, save, and share in-game search strings (e.g. `cp2500-&!shadow`) with the community, tag them for discoverability, and favorite or copy queries from other players.

## Tech Stack

- **[Fastify](https://fastify.dev/)** — HTTP framework with TypeBox type provider
- **[Drizzle ORM](https://orm.drizzle.team/)** — Type-safe SQL query builder
- **[Supabase](https://supabase.com/)** — Postgres database + Auth (JWT / cookie sessions)
- **[Pino](https://getpino.io/)** — Structured JSON logging (pretty-printed in development)
- **[Vitest](https://vitest.dev/)** — Unit and integration tests

## Project Structure

```
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
├── test/                   # Integration tests
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

# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

The server starts on `http://localhost:3000`. Interactive API docs are available at `http://localhost:3000/docs`.

## Scripts

| Command                | Description                           |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Start with hot reload                 |
| `npm run build`        | Compile TypeScript to `dist/`         |
| `npm start`            | Run compiled build                    |
| `npm test`             | Run tests                             |
| `npm run lint`         | Lint source files                     |
| `npm run format`       | Format with Prettier                  |
| `npm run db:generate`  | Generate a new migration              |
| `npm run db:migrate`   | Apply pending migrations              |
| `npm run docs:openapi` | Export OpenAPI JSON for frontend docs |

## One-Page Docs Site

The repo includes a generated one-page API site in `../docs-site`.

1. From `docs-site/`, install dependencies:
   - `npm install`
2. Generate docs page from backend OpenAPI:
   - `npm run docs:generate`
3. Open `docs-site/index.html` in a browser.

The endpoint reference is generated from OpenAPI JSON and merged with a manual quick-start/auth guide.

## API Routes

| Method   | Path                             | Auth | Description                                                |
| -------- | -------------------------------- | ---- | ---------------------------------------------------------- |
| `POST`   | `/auth/login`                    |      | Send OTP to email                                          |
| `POST`   | `/auth/verify`                   |      | Verify OTP and set session cookie                          |
| `POST`   | `/auth/logout`                   | ✓    | End session                                                |
| `GET`    | `/api/v1/users/me`               | ✓    | Get your own profile with query, favorite, and fork counts |
| `PATCH`  | `/api/v1/users/me`               | ✓    | Update your profile                                        |
| `POST`   | `/api/v1/users/me/deactivate`    | ✓    | Deactivate your account                                    |
| `POST`   | `/api/v1/users/me/reactivate`    | ✓    | Reactivate your account                                    |
| `DELETE` | `/api/v1/users/me`               | ✓    | Delete your account                                        |
| `GET`    | `/api/v1/users/:id`              |      | Get a trainer's public profile                             |
| `GET`    | `/api/v1/queries`                | ✓    | List your queries                                          |
| `POST`   | `/api/v1/queries`                | ✓    | Create a query                                             |
| `PATCH`  | `/api/v1/queries/:id`            | ✓    | Update a query                                             |
| `DELETE` | `/api/v1/queries/:id`            | ✓    | Delete a query                                             |
| `POST`   | `/api/v1/queries/:id/fork`       | ✓    | Fork a public query                                        |
| `POST`   | `/api/v1/queries/:id/favorite`   | ✓    | Favorite a visible query (public or owned)                 |
| `POST`   | `/api/v1/queries/:id/unfavorite` | ✓    | Remove a query from your favorites                         |
| `GET`    | `/api/v1/community`              |      | Browse public queries                                      |
