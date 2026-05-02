import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { favorites, searchQueries, trainers } from "../../src/db/schema.js";
import { and, eq } from "drizzle-orm";
import { OTHER_TEST_USER_ID, TEST_USER_ID } from "./setup.js";
import { supabase } from "../../src/lib/supabase.js";

const OTHER_USER_ID = OTHER_TEST_USER_ID;
const hasIntegrationUsers = Boolean(
  process.env.INTEGRATION_TEST_USER_ID && process.env.INTEGRATION_TEST_OTHER_USER_ID,
);
const integrationDescribe = hasIntegrationUsers ? describe : describe.skip;

integrationDescribe("Queries CRUD Integration", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();

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

    await app.db
      .insert(trainers)
      .values({
        id: OTHER_USER_ID,
        userId: OTHER_USER_ID,
        username: "integration_other",
        level: 30,
        team: "valor",
      })
      .onConflictDoNothing();
  });

  beforeEach(async () => {
    await app.db.delete(searchQueries).where(eq(searchQueries.creatorId, TEST_USER_ID));
    await app.db.delete(searchQueries).where(eq(searchQueries.creatorId, OTHER_USER_ID));

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: "integration@example.com" } },
      error: null,
    });
  });

  afterAll(async () => {
    await app.db.delete(searchQueries).where(eq(searchQueries.creatorId, TEST_USER_ID));
    await app.db.delete(searchQueries).where(eq(searchQueries.creatorId, OTHER_USER_ID));
    await app.close();
  });

  it("creates, updates, and deletes a query in the database", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: "Integration PvP",
        query: "4*&cp-1500",
        description: "created in integration test",
        isPublic: false,
      },
    });

    expect(createRes.statusCode).toBe(201);
    const { id } = createRes.json();
    expect(id).toBeTypeOf("string");

    const created = await app.db.query.searchQueries.findFirst({
      where: eq(searchQueries.id, id),
    });

    expect(created).toBeTruthy();
    expect(created?.title).toBe("Integration PvP");
    expect(created?.creatorId).toBe(TEST_USER_ID);

    const updateRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/queries/${id}`,
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: "Integration Updated",
        query: "3*&cp-2500",
        description: "updated in integration test",
        isPublic: true,
      },
    });

    expect(updateRes.statusCode).toBe(200);

    const updated = await app.db.query.searchQueries.findFirst({
      where: eq(searchQueries.id, id),
    });

    expect(updated?.title).toBe("Integration Updated");
    expect(updated?.isPublic).toBe(true);

    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/queries/${id}`,
      cookies: { "sb-access-token": "integration-token" },
    });

    expect(deleteRes.statusCode).toBe(204);

    const deleted = await app.db.query.searchQueries.findFirst({
      where: eq(searchQueries.id, id),
    });

    expect(deleted).toBeUndefined();
  });

  it("blocks update and delete when another authenticated user is not the owner", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "owner-token" },
      payload: {
        title: "Owner Only Query",
        query: "cp-500",
        description: "owner record",
        isPublic: false,
      },
    });

    expect(createRes.statusCode).toBe(201);
    const { id } = createRes.json();

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const updateRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/queries/${id}`,
      cookies: { "sb-access-token": "other-user-token" },
      payload: {
        title: "Hacked",
        query: "cp-10",
        description: "should fail",
        isPublic: true,
      },
    });

    expect(updateRes.statusCode).toBe(404);

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/queries/${id}`,
      cookies: { "sb-access-token": "other-user-token" },
    });

    expect(deleteRes.statusCode).toBe(404);

    const row = await app.db.query.searchQueries.findFirst({
      where: eq(searchQueries.id, id),
    });

    expect(row).toBeTruthy();
    expect(row?.creatorId).toBe(TEST_USER_ID);
    expect(row?.title).toBe("Owner Only Query");
  });

  it("forks a public query and increments copy count", async () => {
    const createOriginalRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "owner-token" },
      payload: {
        title: "Public Original",
        query: "4*&cp-1500",
        description: "source query",
        isPublic: true,
      },
    });

    expect(createOriginalRes.statusCode).toBe(201);
    const { id: originalId } = createOriginalRes.json();

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const forkRes = await app.inject({
      method: "POST",
      url: `/api/v1/queries/${originalId}/fork`,
      cookies: { "sb-access-token": "other-user-token" },
      payload: {},
    });

    expect(forkRes.statusCode).toBe(201);
    const { id: forkId } = forkRes.json();

    const forked = await app.db.query.searchQueries.findFirst({
      where: eq(searchQueries.id, forkId),
    });

    expect(forked).toBeTruthy();
    expect(forked?.creatorId).toBe(OTHER_USER_ID);
    expect(forked?.parentQueryId).toBe(originalId);
    expect(forked?.isPublic).toBe(false);

    const copyRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/queries/${originalId}/copy`,
      payload: {},
    });

    expect(copyRes.statusCode).toBe(204);

    const copied = await app.db.query.searchQueries.findFirst({
      where: eq(searchQueries.id, originalId),
    });

    expect(copied).toBeTruthy();
    expect(copied?.copyCount).toBe(1);
  });

  it("favorites and unfavorites a public query", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "owner-token" },
      payload: {
        title: "Favoriteable Query",
        query: "4*&cp-1500",
        description: "for favorite integration test",
        isPublic: true,
      },
    });

    expect(createRes.statusCode).toBe(201);
    const { id: queryId } = createRes.json();

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const favoriteRes = await app.inject({
      method: "POST",
      url: `/api/v1/queries/${queryId}/favorite`,
      cookies: { "sb-access-token": "other-user-token" },
      payload: {},
    });

    expect(favoriteRes.statusCode).toBe(204);

    const [favoriteRow] = await app.db
      .select()
      .from(favorites)
      .where(and(eq(favorites.trainerId, OTHER_USER_ID), eq(favorites.queryId, queryId)));

    expect(favoriteRow).toBeTruthy();

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const unfavoriteRes = await app.inject({
      method: "POST",
      url: `/api/v1/queries/${queryId}/unfavorite`,
      cookies: { "sb-access-token": "other-user-token" },
      payload: {},
    });

    expect(unfavoriteRes.statusCode).toBe(204);

    const favoriteRowsAfter = await app.db
      .select()
      .from(favorites)
      .where(and(eq(favorites.trainerId, OTHER_USER_ID), eq(favorites.queryId, queryId)));

    expect(favoriteRowsAfter).toHaveLength(0);
  });
});
