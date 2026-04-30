import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { buildApp } from "../src/app.js";

const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }));

const mockRow = {
  id: "uuid-123",
  username: "AshKetchum",
  team: "mystic",
  level: 40,
  avatarUrl: null,
  queryCount: 5,
  favoriteCount: 3,
  forkCount: 2,
};

const buildSelectChain = (result: object[]) => ({
  from: vi.fn(() => ({
    leftJoin: vi.fn(function (this: any) {
      return {
        leftJoin: vi.fn(function (this: any) {
          return { where: vi.fn(() => ({ groupBy: vi.fn().mockResolvedValue(result) })) };
        }),
        where: vi.fn(() => ({ groupBy: vi.fn().mockResolvedValue(result) })),
      };
    }),
    where: vi.fn(() => ({ groupBy: vi.fn().mockResolvedValue(result) })),
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
    expect(body.username).toBe("AshKetchum");
    expect(body.team).toBe("mystic");
    expect(body.queryCount).toBe(5);
    expect(body.favoriteCount).toBe(3);
    expect(body.forkCount).toBe(2);
  });

  it("should return 404 when the trainer record does not exist", async () => {
    mockSelect.mockReturnValueOnce(buildSelectChain([]));

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      cookies: { "sb-access-token": "mock-token" },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "Trainer not found" });
  });
});
