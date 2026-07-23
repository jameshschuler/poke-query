import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import {
  discoverEventRollups,
  discoverWeeklyPicks,
  searchQueries,
  trainers,
} from "../../src/db/schema.js";
import { and, eq, sql } from "drizzle-orm";
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
    await app.db.delete(discoverWeeklyPicks);
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
      url: "/api/v1/community?tag=high-iv",
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
        trainerCode: string | null;
      } | null;
    }> = res.json().items;
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
    const searchKey = `popular-sort-${Date.now()}`;

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: `${searchKey} Lower Popularity`,
        query: "cp-1500",
        isPublic: true,
      },
    });

    const second = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: `${searchKey} Higher Popularity`,
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
      url: `/api/v1/community?filter=popular&search=${encodeURIComponent(searchKey)}`,
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
        trainerCode: string | null;
      } | null;
    }> = res.json().items;
    const ids = rows.map((r) => r.id);

    expect(ids).toContain(firstId);
    expect(ids).toContain(secondId);
    expect(ids.indexOf(secondId)).toBeLessThan(ids.indexOf(firstId));

    const topRow = rows[0]!;
    expect(topRow.creator).toBeTruthy();
    expect(topRow.creator?.username).toBe("integration_trainer");
  });

  it("ranks popularity using copies + favorites + forks", async () => {
    const searchKey = `popular-rank-${Date.now()}`;

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: `${searchKey} Favorite + Fork Candidate`,
        query: "cp1000-1500",
        isPublic: true,
      },
    });

    const second = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: `${searchKey} Copy Candidate`,
        query: "cp2500+",
        isPublic: true,
      },
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);

    const firstId = first.json().id;
    const secondId = second.json().id;

    // one copy for second => score 1
    await app.inject({ method: "PATCH", url: `/api/v1/queries/${secondId}/copy`, payload: {} });

    // one favorite + one fork for first => score 2
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: OTHER_USER_ID, email: "integration-other@example.com" } },
      error: null,
    });

    const favoriteRes = await app.inject({
      method: "POST",
      url: `/api/v1/queries/${firstId}/favorite`,
      cookies: { "sb-access-token": "integration-token" },
      payload: {},
    });
    expect(favoriteRes.statusCode).toBe(204);

    const forkRes = await app.inject({
      method: "POST",
      url: `/api/v1/queries/${firstId}/fork`,
      cookies: { "sb-access-token": "integration-token" },
      payload: {},
    });
    expect(forkRes.statusCode).toBe(201);

    // Switch back to default test user for the community read.
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: "integration@example.com" } },
      error: null,
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/community?filter=popular&search=${encodeURIComponent(searchKey)}`,
    });

    expect(res.statusCode).toBe(200);
    const rows: Array<{ id: string }> = res.json().items;
    const ids = rows.map((r) => r.id);

    expect(ids).toContain(firstId);
    expect(ids).toContain(secondId);
    expect(ids.indexOf(firstId)).toBeLessThan(ids.indexOf(secondId));
  });

  it("returns surfacing rails and caps repeated telemetry actions", async () => {
    const searchKey = `surfacing-${Date.now()}`;

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: `${searchKey} Candidate`,
        query: "cp-1500&!traded",
        description: "High quality surfacing candidate",
        isPublic: true,
        tags: ["great-league"],
      },
    });

    expect(created.statusCode).toBe(201);
    const queryId = created.json().id;

    const surfacingRes = await app.inject({
      method: "GET",
      url: `/api/v1/metrics/surfacing?search=${encodeURIComponent(searchKey)}`,
    });

    expect(surfacingRes.statusCode).toBe(200);

    const payload: {
      weeklyPicks: Array<{ id: string; qualityScore: number }>;
      featuredToday: Array<{ id: string; qualityScore: number }>;
      allTimeTrusted: Array<{ id: string; qualityScore: number }>;
      contextualPicks: Array<{ id: string; qualityScore: number }>;
    } = surfacingRes.json();

    expect(Array.isArray(payload.weeklyPicks)).toBe(true);
    expect(Array.isArray(payload.featuredToday)).toBe(true);
    expect(Array.isArray(payload.allTimeTrusted)).toBe(true);
    expect(Array.isArray(payload.contextualPicks)).toBe(true);
    expect(payload.contextualPicks.some((item) => item.id === queryId)).toBe(true);
    expect(typeof payload.contextualPicks[0]?.qualityScore).toBe("number");

    const burstEvents = Array.from({ length: 12 }, () => ({
      queryId,
      rail: "featured_today",
      eventType: "impression",
    }));

    const trackRes = await app.inject({
      method: "POST",
      url: "/api/v1/metrics/surfacing/events",
      payload: {
        sessionKey: `integration-session-${Date.now()}`,
        events: burstEvents,
      },
    });

    expect(trackRes.statusCode).toBe(202);

    const [rollup] = await app.db
      .select({
        impressions: sql<number>`COALESCE(SUM(${discoverEventRollups.eventCount}), 0)::int`,
      })
      .from(discoverEventRollups)
      .where(
        and(
          eq(discoverEventRollups.queryId, queryId),
          eq(discoverEventRollups.eventType, "impression"),
        ),
      );

    // Impression caps should prevent a single repeated burst from dominating counts.
    expect((rollup?.impressions ?? 0) > 0).toBe(true);
    expect(rollup?.impressions ?? 0).toBeLessThanOrEqual(4);
  });

  it("allows admins to manage weekly picks via API", async () => {
    const searchKey = `weekly-picks-${Date.now()}`;

    await app.db.update(trainers).set({ role: "admin" }).where(eq(trainers.userId, TEST_USER_ID));

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: `${searchKey} Candidate`,
        query: "cp-1500&!traded&!shadow",
        isPublic: true,
        tags: ["raid"],
      },
    });

    expect(created.statusCode).toBe(201);
    const queryId = created.json().id;

    const upsertRes = await app.inject({
      method: "POST",
      url: "/api/v1/metrics/surfacing/weekly-picks",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        queryId,
        displayOrder: 1,
        isActive: true,
        notes: "Mega and legendary spotlight",
      },
    });

    expect(upsertRes.statusCode).toBe(200);
    expect(upsertRes.json().item.queryId).toBe(queryId);

    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/metrics/surfacing/weekly-picks",
      cookies: { "sb-access-token": "integration-token" },
    });

    expect(listRes.statusCode).toBe(200);
    const listedItems: Array<{ queryId: string }> = listRes.json().items;
    expect(listedItems.some((item) => item.queryId === queryId)).toBe(true);

    const surfacingRes = await app.inject({
      method: "GET",
      url: `/api/v1/metrics/surfacing?search=${encodeURIComponent(searchKey)}`,
    });

    expect(surfacingRes.statusCode).toBe(200);
    const surfacingPayload: { weeklyPicks: Array<{ id: string }> } = surfacingRes.json();
    expect(surfacingPayload.weeklyPicks.some((item) => item.id === queryId)).toBe(true);

    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/v1/metrics/surfacing/weekly-picks/${queryId}`,
      cookies: { "sb-access-token": "integration-token" },
    });

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.json().removedQueryId).toBe(queryId);
  });

  it("returns configured active weekly picks even when not in trusted top-120", async () => {
    const searchKey = `weekly-picks-top120-${Date.now()}`;

    await app.db.update(trainers).set({ role: "admin" }).where(eq(trainers.userId, TEST_USER_ID));

    const lowQualityRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        title: `${searchKey} Low Quality Pick`,
        query: "cp-1500",
        isPublic: true,
      },
    });

    expect(lowQualityRes.statusCode).toBe(201);
    const lowQualityQueryId = lowQualityRes.json().id as string;

    for (let i = 0; i < 130; i += 1) {
      const noisyRes = await app.inject({
        method: "POST",
        url: "/api/v1/queries",
        cookies: { "sb-access-token": "integration-token" },
        payload: {
          title: `${searchKey} Trusted Candidate ${i}`,
          query: `cp-${1500 + (i % 200)}&!shadow&!traded`,
          description: "High-quality candidate with richer metadata",
          isPublic: true,
          tags: ["great-league"],
        },
      });

      expect(noisyRes.statusCode).toBe(201);
    }

    const upsertRes = await app.inject({
      method: "POST",
      url: "/api/v1/metrics/surfacing/weekly-picks",
      cookies: { "sb-access-token": "integration-token" },
      payload: {
        queryId: lowQualityQueryId,
        displayOrder: 0,
        isActive: true,
      },
    });

    expect(upsertRes.statusCode).toBe(200);

    const surfacingRes = await app.inject({
      method: "GET",
      url: "/api/v1/metrics/surfacing?railLimit=10",
    });

    expect(surfacingRes.statusCode).toBe(200);
    const surfacingPayload: { weeklyPicks: Array<{ id: string }> } = surfacingRes.json();
    expect(surfacingPayload.weeklyPicks.some((item) => item.id === lowQualityQueryId)).toBe(true);
  });
});
