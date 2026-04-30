import { expect, test, describe, beforeAll, afterAll, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { supabase } from "../src/lib/supabase.js";

describe("Authentication Flow", () => {
  let app: any;
  const testEmail = "trainer@example.com";

  beforeAll(async () => {
    app = await buildApp();
    // Mock the db insert used by /verify to upsert the trainer row
    app.db.insert = vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn().mockResolvedValue([]),
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      })),
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  test("Step 1: POST /login sends OTP", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: testEmail },
    });

    expect(res.statusCode).toBe(200);
  });

  test("Step 2: POST /verify sets the cookie", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/verify",
      payload: {
        email: testEmail,
        token: "123456", // In a real test, you'd mock the Supabase response
      },
    });

    expect(res.statusCode).toBe(200);
    // Check if the cookie was set in the response headers
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  test("Step 3: GET /api/v1/users/me works with the cookie", async () => {
    // 1. Get a valid cookie from a simulated verify
    const verifyRes = await app.inject({
      method: "POST",
      url: "/auth/verify",
      payload: { email: testEmail, token: "123456" },
    });

    const cookie = verifyRes.cookies[0];

    // 2. Mock db selects used by the /me handler (single joined query)
    const mockRow = {
      id: "uuid-123",
      username: "AshKetchum",
      team: null,
      level: 1,
      avatarUrl: null,
      queryCount: 0,
      favoriteCount: 0,
      forkCount: 0,
    };
    app.db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({ groupBy: vi.fn().mockResolvedValue([mockRow]) })),
          })),
        })),
      })),
    }));

    // 3. Use that cookie to access the protected route
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/users/me",
      cookies: {
        [cookie.name]: cookie.value,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const user = meRes.json();
    expect(user.id).toBe("uuid-123");
  });
});

describe("Authenticated Routes", () => {
  let app: any;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  test("should return 201 when a valid session is mocked", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: "trainer-123", email: "ash@ketchum.com" } },
      error: null,
    });

    app.db.insert = vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: "new-query-id" }]),
      })),
    }));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "any-fake-token" },
      payload: { title: "Pikachu Finder", query: "pikachu", isPublic: false },
    });

    expect(response.statusCode).toBe(201);
  });

  test("should return 401 when Supabase returns an error", async () => {
    // 3. Setup the "Failure" mock
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid ticket" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "expired-token" },
      payload: { title: "Hundo Hunt", query: "4*" },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body).error).toBe("Invalid Session");
  });
});
