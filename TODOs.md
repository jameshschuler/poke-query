# Product TODOs

See `ROADMAP.md` for longer-term product initiatives.

- fix account redirect error after upgrading account

## Feature Work

- [ ] Frontend Cleanup
  - [ ] Break large frontend surfaces into smaller components where ownership is unclear or rendering logic is too dense.
  - [ ] Prioritize pages with heavy route-level UI state such as discover, library, and fork flows.
- [ ] Backend Cleanup
  - [ ] Review large endpoints and split bloated handlers into smaller helpers or service-layer functions.
  - [ ] Prioritize query, user, and community endpoints with mixed validation, persistence, and serialization logic.
  - [ ] use service files where possible

## Testing

- [ ] Discoverability Ranking Tests
  - [ ] Add backend tests for daily featured selection, eligibility thresholds, and repeat-window rules.
  - [ ] Add frontend tests for featured rail rendering, badge visibility, and clickthrough behavior.
  - [ ] Add regression tests for deterministic daily rotation snapshots.

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
