# poke-query Docs Site

A one-page API documentation site powered by [Scalar](https://scalar.com/), loaded from the backend's OpenAPI spec.

The generated spec includes the current backend route schemas plus the manual overview from `backend/src/openapi-description.md`.

## Commands

Run from `docs-site/`:

- `npm run docs:generate` — export a fresh `data/openapi.json` from the backend
- `npm start` — serve the site locally

Before generating docs, make sure backend dependencies are installed because the generator boots the Fastify app to export the live OpenAPI spec.

Run `npm run docs:generate` after backend route schema changes or edits to `backend/src/openapi-description.md` so the Scalar site stays aligned with the live API.

## Files

- `index.html` — Scalar CDN page, points at `./data/openapi.json`
- `data/openapi.json` — generated OpenAPI spec (do not edit manually)

After starting the site, open the local URL printed by `serve`.
