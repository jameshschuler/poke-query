import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { and, eq, or } from "drizzle-orm";
import { followers, trainers } from "../../src/db/schema.js";
import { OTHER_TEST_USER_ID, TEST_USER_ID } from "./setup.js";
import { supabase } from "../../src/lib/supabase.js";

const hasIntegrationUsers = Boolean(
  process.env.INTEGRATION_TEST_USER_ID && process.env.INTEGRATION_TEST_OTHER_USER_ID,
);
const integrationDescribe = hasIntegrationUsers ? describe : describe.skip;

integrationDescribe("Followers Integration", () => {
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
      .delete(followers)
      .where(
        or(
          and(eq(followers.followerId, TEST_USER_ID), eq(followers.followedId, OTHER_TEST_USER_ID)),
          and(eq(followers.followerId, OTHER_TEST_USER_ID), eq(followers.followedId, TEST_USER_ID)),
        ),
      );

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: "integration@example.com" } },
      error: null,
    });
  });

  afterAll(async () => {
    await app.db
      .delete(followers)
      .where(
        or(
          and(eq(followers.followerId, TEST_USER_ID), eq(followers.followedId, OTHER_TEST_USER_ID)),
          and(eq(followers.followerId, OTHER_TEST_USER_ID), eq(followers.followedId, TEST_USER_ID)),
        ),
      );
    await app.close();
  });

  it("follows and unfollows another trainer", async () => {
    const followRes = await app.inject({
      method: "POST",
      url: `/api/v1/users/${OTHER_TEST_USER_ID}/follow`,
      cookies: { "sb-access-token": "integration-token" },
      payload: {},
    });

    expect(followRes.statusCode).toBe(204);

    const rowsAfterFollow = await app.db
      .select()
      .from(followers)
      .where(
        and(eq(followers.followerId, TEST_USER_ID), eq(followers.followedId, OTHER_TEST_USER_ID)),
      );

    expect(rowsAfterFollow).toHaveLength(1);

    // Idempotent follow
    const followAgainRes = await app.inject({
      method: "POST",
      url: `/api/v1/users/${OTHER_TEST_USER_ID}/follow`,
      cookies: { "sb-access-token": "integration-token" },
      payload: {},
    });

    expect(followAgainRes.statusCode).toBe(204);

    const rowsAfterFollowAgain = await app.db
      .select()
      .from(followers)
      .where(
        and(eq(followers.followerId, TEST_USER_ID), eq(followers.followedId, OTHER_TEST_USER_ID)),
      );

    expect(rowsAfterFollowAgain).toHaveLength(1);

    const unfollowRes = await app.inject({
      method: "POST",
      url: `/api/v1/users/${OTHER_TEST_USER_ID}/unfollow`,
      cookies: { "sb-access-token": "integration-token" },
      payload: {},
    });

    expect(unfollowRes.statusCode).toBe(204);

    const rowsAfterUnfollow = await app.db
      .select()
      .from(followers)
      .where(
        and(eq(followers.followerId, TEST_USER_ID), eq(followers.followedId, OTHER_TEST_USER_ID)),
      );

    expect(rowsAfterUnfollow).toHaveLength(0);
  });

  it("prevents following yourself", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/users/${TEST_USER_ID}/follow`,
      cookies: { "sb-access-token": "integration-token" },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "You cannot follow yourself" });
  });

  it("returns 404 when trying to follow a trainer that does not exist", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/users/33333333-3333-4333-8333-333333333333/follow",
      cookies: { "sb-access-token": "integration-token" },
      payload: {},
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "Trainer not found" });
  });

  it("lists followers for a trainer", async () => {
    await app.db.insert(followers).values({
      followerId: TEST_USER_ID,
      followedId: OTHER_TEST_USER_ID,
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/users/${OTHER_TEST_USER_ID}/followers`,
    });

    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.total).toBe(1);
    expect(body.followers).toHaveLength(1);
    expect(body.followers[0].id).toBe(TEST_USER_ID);
    expect(body.followers[0].username).toBe("integration_trainer");
    expect(body.followers[0].followedAt).toBeTypeOf("string");
  });

  it("lists my followers for authenticated trainer", async () => {
    await app.db.insert(followers).values({
      followerId: TEST_USER_ID,
      followedId: OTHER_TEST_USER_ID,
    });

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_TEST_USER_ID, email: "other@example.com" } },
      error: null,
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users/me/followers",
      cookies: { "sb-access-token": "other-token" },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.total).toBe(1);
    expect(body.followers).toHaveLength(1);
    expect(body.followers[0].id).toBe(TEST_USER_ID);
  });
});
