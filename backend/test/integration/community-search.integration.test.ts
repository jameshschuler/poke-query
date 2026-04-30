import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { searchQueries, trainers } from "../../src/db/schema.js";
import { eq } from "drizzle-orm";
import { OTHER_TEST_USER_ID, TEST_USER_ID } from "./setup.js";
import { supabase } from "../../src/lib/supabase.js";

const OTHER_USER_ID = OTHER_TEST_USER_ID;
const hasIntegrationUsers = Boolean(
  process.env.INTEGRATION_TEST_USER_ID && process.env.INTEGRATION_TEST_OTHER_USER_ID,
);
const integrationDescribe = hasIntegrationUsers ? describe : describe.skip;

integrationDescribe("Community Search Integration", () => {
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

  it("filters by tag and returns only public queries", async () => {
    const publicHighIv = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: "Public High IV",
        query: "4*&cp-1500",
        isPublic: true,
      },
    });

    const publicNundo = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: "Public Nundo",
        query: "0*",
        isPublic: true,
      },
    });

    const privateHighIv = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: "Private High IV",
        query: "4*&cp-2500",
        isPublic: false,
      },
    });

    expect(publicHighIv.statusCode).toBe(201);
    expect(publicNundo.statusCode).toBe(201);
    expect(privateHighIv.statusCode).toBe(201);

    const highIvId = publicHighIv.json().id;
    const nundoId = publicNundo.json().id;
    const privateId = privateHighIv.json().id;

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/community/community?tag=high-iv",
    });

    expect(res.statusCode).toBe(200);
    const rows: Array<{
      id: string;
      creator: {
        id: string;
        username: string;
        avatarUrl: string | null;
        team: "mystic" | "valor" | "instinct" | null;
        level: number | null;
      } | null;
    }> = res.json();
    const ids = rows.map((r) => r.id);

    expect(ids).toContain(highIvId);
    expect(ids).not.toContain(nundoId);
    expect(ids).not.toContain(privateId);

    const highIvRow = rows.find((r) => r.id === highIvId);
    expect(highIvRow?.creator).toBeTruthy();
    expect(highIvRow?.creator?.id).toBe(TEST_USER_ID);
    expect(highIvRow?.creator?.username).toBe("integration_trainer");
  });

  it("sorts by popularity when sort=popular", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: "Lower Popularity",
        query: "cp-1500",
        isPublic: true,
      },
    });

    const second = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: "Higher Popularity",
        query: "cp-2500",
        isPublic: true,
      },
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);

    const firstId = first.json().id;
    const secondId = second.json().id;

    await app.inject({ method: "PATCH", url: `/api/v1/queries/${secondId}/copy`, payload: {} });
    await app.inject({ method: "PATCH", url: `/api/v1/queries/${secondId}/copy`, payload: {} });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/community/community?sort=popular",
    });

    expect(res.statusCode).toBe(200);
    const rows: Array<{
      id: string;
      creator: {
        id: string;
        username: string;
        avatarUrl: string | null;
        team: "mystic" | "valor" | "instinct" | null;
        level: number | null;
      } | null;
    }> = res.json();
    const ids = rows.map((r) => r.id);

    expect(ids).toContain(firstId);
    expect(ids).toContain(secondId);
    expect(ids.indexOf(secondId)).toBeLessThan(ids.indexOf(firstId));

    const topRow = rows[0];
    expect(topRow.creator).toBeTruthy();
    expect(topRow.creator?.username).toBe("integration_trainer");
  });
});
