import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq, or } from "drizzle-orm";
import { buildApp } from "../../src/app.js";
import {
  favorites,
  followers,
  notificationPreferences,
  notifications,
  searchQueries,
  trainers,
} from "../../src/db/schema.js";
import { supabase } from "../../src/lib/supabase.js";
import { OTHER_TEST_USER_ID, TEST_USER_ID } from "./setup.js";

const hasIntegrationUsers = Boolean(
  process.env.INTEGRATION_TEST_USER_ID && process.env.INTEGRATION_TEST_OTHER_USER_ID,
);
const integrationDescribe = hasIntegrationUsers ? describe : describe.skip;

integrationDescribe("Notifications Integration", () => {
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
        id: OTHER_TEST_USER_ID,
        userId: OTHER_TEST_USER_ID,
        username: "integration_other",
        level: 30,
        team: "valor",
      })
      .onConflictDoNothing();
  });

  beforeEach(async () => {
    await app.db
      .delete(notifications)
      .where(
        or(
          eq(notifications.recipientTrainerId, TEST_USER_ID),
          eq(notifications.recipientTrainerId, OTHER_TEST_USER_ID),
          eq(notifications.actorTrainerId, TEST_USER_ID),
          eq(notifications.actorTrainerId, OTHER_TEST_USER_ID),
        ),
      );

    await app.db
      .delete(notificationPreferences)
      .where(
        or(
          eq(notificationPreferences.trainerId, TEST_USER_ID),
          eq(notificationPreferences.trainerId, OTHER_TEST_USER_ID),
        ),
      );

    await app.db
      .delete(followers)
      .where(
        or(
          eq(followers.followerId, TEST_USER_ID),
          eq(followers.followedId, TEST_USER_ID),
          eq(followers.followerId, OTHER_TEST_USER_ID),
          eq(followers.followedId, OTHER_TEST_USER_ID),
        ),
      );

    await app.db
      .delete(favorites)
      .where(
        or(eq(favorites.trainerId, TEST_USER_ID), eq(favorites.trainerId, OTHER_TEST_USER_ID)),
      );

    await app.db
      .delete(searchQueries)
      .where(
        or(
          eq(searchQueries.creatorId, TEST_USER_ID),
          eq(searchQueries.creatorId, OTHER_TEST_USER_ID),
        ),
      );

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: "integration@example.com" } },
      error: null,
    });
  });

  afterAll(async () => {
    await app.db
      .delete(notifications)
      .where(
        or(
          eq(notifications.recipientTrainerId, TEST_USER_ID),
          eq(notifications.recipientTrainerId, OTHER_TEST_USER_ID),
          eq(notifications.actorTrainerId, TEST_USER_ID),
          eq(notifications.actorTrainerId, OTHER_TEST_USER_ID),
        ),
      );

    await app.db
      .delete(notificationPreferences)
      .where(
        or(
          eq(notificationPreferences.trainerId, TEST_USER_ID),
          eq(notificationPreferences.trainerId, OTHER_TEST_USER_ID),
        ),
      );

    await app.db
      .delete(searchQueries)
      .where(
        or(
          eq(searchQueries.creatorId, TEST_USER_ID),
          eq(searchQueries.creatorId, OTHER_TEST_USER_ID),
        ),
      );

    await app.db
      .delete(followers)
      .where(
        or(
          eq(followers.followerId, TEST_USER_ID),
          eq(followers.followedId, TEST_USER_ID),
          eq(followers.followerId, OTHER_TEST_USER_ID),
          eq(followers.followedId, OTHER_TEST_USER_ID),
        ),
      );

    await app.close();
  });

  it("creates follow/favorite/fork notifications and supports read transitions", async () => {
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_TEST_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "other-token" },
      payload: {
        title: "Owner Public Query",
        query: "4*&cp-1500",
        description: "notification source query",
        isPublic: true,
      },
    });

    expect(createRes.statusCode).toBe(201);
    const queryId = createRes.json().id;

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: TEST_USER_ID, email: "integration@example.com" } },
      error: null,
    });

    const followRes = await app.inject({
      method: "POST",
      url: `/api/v1/users/${OTHER_TEST_USER_ID}/follow`,
      cookies: { "sb-access-token": "integration-token" },
      payload: {},
    });
    expect(followRes.statusCode).toBe(204);

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: TEST_USER_ID, email: "integration@example.com" } },
      error: null,
    });

    const favoriteRes = await app.inject({
      method: "POST",
      url: `/api/v1/queries/${queryId}/favorite`,
      cookies: { "sb-access-token": "integration-token" },
      payload: {},
    });
    expect(favoriteRes.statusCode).toBe(204);

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: TEST_USER_ID, email: "integration@example.com" } },
      error: null,
    });

    const forkRes = await app.inject({
      method: "POST",
      url: `/api/v1/queries/${queryId}/fork`,
      cookies: { "sb-access-token": "integration-token" },
      payload: {},
    });
    expect(forkRes.statusCode).toBe(201);

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_TEST_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const unreadRes = await app.inject({
      method: "GET",
      url: "/api/v1/notifications/unread-count",
      cookies: { "sb-access-token": "other-token" },
    });

    expect(unreadRes.statusCode).toBe(200);
    expect(unreadRes.json()).toEqual({ unreadCount: 3 });

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_TEST_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/notifications?limit=10&offset=0",
      cookies: { "sb-access-token": "other-token" },
    });

    expect(listRes.statusCode).toBe(200);
    const listBody: {
      notifications: unknown[];
      pagination: { total: number };
    } = listRes.json();

    const eventTypes = listBody.notifications
      .map((item) => {
        if (typeof item !== "object" || item === null || !("eventType" in item)) {
          return null;
        }

        const eventType = (item as { eventType?: unknown }).eventType;
        return typeof eventType === "string" ? eventType : null;
      })
      .filter((eventType): eventType is string => typeof eventType === "string");

    const firstItem = listBody.notifications[0];
    const firstId =
      typeof firstItem === "object" && firstItem !== null && "id" in firstItem
        ? (firstItem as { id?: unknown }).id
        : undefined;

    expect(listBody.pagination.total).toBeGreaterThanOrEqual(3);
    expect(eventTypes).toEqual(
      expect.arrayContaining(["new_follower", "query_favorited", "query_forked"]),
    );
    expect(firstId).toBeTypeOf("string");

    if (typeof firstId !== "string") {
      throw new Error("Expected first notification id to be a string");
    }

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_TEST_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const markReadRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/notifications/${firstId}/read`,
      cookies: { "sb-access-token": "other-token" },
    });
    expect(markReadRes.statusCode).toBe(204);

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_TEST_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const unreadAfterSingleRes = await app.inject({
      method: "GET",
      url: "/api/v1/notifications/unread-count",
      cookies: { "sb-access-token": "other-token" },
    });

    expect(unreadAfterSingleRes.statusCode).toBe(200);
    expect(unreadAfterSingleRes.json()).toEqual({ unreadCount: 2 });

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_TEST_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const markAllReadRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/notifications/read-all",
      cookies: { "sb-access-token": "other-token" },
    });

    expect(markAllReadRes.statusCode).toBe(204);

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_TEST_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const unreadAfterAllRes = await app.inject({
      method: "GET",
      url: "/api/v1/notifications/unread-count",
      cookies: { "sb-access-token": "other-token" },
    });

    expect(unreadAfterAllRes.statusCode).toBe(200);
    expect(unreadAfterAllRes.json()).toEqual({ unreadCount: 0 });
  });

  it("respects notification preferences when query favorite notifications are disabled", async () => {
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_TEST_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "other-token" },
      payload: {
        title: "Preference Source Query",
        query: "3*&cp-2500",
        description: "preference-gated notification source",
        isPublic: true,
      },
    });

    expect(createRes.statusCode).toBe(201);
    const queryId = createRes.json().id;

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_TEST_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const prefsRes = await app.inject({
      method: "PATCH",
      url: "/api/v1/notifications/preferences",
      cookies: { "sb-access-token": "other-token" },
      payload: {
        notifyQueryFavorite: false,
      },
    });

    expect(prefsRes.statusCode).toBe(200);
    expect(prefsRes.json()).toMatchObject({
      notifyQueryFavorite: false,
    });

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: TEST_USER_ID, email: "integration@example.com" } },
      error: null,
    });

    const favoriteRes = await app.inject({
      method: "POST",
      url: `/api/v1/queries/${queryId}/favorite`,
      cookies: { "sb-access-token": "integration-token" },
      payload: {},
    });

    expect(favoriteRes.statusCode).toBe(204);

    const rows = await app.db
      .select({ eventType: notifications.eventType })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientTrainerId, OTHER_TEST_USER_ID),
          eq(notifications.eventType, "query_favorited"),
        ),
      );

    expect(rows).toHaveLength(0);
  });
});
