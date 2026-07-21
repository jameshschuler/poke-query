import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { buildApp } from "../src/app.js";

const { mockSelect, mockAdminDeleteUser } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockAdminDeleteUser: vi.fn(),
}));

const mockRow = {
  id: "uuid-123",
  username: "AshKetchum",
  pogoUsername: null,
  visibleUsername: "pokequery",
  team: "mystic",
  level: 40,
  trainerCode: "1234 5678 9012",
  isProfilePublic: true,
  avatarUrl: null,
  queryCount: 5,
  favoriteCount: 3,
  followerCount: 7,
  forkCount: 2,
};

const buildSelectChain = (result: object[]) => ({
  from: vi.fn(() => ({
    where: vi.fn().mockResolvedValue(result),
  })),
});

const buildWhereChain = (result: object[]) => ({
  from: vi.fn(() => ({
    where: vi.fn().mockResolvedValue(result),
  })),
});

const buildWhereLimitChain = (result: object[]) => ({
  from: vi.fn(() => ({
    where: vi.fn(() => ({
      limit: vi.fn().mockResolvedValue(result),
    })),
  })),
});

const buildOrderByLimitChain = (result: object[]) => ({
  from: vi.fn(() => {
    const joinable = {
      leftJoin: vi.fn(),
      where: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue(result),
        })),
      })),
    };
    joinable.leftJoin.mockReturnValue(joinable);
    return joinable;
  }),
});

const buildJoinOrderByChain = (result: object[]) => ({
  from: vi.fn(() => ({
    innerJoin: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn().mockResolvedValue(result),
      })),
    })),
  })),
});

vi.mock("../src/db/index.js", () => ({
  queryClient: { end: vi.fn() },
  db: {
    select: mockSelect,
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      admin: {
        deleteUser: mockAdminDeleteUser,
      },
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: "uuid-123", email: "ash@example.com" } },
          error: null,
        }),
      ),
    },
  }),
}));

describe("GET /api/v1/users/me", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should return 401 when no auth cookie is present", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/users/me" });

    expect(res.statusCode).toBe(401);
  });

  it("should return 200 with trainer profile and counts", async () => {
    mockSelect.mockReturnValueOnce(buildSelectChain([mockRow]));

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe("uuid-123");
    expect(body.email).toBe("ash@example.com");
    expect(body.username).toBe("AshKetchum");
    expect(body.displayName).toBe("AshKetchum");
    expect(body.pogoUsername).toBeNull();
    expect(body.visibleUsername).toBe("pokequery");
    expect(body.team).toBe("mystic");
    expect(body.trainerCode).toBe("1234 5678 9012");
    expect(body.isProfilePublic).toBe(true);
    expect(body.queryCount).toBe(5);
    expect(body.favoriteCount).toBe(3);
    expect(body.followerCount).toBe(7);
    expect(body.forkCount).toBe(2);
  });

  it("should return 200 onboarding payload when the trainer record does not exist", async () => {
    mockSelect.mockReturnValueOnce(buildSelectChain([]));

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      hasTrainer: false,
      id: "uuid-123",
      email: "ash@example.com",
      team: null,
      level: null,
      trainerCode: null,
      isProfilePublic: false,
      avatarUrl: null,
      queryCount: 0,
      favoriteCount: 0,
      followerCount: 0,
      forkCount: 0,
    });
  });
});

describe("DELETE /api/v1/users/me", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should return 204 when auth user is deleted and trainer row does not exist", async () => {
    process.env.SUPABASE_SECRET_KEY = "test-secret-key";
    mockAdminDeleteUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    (app.db as any).delete = vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([]),
      })),
    }));

    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/users/me",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(res.statusCode).toBe(204);
    expect(mockAdminDeleteUser).toHaveBeenCalledWith("uuid-123");
    expect(res.headers["set-cookie"]).toBeDefined();
  });
});

