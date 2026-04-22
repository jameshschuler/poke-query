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

describe("Delete Query Endpoint", () => {
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

  it("rejects deletes when no auth cookie is present", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/api/v1/queries/query-id",
    });

    expect(response.statusCode).toBe(401);
  });

  it("allows creators to delete their own queries", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "query-id" }]);
    const where = vi.fn(() => ({ returning }));
    app.db.delete = vi.fn(() => ({ where }));

    const response = await app.inject({
      method: "DELETE",
      url: "/api/v1/queries/query-id",
      cookies: { "sb-access-token": "owner-token" },
    });

    expect(response.statusCode).toBe(204);
    expect(app.db.delete).toHaveBeenCalled();
    expect(where).toHaveBeenCalled();
    expect(returning).toHaveBeenCalled();
  });

  it("returns 404 when a different user tries to delete the query", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn(() => ({ returning }));
    app.db.delete = vi.fn(() => ({ where }));

    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: otherUserId, email: "misty@example.com" } },
      error: null,
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/api/v1/queries/query-id",
      cookies: { "sb-access-token": "other-user-token" },
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).error).toBe("Query not found or not owned by user");
  });
});
