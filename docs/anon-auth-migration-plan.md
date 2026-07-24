# Anonymous Auth Migration Plan

Move from email OTP as the required primary auth to Supabase anonymous auth by default, with email OTP as an optional account upgrade.

## Current State

- OTP is the primary sign-in UX (`frontend/src/routes/login.tsx`).
- Frontend auth context is Supabase-client based (`frontend/src/lib/auth-context.tsx`).
- Protected route gating depends on API `/me` (`frontend/src/lib/route-auth.ts`).
- Backend OTP endpoints exist (`backend/src/modules/auth/auth.routes.ts`).
- Trainer records are tightly mapped to auth users via FK/unique (`backend/src/db/schema.ts`).

## Key Constraint

The schema strongly favors a single auth user id per trainer. The critical path is to keep the **same Supabase user id** when upgrading from anonymous to email. Any plan that creates a second user id and merges data should be avoided unless identity linking is impossible in the running Supabase version.

## Strategy

1. Default every new session to Supabase anonymous auth.
2. Auto-provision a trainer profile for anonymous users on first authenticated backend call.
3. Add an explicit "Upgrade account with email OTP" flow from Account settings.
4. Repurpose the existing OTP login route:
   - Signed-out: sign in via OTP for returning email users.
   - Signed-in anonymous: perform account upgrade (link/attach email), not account switch.

---

## Existing Email OTP Users

**No data migration required.** Existing users already have a Supabase auth user with email attached and a corresponding trainer row. They continue to sign in via OTP at `/login` exactly as today.

However, the Phase 2 session-boot logic introduces a subtle problem: if `signInAnonymously()` is called eagerly on every page load when no session is present, an existing user who visits after their session expires gets a **new anonymous user created** before they can sign in. When their OTP verification succeeds, Supabase swaps the session to their real account — but an orphaned anonymous user (and potentially an orphaned trainer row) is left behind.

**Three mitigations required:**

1. **Use lazy anonymous session creation, not eager.** Only call `signInAnonymously()` when the user takes an action that requires auth (e.g. saving a query, following someone). Do not call it on app init. Visitors and returning email users must never receive an unsolicited anonymous user creation.
2. **Detect OTP sign-in and skip anonymous trainer bootstrapping.** When `onAuthStateChange` fires a `SIGNED_IN` event for an email-attached user, the backend should check whether any anonymous trainer was provisioned for the previous session and skip or void it.
3. **Orphan cleanup job.** Add a backend cron or Supabase Edge Function that deletes anonymous `auth.users` rows (and their trainer rows) with no meaningful activity after a configurable TTL (e.g. 7 days).

---

## Phase 0 — Confirm Supabase Identity Linking (spike)

**Goal:** prove same-user-id upgrade is possible before committing to the full plan.

1. Verify whether anonymous → email OTP can be linked on the **same user id** in the current Supabase version.
2. If supported directly, use that path.
3. If not directly supported, implement a backend-assisted upgrade with strict identity continuity, or defer until continuity is proven.

**Exit criteria:** trainer FK integrity is preserved and user id does not fork on upgrade.

---

## Phase 1 — Backend Foundation for Anonymous-First

**Goal:** backend accepts anonymous authenticated users exactly like regular users.

1. Add/update a reusable trainer bootstrap function:
   - On any authenticated request, ensure a trainer row exists for `request.user.id`.
2. Use this bootstrap in auth-related paths and `/me` (`backend/src/modules/users/users.routes.ts`).
3. Keep role default as `member` for anonymous users.
4. Keep existing cookie/bearer handling (`backend/src/plugins/auth.ts`).

**Optional new endpoints** (if you want server-issued cookie alignment):

- `POST /api/v1/auth/upgrade/email/request`
- `POST /api/v1/auth/upgrade/email/verify`

If the frontend uses Supabase tokens directly (current pattern), these can be thin wrappers or omitted in favour of client-side Supabase calls.

---

## Phase 2 — Frontend Anonymous-by-Default Session Boot

