# Product TODOs

## Feature Work

- [ ] Collections
  - [ ] Add collection CRUD for authenticated users.
  - [ ] Add/remove query strings in collections.
  - [ ] Support public/private collections and shareable public pages.
  - [ ] Add social actions on public collections (favorite, fork).

- [ ] Developer Platform
  - [ ] Add direct API access for developers/integrators.
  - [ ] Add a developers page with auth model, examples, and docs links.

- [ ] Badges and Achievements
  - [ ] Define badge criteria for community participation.
  - [ ] Store earned badge/progress state.
  - [ ] Show badges on profile and relevant community surfaces.

- [ ] Abuse Reporting and Moderation
  - [ ] Add report flow for public queries and trainer profiles.
  - [ ] Add moderation queue with report states and reviewer actions.

- [ ] Trainer Profile Screenshot Import
  - [ ] Add screenshot upload flow for trainer profile.
  - [ ] Parse profile data into editable suggested fields before save.

- [ ] PWA Support
  - [ ] Add install/offline support for core read paths.

- [ ] Profile Hydration UX
  - [ ] Fix user details flash between page loads.

## Testing

- [ ] E2E Coverage (Playwright)
  - [ ] Add smoke tests for auth, discover, library, and profile flows.
  - [ ] Expand E2E coverage for notifications and forks.

- [ ] Frontend Tests
  - [ ] Test discover filter/search URL sync and share-link restore.
  - [ ] Test follow/favorite/query CRUD user flows.
  - [ ] Test collections CRUD and add/remove query flows.

- [ ] Backend Tests
  - [ ] Add coverage for notifications read/unread and mark-all-read.
  - [ ] Add coverage for profile/account privacy and auth failures.
  - [ ] Add coverage for collections permissions/visibility and social actions.

- [ ] Developer Platform Tests
  - [ ] Add API access/auth/rate-limit coverage for developer endpoints.

- [ ] Badges Tests
  - [ ] Add tests for badge awarding rules and badge rendering.

- [ ] Moderation Tests
  - [ ] Add tests for report submission, queue actions, and audit history.
