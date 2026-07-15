import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, like, or } from "drizzle-orm";

import { buildApp } from "../../src/app.js";
import { favorites, guestFavorites, searchQueries, trainers } from "../../src/db/schema.js";
import { OTHER_TEST_USER_ID, TEST_USER_ID } from "./setup.js";
import { supabase } from "../../src/lib/supabase.js";

const OTHER_USER_ID = OTHER_TEST_USER_ID;
const hasIntegrationUsers = Boolean(
  process.env.INTEGRATION_TEST_USER_ID && process.env.INTEGRATION_TEST_OTHER_USER_ID,
);
const integrationDescribe = hasIntegrationUsers ? describe : describe.skip;

integrationDescribe("Guest Access Integration", () => {
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
    await app.db
      .delete(favorites)
      .where(or(eq(favorites.trainerId, TEST_USER_ID), eq(favorites.trainerId, OTHER_USER_ID)));

    await app.db.delete(guestFavorites).where(like(guestFavorites.guestId, "guest-qa-%"));

    await app.db
      .delete(searchQueries)
      .where(
        or(eq(searchQueries.creatorId, TEST_USER_ID), eq(searchQueries.creatorId, OTHER_USER_ID)),
      );

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: "integration@example.com" } },
      error: null,
    });
  });

  afterAll(async () => {
    await app.db.delete(guestFavorites).where(like(guestFavorites.guestId, "guest-qa-%"));
    await app.db
      .delete(favorites)
      .where(or(eq(favorites.trainerId, TEST_USER_ID), eq(favorites.trainerId, OTHER_USER_ID)));
    await app.db
      .delete(searchQueries)
      .where(
        or(eq(searchQueries.creatorId, TEST_USER_ID), eq(searchQueries.creatorId, OTHER_USER_ID)),
      );

    await app.close();
  });

  it("supports discover browsing without auth and excludes private queries", async () => {
    const searchKey = `guest-discover-${Date.now()}`;

    const [publicQuery] = await app.db
      .insert(searchQueries)
      .values({
        creatorId: TEST_USER_ID,
        title: `${searchKey} public`,
        query: "cp-1500",
        description: "public discover record",
        isPublic: true,
      })
      .returning({ id: searchQueries.id });

    const [privateQuery] = await app.db
      .insert(searchQueries)
      .values({
        creatorId: TEST_USER_ID,
        title: `${searchKey} private`,
        query: "cp-500",
        description: "private discover record",
        isPublic: false,
      })
      .returning({ id: searchQueries.id });

    const discoverRes = await app.inject({
      method: "GET",
      url: `/api/v1/community?search=${encodeURIComponent(searchKey)}`,
    });

    expect(discoverRes.statusCode).toBe(200);

    const items: Array<{ id: string }> = discoverRes.json().items;
    const ids = items.map((item) => item.id);

    expect(ids).toContain(publicQuery.id);
    expect(ids).not.toContain(privateQuery.id);
  });

  it("persists and recovers guest favorites by guest cookie", async () => {
    const guestCookie = { pq_guest_id: "guest-qa-session" };

    const [publicQuery] = await app.db
      .insert(searchQueries)
      .values({
        creatorId: TEST_USER_ID,
        title: "Guest Session Favorite",
        query: "cp1000-1500",
        description: "guest favorite persistence",
        isPublic: true,
      })
      .returning({ id: searchQueries.id });

    const startSessionRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries/guest/session",
      cookies: guestCookie,
    });

    expect(startSessionRes.statusCode).toBe(200);
    expect(startSessionRes.json()).toMatchObject({
      guestId: "guest-qa-session",
      favoritesCount: 0,
      maxFavorites: 10,
    });

    const favoriteRes = await app.inject({
      method: "POST",
      url: `/api/v1/queries/guest/favorites/${publicQuery.id}`,
      cookies: guestCookie,
    });

    expect(favoriteRes.statusCode).toBe(204);

    const favoritesRes = await app.inject({
      method: "GET",
      url: "/api/v1/queries/guest/favorites",
      cookies: guestCookie,
    });

    expect(favoritesRes.statusCode).toBe(200);
    expect(favoritesRes.json()).toMatchObject({
      favoritesCount: 1,
      maxFavorites: 10,
    });
    expect(favoritesRes.json().favoriteQueryIds).toContain(publicQuery.id);

    const recoveredSessionRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries/guest/session",
      cookies: guestCookie,
    });

    expect(recoveredSessionRes.statusCode).toBe(200);
    expect(recoveredSessionRes.json()).toMatchObject({
      guestId: "guest-qa-session",
      favoritesCount: 1,
      maxFavorites: 10,
    });
  });

  it("keeps guest favorites isolated from authenticated favorites after login", async () => {
    const guestCookie = { pq_guest_id: "guest-qa-transition" };

    const [publicQuery] = await app.db
      .insert(searchQueries)
      .values({
        creatorId: TEST_USER_ID,
        title: "Guest Transition Favorite",
        query: "cp2000+",
        description: "guest to auth transition",
        isPublic: true,
      })
      .returning({ id: searchQueries.id });

    const guestFavoriteRes = await app.inject({
      method: "POST",
      url: `/api/v1/queries/guest/favorites/${publicQuery.id}`,
      cookies: guestCookie,
    });

    expect(guestFavoriteRes.statusCode).toBe(204);

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const myFavoriteIdsRes = await app.inject({
      method: "GET",
      url: "/api/v1/users/me/favorites/ids",
      cookies: { "sb-access-token": "other-user-token" },
    });

    expect(myFavoriteIdsRes.statusCode).toBe(200);
    expect(myFavoriteIdsRes.json()).toMatchObject({
      favoritesCount: 0,
    });
    expect(myFavoriteIdsRes.json().favoriteQueryIds).not.toContain(publicQuery.id);

    const guestFavoritesRes = await app.inject({
      method: "GET",
      url: "/api/v1/queries/guest/favorites",
      cookies: guestCookie,
    });

    expect(guestFavoritesRes.statusCode).toBe(200);
    expect(guestFavoritesRes.json().favoriteQueryIds).toContain(publicQuery.id);
  });
});
