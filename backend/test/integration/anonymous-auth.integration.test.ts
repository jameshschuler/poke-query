import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { buildApp } from "../../src/app.js";
import { followers, searchQueries, trainers } from "../../src/db/schema.js";
import { getBootstrapTrainerUsername } from "../../src/lib/trainer-bootstrap.js";
import { OTHER_TEST_USER_ID, TEST_USER_ID } from "./setup.js";
import { supabase } from "../../src/lib/supabase.js";

/** Stable UUID representing an anonymous guest (no email). */
const ANON_USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const hasIntegrationUsers = Boolean(
  process.env.INTEGRATION_TEST_USER_ID && process.env.INTEGRATION_TEST_OTHER_USER_ID,
);
const integrationDescribe = hasIntegrationUsers ? describe : describe.skip;

integrationDescribe("Anonymous Auth Integration", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();

    // Seed a named trainer used in follow tests.
    await app.db
      .insert(trainers)
      .values({
        id: TEST_USER_ID,
        userId: TEST_USER_ID,
        username: "integration_trainer",
        level: 25,
        team: "mystic",
      })
      .onConflictDoNothing();
  });

  beforeEach(async () => {
    // Remove any trainer row the anonymous user might have created.
    await app.db.delete(trainers).where(eq(trainers.userId, ANON_USER_ID));
    await app.db.delete(searchQueries).where(eq(searchQueries.creatorId, ANON_USER_ID));
    await app.db.delete(followers).where(eq(followers.followerId, ANON_USER_ID));
  });

  afterAll(async () => {
    await app.db.delete(trainers).where(eq(trainers.userId, ANON_USER_ID));
    await app.db.delete(searchQueries).where(eq(searchQueries.creatorId, ANON_USER_ID));
    await app.db.delete(followers).where(eq(followers.followerId, ANON_USER_ID));

    await app.db.delete(searchQueries).where(eq(searchQueries.creatorId, TEST_USER_ID));
    await app.db.delete(trainers).where(eq(trainers.userId, TEST_USER_ID));

    await app.close();
  });

  // ─── /me auto-bootstrap ────────────────────────────────────────────────────

  it("GET /me auto-creates a trainer row for an anonymous user", async () => {
    // Mock Supabase returning an anonymous session (no email).
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: ANON_USER_ID, email: null } },
      error: null,
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      cookies: { "sb-access-token": "anon-token" },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.hasTrainer).toBe(true);
    expect(body.profileCompleted).toBe(false);
    expect(body.username).toBe(getBootstrapTrainerUsername(ANON_USER_ID));

    // Trainer row must exist in the database.
    const row = await app.db.query.trainers.findFirst({
      where: eq(trainers.userId, ANON_USER_ID),
    });

    expect(row).toBeTruthy();
    expect(row?.id).toBe(ANON_USER_ID);
    expect(row?.username).toBe(getBootstrapTrainerUsername(ANON_USER_ID));
  });

  it("GET /me is idempotent — repeated calls do not duplicate the trainer row", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: ANON_USER_ID, email: null } },
      error: null,
    });

    await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      cookies: { "sb-access-token": "anon-token" },
    });

    await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      cookies: { "sb-access-token": "anon-token" },
    });

    const rows = await app.db.query.trainers.findMany({
      where: eq(trainers.userId, ANON_USER_ID),
    });

    expect(rows.length).toBe(1);
  });

  // ─── Anonymous → email upgrade continuity ─────────────────────────────────

  it("upgrading an anonymous session to email preserves the same trainer row", async () => {
    // Step 1: anonymous session creates a trainer row via /me.
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: ANON_USER_ID, email: null } },
      error: null,
    });

    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      cookies: { "sb-access-token": "anon-token" },
    });

    expect(meRes.statusCode).toBe(200);

    const rowBefore = await app.db.query.trainers.findFirst({
      where: eq(trainers.userId, ANON_USER_ID),
    });

    expect(rowBefore).toBeTruthy();
    const trainerIdBefore = rowBefore!.id;

    // Step 2: simulate Supabase upgrading the session in-place (same UUID, now
    //         has an email attached).
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: ANON_USER_ID, email: "upgraded@example.com" } },
      error: null,
    });

    const meResAfter = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      cookies: { "sb-access-token": "upgraded-token" },
    });

    expect(meResAfter.statusCode).toBe(200);

    const rowAfter = await app.db.query.trainers.findFirst({
      where: eq(trainers.userId, ANON_USER_ID),
    });

    // Exactly one trainer row — same ID — no duplication.
    expect(rowAfter).toBeTruthy();
    expect(rowAfter!.id).toBe(trainerIdBefore);

    const allRows = await app.db.query.trainers.findMany({
      where: eq(trainers.userId, ANON_USER_ID),
    });

    expect(allRows.length).toBe(1);
  });

  it("queries created while anonymous are still owned after email upgrade", async () => {
    // Step 1: anonymous user creates a query.
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: ANON_USER_ID, email: null } },
      error: null,
    });

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "anon-token" },
      payload: {
        title: "Anonymous query",
        query: "4*&cp-1500",
        description: "created before upgrade",
        isPublic: false,
      },
    });

    expect(createRes.statusCode).toBe(201);
    const { id: queryId } = createRes.json();

    // Step 2: same user ID, now with email (upgrade).
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: ANON_USER_ID, email: "upgraded@example.com" } },
      error: null,
    });

    const queryRes = await app.inject({
      method: "GET",
      url: `/api/v1/queries/${queryId}`,
      cookies: { "sb-access-token": "upgraded-token" },
    });

    expect(queryRes.statusCode).toBe(200);
    expect(queryRes.json().creatorId).toBe(ANON_USER_ID);
  });

  it("queries remain visible in /users/me/queries after anonymous upgrade and reload", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: ANON_USER_ID, email: null } },
      error: null,
    });

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "anon-token" },
      payload: {
        title: "Anonymous dashboard continuity",
        query: "3*&cp-2500",
        description: "should still be in me/queries after upgrade",
        isPublic: false,
      },
    });

    expect(createRes.statusCode).toBe(201);
    const { id: queryId } = createRes.json();

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: ANON_USER_ID, email: "upgraded@example.com" } },
      error: null,
    });

    const meQueriesRes = await app.inject({
      method: "GET",
      url: "/api/v1/users/me/queries",
      cookies: { "sb-access-token": "upgraded-token" },
    });

    expect(meQueriesRes.statusCode).toBe(200);
    const body = meQueriesRes.json() as { queries: Array<{ id: string }> };
    expect(body.queries.some((query) => query.id === queryId)).toBe(true);
  });

  // ─── Follow bootstrap ──────────────────────────────────────────────────────

  it("anonymous user can follow another trainer (bootstrap on first mutation)", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: ANON_USER_ID, email: null } },
      error: null,
    });

    const followRes = await app.inject({
      method: "POST",
      url: `/api/v1/users/${TEST_USER_ID}/follow`,
      cookies: { "sb-access-token": "anon-token" },
    });

    expect(followRes.statusCode).toBe(200);

    // Trainer row was bootstrapped.
    const row = await app.db.query.trainers.findFirst({
      where: eq(trainers.userId, ANON_USER_ID),
    });

    expect(row).toBeTruthy();

    // Follow relationship persisted.
    const followRow = await app.db.query.followers.findFirst({
      where: (f, { and, eq }) =>
        and(eq(f.followerId, ANON_USER_ID), eq(f.followedId, TEST_USER_ID)),
    });

    expect(followRow).toBeTruthy();
  });
});