**Goal:** users enter the app without email friction.

1. In `frontend/src/lib/auth-context.tsx`:
   - **Do not call `signInAnonymously()` eagerly on init.** Expose a `startAnonymousSession()` helper instead.
   - Call `startAnonymousSession()` lazily at the point the user first takes an action requiring auth.
   - Maintain the same `onAuthStateChange` behaviour; on `SIGNED_IN` for an email-attached user, clear any in-flight anonymous session reference.
2. In `frontend/src/lib/route-auth.ts`:
   - Keep `requireAuthenticated` logic; trigger `startAnonymousSession()` there rather than redirecting to `/login`.
   - Expected result: far fewer redirects to `/login` because anonymous users are authenticated.
3. In landing/discover/dashboard, remove forced dependency on `/login` for initial use.

---

## Phase 3 — Optional Email Upgrade UX

**Goal:** "add email later" from Account, not required up front.

1. Add a new section in `frontend/src/routes/account.tsx`:
   - "Secure your account with email OTP"
   - Request OTP step
   - Verify OTP step
2. Preserve session continuity: no sign-out, no trainer record change, same `me.id` before and after.
3. Keep `frontend/src/routes/login.tsx` for returning users and as a fallback.

**UX copy:**

- Anonymous mode: _"Start now, add email later."_
- Upgrade prompt: _"Attach an email to recover this account across devices."_

---

## Phase 4 — Policy: What Anonymous Users Can Do

**Goal:** decide feature access for anonymous sessions before launch.

Choose one stance:

| Stance      | Access                                                                           | Trade-off                             |
| ----------- | -------------------------------------------------------------------------------- | ------------------------------------- |
| Full rights | Create, edit, publish                                                            | Fastest onboarding; higher abuse risk |
| Soft limits | Publish disabled until email upgrade; tighter rate limits; moderation restricted | Lower abuse risk; slight friction     |

Implement access checks primarily in **backend route handlers** by user identity class, not only in the frontend.

---

## Phase 5 — Telemetry, Safety, and Rollout

**Goal:** ship safely behind feature flags.

**Feature flags:**

- `AUTH_ANON_DEFAULT_ENABLED`
- `AUTH_EMAIL_UPGRADE_ENABLED`

**Metrics to track:**

- Anonymous session starts
- Upgrade request rate
- Upgrade success rate
- Publish/fork/favorite conversion by auth type

**Rollout order:** internal → small cohort → full.

**Fallback:** revert to OTP-first UI while keeping existing anonymous sessions valid.

---

## Phase 6 — Testing Plan

**Backend integration:**

- Anonymous user hits `/me` → trainer auto-created.
- Anonymous user can create a query (if Phase 4 allows it).
- Upgrade flow preserves trainer id / user id continuity.

**Frontend:**

- Fresh user lands authenticated anonymously.
- Protected routes no longer bounce to `/login` unnecessarily.
- Account upgrade form: success and failure paths.

**Regression:**

- Existing OTP sign-in still works for returning email users.

---

## Suggested Implementation Order

1. Backend trainer bootstrap + tests (Phase 1)
2. Frontend auth-context anonymous start (Phase 2)
3. Route-auth behaviour validation (Phase 2)
4. Account upgrade UI/API (Phase 3)
5. Feature flag rollout + telemetry (Phase 5)

---

## Risks

| Risk                                                   | Mitigation                                                                 |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| Identity linking semantics in current Supabase version | Phase 0 spike required before committing                                   |
| Accidental account switch during upgrade               | Guard upgrade call behind "already signed in" check; never sign out first  |
| Abuse increase if anonymous publish is fully open      | Phase 4 policy decision; prefer soft limits initially                      |
| Device loss for anonymous-only users                   | Surface upgrade prompt early and prominently                               |
| Orphaned anonymous users from eager session init       | Lazy `signInAnonymously()` + TTL-based cleanup job                         |
| Returning email user gets anonymous user on app load   | Never call `signInAnonymously()` on init; only call lazily on first action |
