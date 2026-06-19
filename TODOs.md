# Community Launch TODOs

## P0 - Must Have Before Sharing

### 1) Manage/CRUD Queries

- [ ] Build full "My Queries" page backed by API (replace placeholder cards)
- [ ] Create query flow from frontend (title, query, description, visibility)
- [ ] Edit query flow (owner-only) with optimistic UI + error handling
- [ ] Delete query flow (owner-only) with confirm dialog + undo toast
- [ ] Validate query input and title limits consistently (frontend + backend)
- [ ] Add query ownership checks in UI states (disable/hide actions for non-owners)

### 2) Manage/CRUD Forked Queries

- [ ] Build "Forks" page with real data from `/api/v1/users/:id/forks` and own fork list
- [ ] Add fork details view (original source, fork timestamp, sync status)
- [ ] Enable editing/deleting forked queries as first-class queries
- [ ] Add "fork from discover/query detail" flow with success navigation
- [ ] Prevent invalid fork actions (private/orphaned originals) with clear messaging

### 3) Manage Favorites

- [ ] Build authenticated "Favorites" page from API (replace placeholders)
- [ ] Add favorite/unfavorite persistence across discover, detail, and profile views
- [ ] Ensure favorite state is hydrated on page load (no stale button states)
- [ ] Add empty/loading/error states for favorites list
- [ ] Add pagination or infinite loading for large favorites lists

### 4) Manage Account/Profile

- [ ] Build account settings page (username, team, level, trainer code, avatar, visibility)
- [ ] Add profile privacy toggle UX and explain public/private implications
- [ ] Add account deactivation/reactivation flow in frontend
- [ ] Add account delete flow with explicit confirmation + final sign-out
- [ ] Add client-side validation for username/trainer code before submit
- [ ] Handle profile conflicts (duplicate username) with actionable errors

### 5) Manage Notifications

- [ ] Define notification events (new follower, forked query, favorited query, etc.)
- [ ] Add backend notification model + read/unread endpoints
- [ ] Add notification center UI (list, unread badge, mark read/all)
- [ ] Add in-app toasts for high-priority events
- [ ] Add notification preferences in account settings

## P0 - Security, Trust, and Data Safety

- [ ] Add RLS policies for all multi-tenant tables (trainers, queries, favorites, followers, guest_favorites)
- [ ] Add profanity/bad-words validation for usernames, titles, descriptions
- [ ] Add rate limiting for auth, follow, favorite, query create/update endpoints
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

## P1 - Launch Operations

- [ ] Finalize environment configuration docs (frontend + backend)
- [ ] Add deployment checklist and rollback instructions
- [ ] Add privacy policy/terms/community guidelines links in app footer
- [ ] Add basic analytics for activation and retention funnels
- [ ] Create community announcement post and issue template for feedback
