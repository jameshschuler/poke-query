# Product Roadmap

This file is for broader product initiatives that are worth tracking, but do not need to stay in the day-to-day execution backlog.

## Platform Expansion

- Developer Platform
  - Add direct API access for developers and integrators.
  - Add a developers page with auth model, examples, and docs links.
  - Add API access, auth, and rate-limit coverage for developer endpoints.

## Community Features

- Badges and Achievements
  - Define badge criteria for community participation.
  - Store earned badge and progress state.
  - Show badges on profile and relevant community surfaces.
  - Add tests for badge awarding rules and badge rendering.

## Product Extensions

- Pokemon GO Stats Import
  - Add a flow to import Pokemon GO stats using a trainer profile screenshot.
  - Extract profile fields from the screenshot into editable account data before save.
  - Reuse the screenshot import pattern anywhere profile bootstrap or onboarding would benefit.

- Collections
  - Add collection CRUD for authenticated users.
  - Add and remove query strings in collections.
  - Support public and private collections with shareable public pages.
  - Add social actions on public collections (favorite, fork).
  - Add frontend tests for collections CRUD and add/remove query flows.
  - Add backend coverage for collections permissions, visibility, and social actions.

- Generative String Assistant
  - Add a tool to generate or autosuggest Pokemon GO search strings from user goals.
  - Support suggestion flows for raids, PvP, events, and collection cleanup.
  - Let users review, edit, and save suggested strings before publishing.
  - Explore whether suggestions should be powered by rules, templates, AI generation, or a hybrid approach.
  - Allow users to create a search query from a prompt-based input flow.

- Trade Request Strings
  - Add support for creating and sharing trade request strings.
  - Explore templates or guided builders for common trade-use cases.
  - Define how trade request strings should differ from standard saved search strings in UX and metadata.

- Trainer Profile Screenshot Import
  - Add screenshot upload flow for trainer profile.
  - Parse profile data into editable suggested fields before save.
  - add ability to scan trainer code as QR code
