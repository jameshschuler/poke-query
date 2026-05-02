A REST API for sharing and discovering Pokémon GO search queries.

**Repository:** [github.com/jameshschuler/poke-query](https://github.com/jameshschuler/poke-query)

## What This API Does

Trainers can create, save, share, fork, favorite, and discover reusable in-game search strings (e.g. `cp2500-&!shadow`) with the community.

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

1. `POST /auth/login` with your email — triggers an OTP email.
2. `POST /auth/verify` with `email` + `token` (or `token_hash` from the magic link).
3. The response sets an `sb-access-token` HttpOnly cookie. All protected endpoints require this cookie.

### 3. Call a protected endpoint

```bash
curl -X POST "http://localhost:3000/api/v1/queries" \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{"title":"Great League IV","query":"4*&cp-1500","isPublic":false}'
```

## Authentication Model

This API uses **cookie-based auth** via Supabase.

| Detail           | Value                              |
| ---------------- | ---------------------------------- |
| Cookie name      | `sb-access-token`                  |
| Lifetime         | 1 hour (access), 7 days (refresh)  |
| Protected routes | Marked with the 🔒 lock icon below |
