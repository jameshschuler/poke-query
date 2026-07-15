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

  it("enforces max 10 guest favorites while keeping duplicate favorite idempotent", async () => {
    const guestCookie = { pq_guest_id: "guest-limit-test" };
    const createdIds: string[] = [];

    for (let i = 0; i < 11; i += 1) {
      const [row] = await app.db
        .insert(searchQueries)
        .values({
          creatorId: TEST_USER_ID,
          title: `Guest Favorite ${i}`,
          query: `cp-${100 + i}`,
          description: "guest favorites cap test",
          isPublic: true,
        })
        .returning({ id: searchQueries.id });

      expect(row?.id).toBeTypeOf("string");
      createdIds.push(row.id);
    }

    for (let i = 0; i < 10; i += 1) {
      const favoriteRes = await app.inject({
        method: "POST",
        url: `/api/v1/queries/guest/favorites/${createdIds[i]}`,
        cookies: guestCookie,
      });

      expect(favoriteRes.statusCode).toBe(204);
    }

    const duplicateRes = await app.inject({
      method: "POST",
      url: `/api/v1/queries/guest/favorites/${createdIds[0]}`,
      cookies: guestCookie,
    });
    expect(duplicateRes.statusCode).toBe(204);

    const limitRes = await app.inject({
      method: "POST",
      url: `/api/v1/queries/guest/favorites/${createdIds[10]}`,
      cookies: guestCookie,
    });

    expect(limitRes.statusCode).toBe(409);
    expect(limitRes.json()).toEqual({
      error: "Guest favorites are limited to 10",
      maxFavorites: 10,
    });

    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/queries/guest/favorites",
      cookies: guestCookie,
    });

    expect(listRes.statusCode).toBe(200);
    const listBody: {
      favoriteQueryIds: string[];
      favoritesCount: number;
      maxFavorites: number;
    } = listRes.json();
    expect(listBody.favoritesCount).toBe(10);
    expect(listBody.maxFavorites).toBe(10);
    expect(listBody.favoriteQueryIds).toContain(createdIds[0]);
    expect(listBody.favoriteQueryIds).not.toContain(createdIds[10]);
  });

  it("returns public query tags for frontend filtering", async () => {
    const publicRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: "Tag Source Public",
        query: "cp-1500",
        description: "public query with tags",
        isPublic: true,
        tags: ["raid", "daily-catch"],
      },
    });

    expect(publicRes.statusCode).toBe(201);

    const privateRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: "Tag Source Private",
        query: "cp-500",
        description: "private query with tags",
        isPublic: false,
        tags: ["private-only"],
      },
    });

    expect(privateRes.statusCode).toBe(201);

    const tagsRes = await app.inject({
      method: "GET",
      url: "/api/v1/queries/tags",
    });

    expect(tagsRes.statusCode).toBe(200);

    const body: { tags: Array<{ name: string; queryCount: number }> } = tagsRes.json();

    const names = body.tags.map((tag) => tag.name);

    expect(names).toContain("raid");
    expect(names).toContain("daily-catch");
    expect(names).not.toContain("private-only");
    expect(body.tags.find((tag) => tag.name === "raid")?.queryCount).toBeGreaterThan(0);
  });

  it("returns a valid source for newly created forks in /users/me/forks", async () => {
    const createOriginalRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "owner-token" },
      payload: {
        title: "Fork Source Integrity",
        query: "type:dragon&4*",
        description: "source for forks list",
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

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const myForksRes = await app.inject({
      method: "GET",
      url: "/api/v1/users/me/forks",
      cookies: { "sb-access-token": "other-user-token" },
    });

    expect(myForksRes.statusCode).toBe(200);

    const body: {
      forks: Array<{
        id: string;
        parentQueryId: string | null;
        syncStatus: "up-to-date" | "behind" | "orphaned";
        sourceQuery: { id: string; title: string; query: string } | null;
      }>;
    } = myForksRes.json();

    const createdFork = body.forks.find((fork) => fork.id === forkId);

    expect(createdFork).toBeTruthy();
    expect(createdFork?.parentQueryId).toBe(originalId);
    expect(createdFork?.syncStatus).toBe("up-to-date");
    expect(createdFork?.sourceQuery).toBeTruthy();
    expect(createdFork?.sourceQuery?.id).toBe(originalId);
  });
});
