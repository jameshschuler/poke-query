import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { supabase } from "../src/lib/supabase.js";

type MockSelectChain = {
  from: ReturnType<typeof vi.fn>;
  leftJoin: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  offset: ReturnType<typeof vi.fn>;
};

type MockDetailChain = {
  from: ReturnType<typeof vi.fn>;
  leftJoin: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
};

type MockTotalsChain = {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
};

function createSelectChain<T>(options?: {
  offsetResult?: T;
  limitResult?: T;
  orderByResult?: T;
}): MockSelectChain {
  const chain: MockSelectChain = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };

  chain.from.mockImplementation(() => chain);
  chain.leftJoin.mockImplementation(() => chain);
  chain.where.mockImplementation(() => chain);
  chain.limit.mockImplementation(() => chain);

  if (options?.orderByResult !== undefined) {
    chain.orderBy.mockResolvedValue(options.orderByResult);
  } else {
    chain.orderBy.mockImplementation(() => chain);
  }

  if (options?.offsetResult !== undefined) {
    chain.offset.mockResolvedValue(options.offsetResult);
  }

  if (options?.limitResult !== undefined) {
    chain.limit.mockResolvedValue(options.limitResult);
  }

  return chain;
}

function createDetailChain<T>(result: T): MockDetailChain {
  const chain: MockDetailChain = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };

  chain.from.mockImplementation(() => chain);
  chain.leftJoin.mockImplementation(() => chain);
  chain.where.mockImplementation(() => chain);
  chain.limit.mockResolvedValue(result);

  return chain;
}

function createTotalsChain(total: number): MockTotalsChain {
  const chain: MockTotalsChain = {
    from: vi.fn(),
    where: vi.fn(),
  };

  chain.from.mockImplementation(() => chain);
  chain.where.mockResolvedValue([{ total }]);

  return chain;
}

