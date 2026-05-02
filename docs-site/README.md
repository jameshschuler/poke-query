# poke-query Docs Site

A one-page API documentation site powered by [Scalar](https://scalar.com/), loaded from the backend's OpenAPI spec.

## Commands

Run from `docs-site/`:

- `npm run docs:generate` — export a fresh `data/openapi.json` from the backend
- `npm start` — serve the site locally (then open http://localhost:3000)

## Files

- `index.html` — Scalar CDN page, points at `./data/openapi.json`
- `data/openapi.json` — generated OpenAPI spec (do not edit manually)
