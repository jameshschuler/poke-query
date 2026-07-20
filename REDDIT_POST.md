# Reddit Post Draft

## Title

I made a Pokemon GO query-sharing app (open source) and would love feedback

## Body

I built an open-source project called PokeQuery for Pokemon GO trainers who use a lot of search strings.

This came from a problem I kept running into on Reddit and Discord: someone drops a great string in a comment, I save the post/comment, and then later I have no clean way to find it again.

Everything ends up scattered between saved comments, screenshots, and random notes. PokeQuery is my attempt to make that organized: save the good strings, fork them, improve them, and keep them searchable.

What it currently does:

- Create, edit, delete, copy, and fork queries
- Favorite and unfavorite queries (including a guest favorites flow)
- Discover community queries with text search, tags, sorting, and pagination
- Privacy-aware trainer profiles
- OTP auth with Supabase

Tech stack:

- Fastify + TypeScript + Postgres + Drizzle
- React + TanStack Router/Query
- Supabase auth

If you try it, I’d especially love feedback on:

- Whether the query and fork flow feels intuitive
- Which discovery filters/sorts are most useful in real play
- Anything missing that would make this actually useful week to week

Repo: https://github.com/YOUR_USERNAME/poke-query

---

## Variant: r/pokemongo (short)

### Title

I made a Pokemon GO search string sharing app and would love feedback!

### Body

Hello!

I built a small open-source app called PokeQuery to make search strings easier to manage and share. This came from a problem I kept running into where someone posts a useful string in a comment, I save the post/comment, and then later I have no clean way to find it again. Everything ends up scattered between saved comments, screenshots, and random notes. PokeQuery is my attempt to make that organized: save the helpful strings, fork them, improve them, and keep them searchable.

Current features:

- Create/edit/delete/copy/fork strings
- Favorite strings (with guest favorites too)
- Discover page with search, tags, sort, and pagination
- Privacy-aware profiles

I’d love practical feedback from active players:

- What filters do you actually use most?
- What makes a shared string immediately useful vs noisy?
- What would make this worth opening every week?

Repo: https://github.com/YOUR_USERNAME/poke-query

---

## Variant: r/webdev / r/reactjs (technical)

### Title

Built an open-source Pokemon GO query-sharing app with Fastify + React + TanStack

### Body

I’ve been building PokeQuery, an open-source app for sharing and iterating on Pokemon GO search queries.

It started as a practical tool for players, but I also used it as a full-stack project to work through query lifecycle design (create/edit/fork/favorite), privacy-aware profiles, and community discovery at API level.

Stack:

- Backend: Fastify, TypeScript, Postgres, Drizzle ORM
- Frontend: React, TanStack Router, TanStack Query, TanStack Start
- Auth: Supabase OTP/session
- Tests: Vitest unit + integration suites

Interesting parts:

- Forkable query model with favorites and guest favorites
- Tag-aware discovery (search + tags + sort + pagination)
- Privacy-aware profile responses
- Render blueprint deploy flow for backend/frontend/docs

If anyone wants to review architecture choices or tradeoffs, I’d value blunt feedback.

Repo: https://github.com/YOUR_USERNAME/poke-query
