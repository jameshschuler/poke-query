import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";

function buildNotificationsRowsChain(rows: object[]) {
  return {
    from: vi.fn(() => ({
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn().mockResolvedValue(rows),
            })),
          })),
        })),
      })),
    })),
  };
}

function buildCountChain(total: number) {
  return {
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([{ total }]),
    })),
  };
}

function buildPreferencesChain(result: object[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue(result),
      })),
    })),
  };
}

describe("Notifications Routes", () => {
  let app: any;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated notifications request", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/notifications",
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns notifications with actor display name and pagination", async () => {
    app.db.select = vi
      .fn()
      .mockReturnValueOnce(
        buildNotificationsRowsChain([
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            eventType: "query_forked",
            entityType: "query",
            entityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            title: "Your query was forked",
            message: 'Misty forked "Raid filters".',
            isHighPriority: true,
            isRead: false,
            readAt: null,
            createdAt: new Date("2026-07-08T12:00:00.000Z"),
            actorId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            actorUsername: "misty_trainer",
            actorPogoUsername: "MistyGO",
            actorVisibleUsername: "pogo",
            actorAvatarUrl: "https://example.com/avatar.png",
          },
        ]),
      )
      .mockReturnValueOnce(buildCountChain(1));

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/notifications?limit=10&offset=0",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      notifications: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          eventType: "query_forked",
          entityType: "query",
          entityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          title: "Your query was forked",
          message: 'Misty forked "Raid filters".',
          isHighPriority: true,
          isRead: false,
          readAt: null,
          createdAt: "2026-07-08T12:00:00.000Z",
          actor: {
            id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            username: "misty_trainer",
            displayName: "MistyGO",
            avatarUrl: "https://example.com/avatar.png",
          },
        },
      ],
      pagination: {
        limit: 10,
        offset: 0,
        nextOffset: null,
        hasMore: false,
        total: 1,
      },
    });
  });

  it("returns unread notifications count", async () => {
    app.db.select = vi.fn().mockReturnValueOnce(buildCountChain(3));

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/notifications/unread-count",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ unreadCount: 3 });
  });

  it("marks a notification as read", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    app.db.update = vi.fn(() => ({ set }));

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/notifications/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/read",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(response.statusCode).toBe(204);
  });

  it("returns 404 when marking unknown notification read", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    app.db.update = vi.fn(() => ({ set }));

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/notifications/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/read",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Notification not found" });
  });

  it("returns default notification preferences when none are saved", async () => {
    app.db.select = vi.fn().mockReturnValueOnce(buildPreferencesChain([]));

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/notifications/preferences",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      notifyNewFollower: true,
      notifyQueryFork: true,
      notifyQueryFavorite: true,
      inAppToasts: true,
    });
  });

  it("updates notification preferences", async () => {
    const returning = vi.fn().mockResolvedValue([
      {
        notifyNewFollower: true,
        notifyQueryFork: false,
        notifyQueryFavorite: true,
        inAppToasts: false,
      },
    ]);
    const onConflictDoUpdate = vi.fn(() => ({ returning }));
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    app.db.insert = vi.fn(() => ({ values }));

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/notifications/preferences",
      cookies: { "sb-access-token": "mock-token" },
      payload: {
        notifyQueryFork: false,
        inAppToasts: false,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      notifyNewFollower: true,
      notifyQueryFork: false,
      notifyQueryFavorite: true,
      inAppToasts: false,
    });
  });
});
