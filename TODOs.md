# Product TODOs

See `ROADMAP.md` for longer-term product initiatives.

## Feature Work

- [ ] Prompt-Based Query Creation
  - [ ] Allow users to create a search query from a prompt.
  - [ ] Define the first supported prompt flows and the resulting review/edit UX.

- [ ] Trade Request String Support
  - [ ] Allow users to create a trade request string.
  - [ ] Decide whether trade requests use a dedicated type, template, or metadata-driven variant.

- [ ] Frontend Cleanup
  - [ ] Break large frontend surfaces into smaller components where ownership is unclear or rendering logic is too dense.
  - [ ] Prioritize pages with heavy route-level UI state such as discover, library, and fork flows.

- [ ] Backend Cleanup
  - [ ] Review large endpoints and split bloated handlers into smaller helpers or service-layer functions.
  - [ ] Prioritize query, user, and community endpoints with mixed validation, persistence, and serialization logic.

## Testing

- [ ] E2E Coverage (Playwright)
  - [ ] Add smoke tests for auth, discover, library, and profile flows.
  - [ ] Expand E2E coverage for notifications and forks.

- [ ] Frontend Tests
  - [ ] Test discover filter/search URL sync and share-link restore.
  - [ ] Test follow/favorite/query CRUD user flows.

- [ ] Backend Tests
  - [ ] Add coverage for notifications read/unread and mark-all-read.
  - [ ] Add coverage for profile/account privacy and auth failures.

- [ ] Moderation Tests
  - [ ] Add tests for report submission, queue actions, and audit history.
