import { expect, test, describe, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { supabase } from "../src/lib/supabase.js";

describe("Authentication Flow", () => {
  let app: any;
  const testEmail = "trainer@example.com";

  beforeAll(async () => {
    app = await buildApp();
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

  test("Step 3: GET /me works with the cookie", async () => {
    // 1. First, we get a valid cookie from a simulated verify
    const verifyRes = await app.inject({
      method: "POST",
      url: "/auth/verify",
      payload: { email: testEmail, token: "123456" },
    });

    const cookie = verifyRes.cookies[0]; // Fastify inject parses cookies for you!

    // 2. Now use that cookie to access the protected route
    const meRes = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: {
        [cookie.name]: cookie.value,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const user = JSON.parse(meRes.payload);
    expect(user.email).toBe(testEmail);
  });
});

describe("Authenticated Routes", () => {
  let app: any;

  beforeAll(async () => {
    app = await buildApp();
  });

  test("should return 201 when a valid session is mocked", async () => {
    // 2. Setup the "Happy Path" mock
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: "trainer-123", email: "ash@ketchum.com" } },
      error: null,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "any-fake-token" },
      payload: { title: "Pikachu Finder", query: "pikachu" },
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