describe("Moderation Routes", () => {
  let app: any;
  const originalReviewerIds = process.env.MODERATION_REVIEWER_USER_IDS;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    process.env.MODERATION_REVIEWER_USER_IDS = originalReviewerIds;
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MODERATION_REVIEWER_USER_IDS = "";
  });

  it("submits a query report for an authenticated user", async () => {
    app.db.select = vi
      .fn()
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([
              {
                id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                title: "Public raid finder",
                creatorId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              },
            ]),
          })),
        })),
      }));

    app.db.insert = vi
      .fn()
      .mockImplementationOnce(() => ({
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        })),
      }))
      .mockImplementationOnce(() => ({
        values: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([
            {
              id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              status: "open",
            },
          ]),
        })),
      }))
      .mockImplementationOnce(() => ({
        values: vi.fn().mockResolvedValue([]),
      }));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/moderation/reports",
      cookies: { "sb-access-token": "mock-token" },
      payload: {
        targetType: "query",
        targetId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        reason: "spam",
        details: "Repeated misleading content",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      status: "open",
    });
  });

  it("returns 409 when the same reporter re-submits during cooldown", async () => {
    app.db.insert = vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      })),
    }));

    app.db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ id: "existing-report-id" }]),
        })),
      })),
    }));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/moderation/reports",
      cookies: { "sb-access-token": "mock-token" },
      payload: {
        targetType: "query",
        targetId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        reason: "spam",
        details: "Repeated misleading content",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error).toContain("already pending review");
  });

  it("returns isReviewer true for a configured reviewer", async () => {
    process.env.MODERATION_REVIEWER_USER_IDS = "uuid-123";

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/access",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ isReviewer: true });
  });

  it("returns isReviewer false when user is not a reviewer", async () => {
    process.env.MODERATION_REVIEWER_USER_IDS = "other-user-id";

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/access",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ isReviewer: false });
  });

  it("submits a trainer report for an authenticated user", async () => {
    app.db.select = vi
      .fn()
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([
              {
                id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                isProfilePublic: true,
                deactivatedAt: null,
              },
            ]),
          })),
        })),
      }));

    app.db.insert = vi
      .fn()
      .mockImplementationOnce(() => ({
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        })),
      }))
      .mockImplementationOnce(() => ({
        values: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([
            {
              id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
              status: "open",
            },
          ]),
        })),
      }))
      .mockImplementationOnce(() => ({
        values: vi.fn().mockResolvedValue([]),
      }));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/moderation/reports",
      cookies: { "sb-access-token": "mock-token" },
      payload: {
        targetType: "trainer",
        targetId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        reason: "harassment",
        details: "Repeatedly sending hostile messages",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      status: "open",
    });
  });

  it("returns 404 when reported query does not exist", async () => {
    app.db.select = vi
      .fn()
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

    app.db.insert = vi.fn().mockImplementationOnce(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      })),
    }));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/moderation/reports",
      cookies: { "sb-access-token": "mock-token" },
      payload: {
        targetType: "query",
        targetId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        reason: "spam",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toContain("not found");
  });

  it("returns 400 when reporter tries to report their own query", async () => {
    app.db.select = vi
      .fn()
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([
              {
                id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                title: "My own query",
                creatorId: "uuid-123",
              },
            ]),
          })),
        })),
      }));

    app.db.insert = vi.fn().mockImplementationOnce(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      })),
    }));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/moderation/reports",
      cookies: { "sb-access-token": "mock-token" },
      payload: {
        targetType: "query",
        targetId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        reason: "spam",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain("cannot report your own");
  });

  it("returns 404 when reported trainer does not exist or is not public", async () => {
    app.db.select = vi
      .fn()
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

    app.db.insert = vi.fn().mockImplementationOnce(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      })),
    }));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/moderation/reports",
      cookies: { "sb-access-token": "mock-token" },
      payload: {
        targetType: "trainer",
        targetId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        reason: "harassment",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toContain("not found");
  });

  it("returns 400 when reporter tries to report their own trainer profile", async () => {
    const getUserSpy = vi.spyOn(supabase.auth, "getUser");

    getUserSpy.mockResolvedValueOnce({
      data: {
        user: {
          id: "11111111-1111-4111-8111-111111111111",
          email: "trainer@example.com",
        },
      },
      error: null,
    });

    app.db.select = vi
      .fn()
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }))
      .mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([
              {
                id: "11111111-1111-4111-8111-111111111111",
                isProfilePublic: true,
                deactivatedAt: null,
              },
            ]),
          })),
        })),
      }));

    app.db.insert = vi.fn().mockImplementationOnce(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      })),
    }));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/moderation/reports",
      cookies: { "sb-access-token": "mock-token" },
      payload: {
        targetType: "trainer",
        targetId: "11111111-1111-4111-8111-111111111111",
        reason: "harassment",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain("cannot report your own");
  });

  it("returns 403 when a non-reviewer fetches the reports list", async () => {
    process.env.MODERATION_REVIEWER_USER_IDS = "other-user-id";

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/reports",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error).toContain("Reviewer access required");
  });

  it("returns paginated reports list for a reviewer", async () => {
    process.env.MODERATION_REVIEWER_USER_IDS = "uuid-123";

    const reportRow = {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      targetType: "query",
      targetQueryId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      targetTrainerId: null,
      targetQueryTitle: "Public raid finder",
      targetTrainerUsername: null,
      reason: "spam",
      details: null,
      status: "open",
      createdAt: new Date("2026-07-17T10:00:00.000Z"),
      updatedAt: new Date("2026-07-17T10:00:00.000Z"),
      reporterId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      reporterUsername: "trainer_b",
      reporterPogoUsername: null,
      reporterVisibleUsername: null,
      reviewedById: null,
      reviewedByUsername: null,
      reviewedByPogoUsername: null,
      reviewedByVisibleUsername: null,
    };

    const rowsChain = createSelectChain({ offsetResult: [reportRow] });

    const totalsChain = createTotalsChain(1);

    app.db.select = vi
      .fn()
      .mockImplementationOnce(() => rowsChain)
      .mockImplementationOnce(() => totalsChain);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/reports",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.reports).toHaveLength(1);
    expect(body.reports[0].id).toBe("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    expect(body.reports[0].status).toBe("open");
    expect(body.reports[0].target.label).toBe("Public raid finder");
    expect(body.pagination.total).toBe(1);
    expect(body.pagination.hasMore).toBe(false);
  });

  it("filters reports by status for a reviewer", async () => {
    process.env.MODERATION_REVIEWER_USER_IDS = "uuid-123";

    const rowsChain = createSelectChain({ offsetResult: [] });

    const totalsChain = createTotalsChain(0);

    app.db.select = vi
      .fn()
      .mockImplementationOnce(() => rowsChain)
      .mockImplementationOnce(() => totalsChain);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/reports?status=resolved",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().reports).toHaveLength(0);
    expect(response.json().pagination.total).toBe(0);
  });

  it("returns 403 when a non-reviewer fetches a report detail", async () => {
    process.env.MODERATION_REVIEWER_USER_IDS = "other-user-id";

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/reports/cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error).toContain("Reviewer access required");
  });

  it("returns 404 when report detail is requested for an unknown report", async () => {
    process.env.MODERATION_REVIEWER_USER_IDS = "uuid-123";

    const reportChain = createDetailChain([]);

    app.db.select = vi.fn().mockImplementationOnce(() => reportChain);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/reports/cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toContain("Report not found");
  });

  it("returns report detail with audit actions for a reviewer", async () => {
    process.env.MODERATION_REVIEWER_USER_IDS = "uuid-123";

    const reportRow = {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      targetType: "query",
      targetQueryId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      targetTrainerId: null,
      targetQueryTitle: "Public raid finder",
      targetTrainerUsername: null,
      reason: "spam",
      details: null,
      status: "open",
      createdAt: new Date("2026-07-17T10:00:00.000Z"),
      updatedAt: new Date("2026-07-17T10:00:00.000Z"),
      reporterId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      reporterUsername: "trainer_b",
      reporterPogoUsername: null,
      reporterVisibleUsername: null,
      reviewedById: null,
      reviewedByUsername: null,
      reviewedByPogoUsername: null,
      reviewedByVisibleUsername: null,
    };

    const actionRow = {
      id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      action: "submitted",
      fromStatus: null,
      toStatus: "open",
      comment: null,
      createdAt: new Date("2026-07-17T10:00:00.000Z"),
      actorId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      actorUsername: "trainer_b",
      actorPogoUsername: null,
      actorVisibleUsername: null,
    };

    const reportChain = createDetailChain([reportRow]);

    const actionsChain = createSelectChain({ orderByResult: [actionRow] });

    app.db.select = vi
      .fn()
      .mockImplementationOnce(() => reportChain)
      .mockImplementationOnce(() => actionsChain);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/moderation/reports/cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.report.id).toBe("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    expect(body.report.status).toBe("open");
    expect(body.report.reporter?.username).toBe("trainer_b");
    expect(body.actions).toHaveLength(1);
    expect(body.actions[0].action).toBe("submitted");
    expect(body.actions[0].toStatus).toBe("open");
  });

  it("returns 403 when a non-reviewer attempts to update report status", async () => {
    process.env.MODERATION_REVIEWER_USER_IDS = "other-user-id";

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/moderation/reports/cccccccc-cccc-4ccc-8ccc-cccccccccccc/status",
      cookies: { "sb-access-token": "mock-token" },
      payload: { status: "resolved" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error).toContain("Reviewer access required");
  });

  it("returns 404 when updating status for an unknown report", async () => {
    process.env.MODERATION_REVIEWER_USER_IDS = "uuid-123";

    app.db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    }));

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/moderation/reports/cccccccc-cccc-4ccc-8ccc-cccccccccccc/status",
      cookies: { "sb-access-token": "mock-token" },
      payload: { status: "resolved" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toContain("Report not found");
  });

  it("inserts a comment action when status is unchanged but a comment is provided", async () => {
    process.env.MODERATION_REVIEWER_USER_IDS = "uuid-123";

    app.db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([
            {
              id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              status: "open",
            },
          ]),
        })),
      })),
    }));

    const returning = vi.fn().mockResolvedValue([
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        status: "open",
        updatedAt: new Date("2026-07-17T12:00:00.000Z"),
      },
    ]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    app.db.update = vi.fn(() => ({ set }));

    const insertValues = vi.fn().mockResolvedValue([]);
    app.db.insert = vi.fn(() => ({ values: insertValues }));

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/moderation/reports/cccccccc-cccc-4ccc-8ccc-cccccccccccc/status",
      cookies: { "sb-access-token": "mock-token" },
      payload: {
        status: "open",
        comment: "Needs further investigation",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ action: "commented", comment: "Needs further investigation" }),
    );
  });

  it("allows reviewer to transition report status and records audit action", async () => {
    process.env.MODERATION_REVIEWER_USER_IDS = "uuid-123";

    app.db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([
            {
              id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              status: "open",
            },
          ]),
        })),
      })),
    }));

    const returning = vi.fn().mockResolvedValue([
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        status: "resolved",
        updatedAt: new Date("2026-07-17T12:00:00.000Z"),
      },
    ]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    app.db.update = vi.fn(() => ({ set }));

    app.db.insert = vi.fn(() => ({ values: vi.fn().mockResolvedValue([]) }));

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/moderation/reports/cccccccc-cccc-4ccc-8ccc-cccccccccccc/status",
      cookies: { "sb-access-token": "mock-token" },
      payload: {
        status: "resolved",
        comment: "Reviewed and actioned",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      status: "resolved",
      updatedAt: "2026-07-17T12:00:00.000Z",
    });
    expect(app.db.insert).toHaveBeenCalled();
  });
});
