import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";

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
