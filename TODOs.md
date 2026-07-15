# Community Launch TODOs

## P0 - Must Have Before Sharing

### 1) Manage/CRUD Queries

- [x] Build full "My Queries" page backed by API (replace placeholder cards)
- [x] Edit query flow (owner-only) with optimistic UI + error handling
- [x] Delete query flow (owner-only) with confirm dialog + undo toast
- [x] Validate query input and title limits consistently (frontend + backend)
- [ ] Add query ownership checks in UI states (disable/hide actions for non-owners)
  - [ ] Hide edit/delete/fork-owner actions when the current user is not the owner.
  - [ ] Disable or redirect from owner-only entry points when permissions fail.
  - [ ] Keep the UI state aligned with backend ownership checks.

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
- [ ] Deploy FE, BE, and docs site
  - [ ] Add production build/deploy config for frontend, backend, and docs site.
  - [ ] Verify environment variables and domains for each deployment target.
  - [ ] Document the rollout order and rollback steps.
- [ ] Scalability and logging
  - [x] Add structured request logging for API and auth flows.
  - [x] Add trace/request ids across frontend and backend logs.
  - [ ] Identify the main bottlenecks for query/favorite/notification traffic.
- [ ] Ensure guest access works well
  - [ ] Verify discover browsing works without auth.
  - [ ] Verify guest favorites persist and recover correctly.
  - [ ] Make guest-to-auth transition predictable when users log in.
- [ ] Mobile first is key
  - [ ] Review critical pages on small screens: discover, account, library, forks, favorites.
  - [ ] Fix any overflow, tap-target, or spacing issues found during QA.
  - [ ] Keep mobile layout changes isolated from larger breakpoints.
- [ ] Create a MCP server
  - [ ] Define the MCP server scope and exposed tools/resources.
  - [ ] Scaffold the server project and config.
  - [ ] Document local development and integration steps.
- [ ] Ensure owasp top 10 is followed
  - [ ] Review auth/session handling and rate limiting coverage.
  - [ ] Audit input validation, access control, and data exposure paths.
  - [ ] Add security review notes for external links, uploads, and moderation flows.
- [ ] E2E tests with playwright
  - [ ] Cover sign in/out and profile completion flows.
  - [ ] Cover discover browse/favorite/fork flows.
  - [ ] Cover library/forks CRUD and notification interactions.
- [ ] Allow uploading trainer profile screen and parse out info
  - [ ] Add upload UI for a trainer profile screenshot.
  - [ ] Parse image content into suggested profile fields.
  - [ ] Let users review and edit parsed data before saving.
- [ ] PWA support
  - [ ] Add installable manifest and icons.
  - [ ] Add service worker/caching strategy for core pages.
  - [ ] Verify offline/poor-network behavior for read-only screens.
- [ ] Add contributing guide
  - [ ] Write setup, dev, test, and PR instructions.
  - [ ] Include branching and code review expectations.
  - [ ] Link the guide from the repo and docs.
- [ ] User details flash between page loads
  - [ ] Avoid showing stale cached identity/profile data during route transitions.
  - [ ] Keep placeholders/skeletons visible until fresh data is ready.
  - [ ] Audit auth/user cache hydration for remount timing issues.
- [ ] Add more vertical spacing between UI components
  - [ ] Review the account, discover, library, and detail layouts.
  - [ ] Increase section gaps where cards and forms feel cramped.
  - [ ] Keep spacing changes consistent with the shared card components.

## P0 - Security, Trust, and Data Safety

