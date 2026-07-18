import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq, or } from "drizzle-orm";
import { buildApp } from "../../src/app.js";
import { reportActions, reports, searchQueries, trainers } from "../../src/db/schema.js";
import { supabase } from "../../src/lib/supabase.js";
import { OTHER_TEST_USER_ID, TEST_USER_ID } from "./setup.js";

const hasIntegrationUsers = Boolean(
  process.env.INTEGRATION_TEST_USER_ID && process.env.INTEGRATION_TEST_OTHER_USER_ID,
);
const integrationDescribe = hasIntegrationUsers ? describe : describe.skip;

integrationDescribe("Moderation Integration", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  const originalReviewerIds = process.env.MODERATION_REVIEWER_USER_IDS;

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
        isProfilePublic: true,
      })
      .onConflictDoNothing();

    await app.db
      .insert(trainers)
      .values({
        id: OTHER_TEST_USER_ID,
        userId: OTHER_TEST_USER_ID,
        username: "integration_reviewer",
        level: 30,
        team: "valor",
        isProfilePublic: true,
      })
      .onConflictDoNothing();
  });

  beforeEach(async () => {
    process.env.MODERATION_REVIEWER_USER_IDS = OTHER_TEST_USER_ID;
    process.env.REPORT_SUBMISSION_COOLDOWN_MINUTES = "10";

    await app.db
      .delete(reportActions)
      .where(
        or(
          eq(reportActions.actorTrainerId, TEST_USER_ID),
          eq(reportActions.actorTrainerId, OTHER_TEST_USER_ID),
        ),
      );

    await app.db
      .delete(reports)
      .where(
        or(
          eq(reports.reporterTrainerId, TEST_USER_ID),
          eq(reports.reporterTrainerId, OTHER_TEST_USER_ID),
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

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: "integration@example.com" } },
      error: null,
    });
  });

  afterAll(async () => {
    process.env.MODERATION_REVIEWER_USER_IDS = originalReviewerIds;

    await app.db
      .delete(reportActions)
      .where(
        or(
          eq(reportActions.actorTrainerId, TEST_USER_ID),
          eq(reportActions.actorTrainerId, OTHER_TEST_USER_ID),
        ),
      );

    await app.db
      .delete(reports)
      .where(
        or(
          eq(reports.reporterTrainerId, TEST_USER_ID),
          eq(reports.reporterTrainerId, OTHER_TEST_USER_ID),
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

    await app.close();
  });

  it("enforces submission cooldown and supports reviewer queue/detail/status transitions", async () => {
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: TEST_USER_ID, email: "integration@example.com" } },
      error: null,
    });

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "owner-token" },
      payload: {
        title: "Integration report target",
        query: "4*&cp-1500",
        description: "query to moderate",
        isPublic: true,
      },
    });

    expect(createRes.statusCode).toBe(201);
    const queryId = createRes.json().id as string;

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_TEST_USER_ID, email: "reviewer@example.com" } },
      error: null,
    });

    const submitRes = await app.inject({
      method: "POST",
      url: "/api/v1/moderation/reports",
      cookies: { "sb-access-token": "reviewer-token" },
      payload: {
        targetType: "query",
        targetId: queryId,
        reason: "misleading",
        details: "Claimed impossible stat filters.",
      },
    });

    expect(submitRes.statusCode).toBe(201);
    const reportId = submitRes.json().id as string;

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_TEST_USER_ID, email: "reviewer@example.com" } },
      error: null,
    });

    const duplicateRes = await app.inject({
      method: "POST",
      url: "/api/v1/moderation/reports",
      cookies: { "sb-access-token": "reviewer-token" },
      payload: {
        targetType: "query",
        targetId: queryId,
        reason: "misleading",
        details: "Same issue submitted again immediately.",
      },
    });

    expect(duplicateRes.statusCode).toBe(409);

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_TEST_USER_ID, email: "reviewer@example.com" } },
      error: null,
    });

    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/reports?status=open",
      cookies: { "sb-access-token": "reviewer-token" },
    });

    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().reports).toHaveLength(1);
    expect(listRes.json().reports[0].id).toBe(reportId);

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_TEST_USER_ID, email: "reviewer@example.com" } },
      error: null,
    });

    const detailRes = await app.inject({
      method: "GET",
      url: `/api/v1/moderation/reports/${reportId}`,
      cookies: { "sb-access-token": "reviewer-token" },
    });

    expect(detailRes.statusCode).toBe(200);
    expect(detailRes.json().actions).toHaveLength(1);
    expect(detailRes.json().actions[0].action).toBe("submitted");

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: OTHER_TEST_USER_ID, email: "reviewer@example.com" } },
      error: null,
    });

    const transitionRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/moderation/reports/${reportId}/status`,
      cookies: { "sb-access-token": "reviewer-token" },
      payload: {
        status: "resolved",
        comment: "Validated and actioned",
      },
    });

    expect(transitionRes.statusCode).toBe(200);
    expect(transitionRes.json().status).toBe("resolved");

    const [resolvedReport] = await app.db
      .select({ id: reports.id, status: reports.status })
      .from(reports)
      .where(and(eq(reports.id, reportId), eq(reports.status, "resolved")))
      .limit(1);

    expect(resolvedReport?.id).toBe(reportId);

    const actions = await app.db
      .select({ action: reportActions.action, toStatus: reportActions.toStatus })
      .from(reportActions)
      .where(eq(reportActions.reportId, reportId));

    expect(
      actions.some((item) => item.action === "status_changed" && item.toStatus === "resolved"),
    ).toBe(true);
  });
});
