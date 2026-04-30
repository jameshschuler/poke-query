import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const ownerId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: vi.fn(() => Promise.resolve({ error: null })),
      verifyOtp: vi.fn(() =>
        Promise.resolve({
          data: {
            session: {
              access_token: "mock-token",
              refresh_token: "mock-refresh",
            },
            user: { id: ownerId, email: "trainer@example.com" },
          },
          error: null,
        }),
      ),
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: ownerId, email: "trainer@example.com" } },
          error: null,
        }),
      ),
    },
  }),
}));

import { buildApp } from "../src/app.js";
import { supabase } from "../src/lib/supabase.js";

describe("Edit Query Endpoint", () => {
  let app: any;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: ownerId, email: "trainer@example.com" } },
      error: null,
    });
  });

  it("rejects edits when no auth cookie is present", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/queries/query-id",
      payload: {
        title: "Updated Title",
        query: "4*&cp-1500",
        description: "Updated description",
        isPublic: true,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("allows creators to edit their own queries", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "query-id" }]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    app.db.update = vi.fn(() => ({ set }));

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/queries/query-id",
      cookies: { "sb-access-token": "owner-token" },
      payload: {
        title: "Updated Title",
        query: "4*&cp-1500",
        description: "Updated description",
        isPublic: true,
        copyCount: 999,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ id: "query-id" });
    expect(app.db.update).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith({
      title: "Updated Title",
      query: "4*&cp-1500",
      description: "Updated description",
      isPublic: true,
      metadata: {
        autoTags: ["high-iv", "pvp"],
        complexity: "advanced",
        recommendsEvolution: false,
        leagues: ["Great"],
      },
    });
    expect(where).toHaveBeenCalled();
    expect(returning).toHaveBeenCalled();
  });

  it("returns 404 when a different user tries to edit the query", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    app.db.update = vi.fn(() => ({ set }));

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: otherUserId, email: "misty@example.com" } },
      error: null,
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/queries/query-id",
      cookies: { "sb-access-token": "other-user-token" },
      payload: {
        title: "Updated Title",
        query: "pikachu",
        description: "Updated description",
        isPublic: false,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).error).toBe("Query not found or not owned by user");
  });
});