- [x] Add RLS policies for all multi-tenant tables (trainers, queries, favorites, followers, guest_favorites, etc.)
- [x] Add profanity/bad-words validation for usernames, titles, descriptions
- [x] Add rate limiting for auth, follow, favorite, query create/update endpoints
- [ ] Add abuse protections (basic spam heuristics + report flow)
  - [ ] Add backend spam heuristics for query create/update, follow, and favorite actions.
    - [ ] Rate-limit repeated submissions by user and IP.
    - [ ] Flag repeated duplicate or near-duplicate query text.
    - [ ] Flag obvious spam signals like excessive links, repeated characters, or keyword stuffing.
    - [ ] Escalate new accounts that begin posting or following at high volume.
  - [ ] Add a report flow for public queries and trainer profiles.
    - [ ] Add a report action on query cards, query detail pages, and trainer profiles.
    - [ ] Capture target type, target id, reporter id, reason, and optional notes.
    - [ ] Support reasons like spam, harassment, impersonation, and other.
  - [ ] Add a moderation queue for reviewing reports.
    - [ ] List reports with status, target, reporter, reason, and timestamps.
    - [ ] Support reviewed, ignored, and actioned states.
    - [ ] Allow hiding/removing content and applying temporary account restrictions.
  - [ ] Add basic safety telemetry and audit history.
    - [ ] Track repeated abuse reports per user and target.
    - [ ] Store moderation actions and reviewer notes.
    - [ ] Surface obvious abuse trends in logs or admin tooling.
- [ ] Verify private profile and private query access controls with integration tests
  - [ ] Cover private trainer profile visibility for logged-out and unauthorized users.
  - [ ] Cover private query access from discover, detail, and direct-link routes.
  - [ ] Assert that unauthorized users get clear fallback states instead of partial data.

## P1 - Reliability and Quality

- [ ] Add frontend tests for discover filters/search URL sync and share-link restore
  - [ ] Test that filter changes update the URL and survive reloads.
  - [ ] Test that shared discover links restore the expected search state.
  - [ ] Cover empty, loading, and invalid-query cases.
- [ ] Add frontend tests for follow/favorite/query CRUD user flows
  - [ ] Cover create/edit/delete query flows from the owner experience.
  - [ ] Cover follow/unfollow and favorite/unfavorite state transitions.
  - [ ] Assert success, error, and undo toast behavior where applicable.
- [ ] Add backend tests for notifications and profile/account endpoints
  - [ ] Cover notification read/unread and mark-all-read endpoints.
  - [ ] Cover profile update, privacy, and account deactivation flows.
  - [ ] Cover authorization failures and missing-trainer fallback responses.
- [ ] Add seed data strategy for local and staging demo environments
  - [ ] Define a repeatable local seed set for core user, query, and notification data.
  - [ ] Define a smaller staging/demo seed that is safe for public environments.
  - [ ] Document how to refresh or reset seeds during development.
- [ ] Add structured error logging and request tracing for production debugging
  - [x] Include request ids in API responses and logs.
  - [x] Log route, user context, and failure category for server errors.
  - [x] Make sure sensitive payloads are redacted from logs.

## P1 - Product Polish

- [x] Add onboarding empty states for first-time users
- [x] Add success/error toast consistency across all mutations
- [ ] Add accessible labels, keyboard flows, and focus states to all critical UI
  - [ ] Audit all primary actions for visible labels and aria attributes.
  - [ ] Verify keyboard navigation for menus, dialogs, drawers, and forms.
  - [ ] Add or tighten focus states on interactive controls and page sections.
- [x] Add responsive QA pass for mobile discover/profile/settings pages
- [x] Add theme / colors / allow user to select theme

## P1 - Launch Operations

- [ ] Finalize environment configuration docs (frontend + backend)
  - [ ] Document required environment variables for frontend and backend.
  - [ ] Add sample `.env` files or templates for local setup.
  - [ ] Note which values are required in staging and production.
- [ ] Add deployment checklist and rollback instructions
  - [ ] Write a step-by-step release checklist for frontend and backend deploys.
  - [ ] Include verification steps after deploy.
  - [ ] Document rollback triggers and the rollback process.
- [ ] Add privacy policy/terms/community guidelines links in app footer
  - [ ] Decide the link destinations and hosting location.
  - [ ] Add the links to the shared footer component.
  - [ ] Verify footer spacing and wrapping on mobile.
- [ ] Add basic analytics for activation and retention funnels
  - [ ] Define the key activation events to track.
  - [ ] Define the retention events and weekly usage signals.
  - [ ] Confirm the analytics provider, naming, and privacy constraints.
- [ ] Create community announcement post and issue template for feedback
  - [ ] Draft the launch announcement copy.
  - [ ] Create a feedback/bug issue template with structured prompts.
  - [ ] Link both from the repo/docs so they are easy to find.
