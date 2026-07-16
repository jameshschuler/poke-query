# Community Launch TODOs

## MVP Release Priority (Ranked)

1. Launch infrastructure readiness: see Dashboard and Launch Operations sections.
2. Community abuse controls: see Security, Trust, and Data Safety.
3. Guest onboarding path quality: see Dashboard section.
4. Core reliability regression protection: see Reliability and Quality section.
5. Critical accessibility compliance: see Product Polish section.
6. Security posture verification: see Dashboard (OWASP item) and Security section.

## MVP Execution Plan

### Week 1 - Launch Blockers

- Workstream: Deployment and rollback readiness.
  - Source of truth: Dashboard and Launch Operations sections below.
- Workstream: Guest journey quality.
  - Source of truth: Dashboard section.

### Week 2 - Stability and Trust Hardening

- Workstream: Abuse protections and moderation flows.
  - Source of truth: Security, Trust, and Data Safety section.
- Workstream: Automated regression coverage.
  - Source of truth: Reliability and Quality section and Dashboard E2E item.
- Workstream: Accessibility and security hardening.
  - Source of truth: Product Polish and Dashboard OWASP item.

## Launch Week Focus (Ranked Open Items)

1. Verify deployment environment variables and domains for frontend, backend, and docs.
2. Complete mobile QA pass on discover/account/library/forks/favorites and ship fixes.
3. Run OWASP top-10 review for auth/session handling, access control, validation, and data exposure.
4. Fix user details flash between page loads (auth/profile hydration timing).
5. Add privacy policy/terms/community guideline links in app footer.
6. Publish launch announcement draft and feedback issue template.
7. Identify top scalability bottlenecks for query/favorite/notification traffic.
8. Add minimal Playwright smoke coverage for login and core discover/library flows.

## Post-Launch Backlog (Open Items)

- Collections feature: CRUD collections, manage included strings, and public sharing/social actions.
- Abuse protections and moderation flow (reporting, queue, telemetry, reviewer actions).
- Full E2E suite expansion across all major flows.
- MCP server implementation and documentation.
- Trainer profile screenshot upload + parsing flow.
- PWA install/offline support.
- Analytics for activation/retention funnels.
- Broader frontend/backend regression test expansion.
- Seed strategy formalization for local/staging refresh workflows.

## Open Detailed Backlog

### 1) Dashboard

- [ ] Deploy FE, BE, and docs site
  - [ ] Verify environment variables and domains for each deployment target.
  - [ ] Map QA backend custom domain (`api.pokequery.app`) to Render service and verify DNS + TLS issuance.
  - [ ] Update QA frontend `VITE_API_BASE_URL` to `https://api.pokequery.app` after domain verification.
- [ ] Scalability and logging
  - [ ] Identify the main bottlenecks for query/favorite/notification traffic.
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
- [ ] User details flash between page loads
  - [ ] Avoid showing stale cached identity/profile data during route transitions.
  - [ ] Keep placeholders/skeletons visible until fresh data is ready.
  - [ ] Audit auth/user cache hydration for remount timing issues.

### 2) Collections

- [ ] Add collection CRUD for authenticated users
  - [ ] Create collection flow (title, optional description, visibility).
  - [ ] Edit collection metadata and visibility.
  - [ ] Delete collection with confirmation and safe fallback navigation.
- [ ] Add/remove strings inside collections
  - [ ] Add existing query strings to one or more collections.
  - [ ] Remove strings from collections from both collection and string surfaces.
  - [ ] Keep collection item counts and ordering in sync after mutations.
- [ ] Support public/published collections for sharing and discovery
  - [ ] Add public collection detail page and shareable link behavior.
  - [ ] Restrict private collections to owners and authorized views.
  - [ ] Show clear public/private states in collection cards and detail pages.
- [ ] Add social actions on public collections
  - [ ] Allow other users to favorite public collections.
  - [ ] Allow other users to fork public collections.
  - [ ] Prevent owner-only edge cases (self-fork behavior, private source constraints).
- [ ] Add collection integration coverage
  - [ ] Backend tests for permissions, visibility, and favorite/fork behavior.
  - [ ] Frontend tests for CRUD, add/remove string flows, and optimistic states.
  - [ ] E2E smoke path for creating, sharing, and interacting with a public collection.

## P0 - Security, Trust, and Data Safety

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

## P1 - Product Polish

- [ ] Add accessible labels, keyboard flows, and focus states to all critical UI
  - [ ] Audit all primary actions for visible labels and aria attributes.
  - [ ] Verify keyboard navigation for menus, dialogs, drawers, and forms.
  - [ ] Add or tighten focus states on interactive controls and page sections.

## P1 - Launch Operations

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

## Completed Archive

### Shipped Platform Features

- [x] Manage/CRUD Queries
- [x] Manage/CRUD Forked Queries
- [x] Manage Favorites
- [x] Manage Account/Profile
- [x] Manage Notifications
- [x] Dashboard recent activity

### Security and Policy Completed

- [x] Add RLS policies for all multi-tenant tables (trainers, queries, favorites, followers, guest_favorites, etc.)
- [x] Add profanity/bad-words validation for usernames, titles, descriptions
- [x] Add rate limiting for auth, follow, favorite, query create/update endpoints
- [x] Verify private profile and private query access controls with integration tests

### Reliability and Ops Completed

- [x] Add structured request/error logging with request ids and redaction
- [x] Finalize environment configuration docs (frontend + backend)
- [x] Add deployment checklist and rollback instructions

### Product and UX Completed

- [x] Add onboarding empty states for first-time users
- [x] Add success/error toast consistency across all mutations
- [x] Add responsive QA pass for mobile discover/profile/settings pages
- [x] Add theme / colors / allow user to select theme
- [x] Add contributing guide
- [x] Add more vertical spacing between UI components
- [x] Ensure guest access works well (discover, guest favorites, guest-to-auth transition)
