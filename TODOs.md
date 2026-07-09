# Community Launch TODOs

## P0 - Must Have Before Sharing

### 1) Manage/CRUD Queries

- [x] Build full "My Queries" page backed by API (replace placeholder cards)
- [x] Edit query flow (owner-only) with optimistic UI + error handling
- [x] Delete query flow (owner-only) with confirm dialog + undo toast
- [x] Validate query input and title limits consistently (frontend + backend)
- [ ] Add query ownership checks in UI states (disable/hide actions for non-owners)

### 2) Manage/CRUD Forked Queries

- [x] Build "Forks" page with real data from `/api/v1/users/:id/forks` and own fork list
- [x] Add fork details view (original source, fork timestamp, sync status)
- [x] Enable editing/deleting forked queries as first-class queries
- [x] Add "fork from discover/query detail" flow with success navigation
- [x] Prevent invalid fork actions (private/orphaned originals) with clear messaging

### 3) Manage Favorites

- [x] Build authenticated "Favorites" page from API (replace placeholders)
- [x] Add favorite/unfavorite persistence across discover, detail, and profile views
- [x] Ensure favorite state is hydrated on page load (no stale button states)
- [x] Add empty/loading/error states for favorites list
- [x] Add pagination or infinite loading for large favorites lists

### 4) Manage Account/Profile

- [x] Build account settings page (username, team, level, trainer code, avatar, visibility)
- [x] Add profile privacy toggle UX and explain public/private implications
- [x] Add account deactivation/reactivation flow in frontend
- [x] Add account delete flow with explicit confirmation + final sign-out
- [x] Add client-side validation for username/trainer code before submit
- [x] Handle profile conflicts (duplicate username) with actionable errors

### 5) Manage Notifications

- [x] Define notification events (new follower, forked query, favorited query, etc.)
- [x] Add backend notification model + read/unread endpoints
- [x] Add notification center UI (list, unread badge, mark read/all)
- [x] Add in-app toasts for high-priority events
- [x] Add notification preferences in account settings

### 6) Dashboard

- [x] Recent Activity
- Deploy FE, BE, and docs site
- Scalability and logging
- Ensure guest access works well
- Mobile first is key
- Create a MCP server
- Ensure owasp top 10 is followed
- E2E tests with playwright
- Revisit login page design
- Allow uploading trainer profile screen and parse out info
- PWA support
- Add contributing guide
- User details flash between page loads
- Add more vertical spacing between UI components

## P0 - Security, Trust, and Data Safety

- [x] Add RLS policies for all multi-tenant tables (trainers, queries, favorites, followers, guest_favorites, etc.)
- [x] Add profanity/bad-words validation for usernames, titles, descriptions
- [x] Add rate limiting for auth, follow, favorite, query create/update endpoints
- [ ] Add abuse protections (basic spam heuristics + report flow)
- [ ] Verify private profile and private query access controls with integration tests

## P1 - Reliability and Quality

- [ ] Add frontend tests for discover filters/search URL sync and share-link restore
- [ ] Add frontend tests for follow/favorite/query CRUD user flows
- [ ] Add backend tests for notifications and profile/account endpoints
- [ ] Add seed data strategy for local and staging demo environments
- [ ] Add structured error logging and request tracing for production debugging

## P1 - Product Polish

- [ ] Add onboarding empty states for first-time users
- [ ] Add success/error toast consistency across all mutations
- [ ] Add accessible labels, keyboard flows, and focus states to all critical UI
- [ ] Add responsive QA pass for mobile discover/profile/settings pages
- [ ] Add theme / colors / allow user to select theme

## P1 - Launch Operations

- [ ] Finalize environment configuration docs (frontend + backend)
- [ ] Add deployment checklist and rollback instructions
- [ ] Add privacy policy/terms/community guidelines links in app footer
- [ ] Add basic analytics for activation and retention funnels
- [ ] Create community announcement post and issue template for feedback
