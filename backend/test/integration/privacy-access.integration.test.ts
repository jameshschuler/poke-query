import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, or } from "drizzle-orm";

import { buildApp } from "../../src/app.js";
import { searchQueries, trainers } from "../../src/db/schema.js";
import { OTHER_TEST_USER_ID, TEST_USER_ID } from "./setup.js";
import { supabase } from "../../src/lib/supabase.js";

const OTHER_USER_ID = OTHER_TEST_USER_ID;
const hasIntegrationUsers = Boolean(
  process.env.INTEGRATION_TEST_USER_ID && process.env.INTEGRATION_TEST_OTHER_USER_ID,
);
const integrationDescribe = hasIntegrationUsers ? describe : describe.skip;

integrationDescribe("Privacy Access Controls Integration", () => {
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
        trainerCode: "1234 5678 9012",
        isProfilePublic: true,
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
        trainerCode: "9876 5432 1098",
        isProfilePublic: true,
      })
      .onConflictDoNothing();
  });

  beforeEach(async () => {
    await app.db
      .delete(searchQueries)
      .where(
        or(eq(searchQueries.creatorId, TEST_USER_ID), eq(searchQueries.creatorId, OTHER_USER_ID)),
      );

    await app.db
      .update(trainers)
      .set({
        isProfilePublic: true,
        team: "mystic",
        level: 25,
        trainerCode: "1234 5678 9012",
        visibleUsername: "pokequery",
      })
      .where(eq(trainers.id, TEST_USER_ID));

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: "integration@example.com" } },
      error: null,
    });
  });

  afterAll(async () => {
    await app.db
      .delete(searchQueries)
      .where(
        or(eq(searchQueries.creatorId, TEST_USER_ID), eq(searchQueries.creatorId, OTHER_USER_ID)),
      );

    await app.close();
  });

  it("hides private trainer fields for logged-out and other authenticated users", async () => {
    await app.db
      .update(trainers)
      .set({
        isProfilePublic: false,
        team: "mystic",
        level: 49,
        trainerCode: "1111 2222 3333",
      })
      .where(eq(trainers.id, TEST_USER_ID));

    const publicProfileRes = await app.inject({
      method: "GET",
      url: `/api/v1/users/${TEST_USER_ID}`,
    });

    expect(publicProfileRes.statusCode).toBe(200);
    expect(publicProfileRes.json()).toMatchObject({
      id: TEST_USER_ID,
      team: null,
      level: null,
      trainerCode: null,
    });

    const byUsernameRes = await app.inject({
      method: "GET",
      url: "/api/v1/users/by-username/integration_trainer",
    });

    expect(byUsernameRes.statusCode).toBe(200);
    expect(byUsernameRes.json()).toMatchObject({
      id: TEST_USER_ID,
      isProfilePublic: false,
      team: null,
      level: null,
      trainerCode: null,
    });

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const otherUserRes = await app.inject({
      method: "GET",
      url: `/api/v1/users/${TEST_USER_ID}`,
      cookies: { "sb-access-token": "other-user-token" },
    });

    expect(otherUserRes.statusCode).toBe(200);
    expect(otherUserRes.json()).toMatchObject({
      id: TEST_USER_ID,
      team: null,
      level: null,
      trainerCode: null,
    });
  });

  it("keeps private queries out of discover and trainer lists and returns clear 404 on direct access", async () => {
    const searchKey = `privacy-${Date.now()}`;

    const publicCreateRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "owner-token" },
      payload: {
        title: `${searchKey} public`,
        query: "cp1000-1500",
        description: "public visibility record",
        isPublic: true,
      },
    });

    const privateCreateRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "owner-token" },
      payload: {
        title: `${searchKey} private`,
        query: "cp1500+",
        description: "private visibility record",
        isPublic: false,
      },
    });

    expect(publicCreateRes.statusCode).toBe(201);
    expect(privateCreateRes.statusCode).toBe(201);

    const publicId = publicCreateRes.json().id as string;
    const privateId = privateCreateRes.json().id as string;

    const discoverRes = await app.inject({
      method: "GET",
      url: `/api/v1/community?search=${encodeURIComponent(searchKey)}`,
    });

    expect(discoverRes.statusCode).toBe(200);
    const discoverItems: Array<{ id: string }> = discoverRes.json().items;
    const discoverIds = discoverItems.map((item) => item.id);

    expect(discoverIds).toContain(publicId);
    expect(discoverIds).not.toContain(privateId);

    const privateDetailRes = await app.inject({
      method: "GET",
      url: `/api/v1/queries/${privateId}`,
    });

    expect(privateDetailRes.statusCode).toBe(404);
    expect(privateDetailRes.json()).toEqual({ error: "Query not found" });

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const privateDetailAuthedRes = await app.inject({
      method: "GET",
      url: `/api/v1/queries/${privateId}`,
      cookies: { "sb-access-token": "other-user-token" },
    });

    expect(privateDetailAuthedRes.statusCode).toBe(404);
    expect(privateDetailAuthedRes.json()).toEqual({ error: "Query not found" });

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const forkPrivateRes = await app.inject({
      method: "POST",
      url: `/api/v1/queries/${privateId}/fork`,
      cookies: { "sb-access-token": "other-user-token" },
      payload: {},
    });

    expect(forkPrivateRes.statusCode).toBe(404);
    expect(forkPrivateRes.json()).toEqual({
      error: "Original query not found or private",
    });
  });

  it("returns clear fallback for missing trainers instead of partial profile data", async () => {
    const missingTrainerId = "33333333-3333-4333-8333-333333333333";

    const profileRes = await app.inject({
      method: "GET",
      url: `/api/v1/users/${missingTrainerId}`,
    });
    expect(profileRes.statusCode).toBe(404);
    expect(profileRes.json()).toEqual({ error: "Trainer not found" });

    const stringsRes = await app.inject({
      method: "GET",
      url: `/api/v1/users/${missingTrainerId}/strings`,
    });
    expect(stringsRes.statusCode).toBe(404);
    expect(stringsRes.json()).toEqual({ error: "Trainer not found" });

    const forksRes = await app.inject({
      method: "GET",
      url: `/api/v1/users/${missingTrainerId}/forks`,
    });
    expect(forksRes.statusCode).toBe(404);
    expect(forksRes.json()).toEqual({ error: "Trainer not found" });

    const favoritesRes = await app.inject({
      method: "GET",
      url: `/api/v1/users/${missingTrainerId}/favorites`,
    });
    expect(favoritesRes.statusCode).toBe(404);
    expect(favoritesRes.json()).toEqual({ error: "Trainer not found" });
  });
});