describe("GET /api/v1/users/me/forks", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns managed forks with source metadata and sync status", async () => {
    mockSelect.mockReturnValueOnce(buildWhereChain([{ id: "uuid-123" }]));
    mockSelect.mockReturnValueOnce(
      buildOrderByLimitChain([
        {
          id: "fork-1",
          title: "Fork of Shadow Hundos",
          query: "shadow&4*",
          description: "My fork",
          isPublic: false,
          copyCount: 3,
          viewCount: 5,
          favoriteCount: 2,
          forkCount: 0,
          referenceUrl: null,
          userTags: [],
          autoTags: ["raid", "high-iv"],
          createdAt: new Date("2026-06-01T12:00:00.000Z"),
          updatedAt: new Date("2026-06-02T12:00:00.000Z"),
          parentQueryId: "source-1",
          originalQuerySnapshot: "shadow&4*",
          syncStatus: "behind",
          sourceId: "source-1",
          sourceTitle: "Shadow Hundos",
          sourceQuery: "shadow&4*&age0-30",
          sourceIsPublic: true,
          sourceUpdatedAt: new Date("2026-06-03T12:00:00.000Z"),
          sourceCreatorId: "trainer-2",
          sourceCreatorUsername: "Misty",
          sourceCreatorPogoUsername: null,
          sourceCreatorVisibleUsername: "pokequery",
          sourceCreatorAvatarUrl: null,
          sourceCreatorTeam: "mystic",
          sourceCreatorLevel: 44,
        },
      ]),
    );

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users/me/forks",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      forks: [
        {
          id: "fork-1",
          title: "Fork of Shadow Hundos",
          query: "shadow&4*",
          description: "My fork",
          isPublic: false,
          copyCount: 3,
          viewCount: 5,
          favoriteCount: 2,
          forkCount: 0,
          referenceUrl: null,
          userTags: [],
          autoTags: ["raid", "high-iv"],
          createdAt: "2026-06-01T12:00:00.000Z",
          updatedAt: "2026-06-02T12:00:00.000Z",
          parentQueryId: "source-1",
          originalQuerySnapshot: "shadow&4*",
          syncStatus: "behind",
          sourceQuery: {
            id: "source-1",
            title: "Shadow Hundos",
            query: "shadow&4*&age0-30",
            isPublic: true,
            updatedAt: "2026-06-03T12:00:00.000Z",
            creator: {
              id: "trainer-2",
              username: "Misty",
              displayName: "Misty",
              avatarUrl: null,
              team: "mystic",
              level: 44,
            },
          },
        },
      ],
    });
  });
});

describe("GET /api/v1/users/me/following", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns trainers followed by the authenticated trainer", async () => {
    mockSelect.mockReturnValueOnce(buildWhereChain([{ id: "uuid-123" }]));
    mockSelect.mockReturnValueOnce(
      buildJoinOrderByChain([
        {
          id: "trainer-2",
          username: "Misty",
          pogoUsername: null,
          visibleUsername: "pokequery",
          team: "mystic",
          level: 42,
          trainerCode: "1111 2222 3333",
          isProfilePublic: true,
          avatarUrl: null,
          followedAt: new Date("2026-07-01T08:30:00.000Z"),
        },
      ]),
    );

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users/me/following",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      total: 1,
      following: [
        {
          id: "trainer-2",
          username: "Misty",
          displayName: "Misty",
          team: "mystic",
          level: 42,
          trainerCode: "1111 2222 3333",
          avatarUrl: null,
          followedAt: "2026-07-01T08:30:00.000Z",
        },
      ],
    });
  });
});

describe("GET /api/v1/users/by-username/:username", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns trainer profile with profile view count", async () => {
    mockSelect.mockReturnValueOnce(
      buildWhereLimitChain([
        {
          id: "trainer-1",
          username: "ash",
          pogoUsername: null,
          visibleUsername: "pokequery",
          team: "mystic",
          level: 45,
          trainerCode: "1234 5678 9012",
          avatarUrl: null,
          profileViewCount: 99,
          isProfilePublic: true,
          deactivatedAt: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]),
    );
    mockSelect.mockReturnValueOnce(
      buildWhereLimitChain([
        {
          stringCount: 10,
          forkCount: 3,
          favoriteCount: 8,
        },
      ]),
    );
    mockSelect.mockReturnValueOnce(buildWhereChain([{ count: 4 }]));

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users/by-username/ash",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id: "trainer-1",
      username: "ash",
      displayName: "ash",
      profileViewCount: 99,
      stringCount: 10,
      forkCount: 3,
      favoriteCount: 8,
      followerCount: 4,
    });
  });
});

describe("POST /api/v1/users/:id/views", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("increments and returns trainer profile view count", async () => {
    (app.db as any).update = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ viewCount: 12 }]),
        })),
      })),
    }));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/users/11111111-1111-4111-8111-111111111111/views",
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ viewCount: 12 });
  });
});
