import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";

describe("Queries Endpoint", () => {
  let app: any;

  beforeAll(async () => {
    app = await buildApp();
  });

  it("should reject a query if no auth cookie is present", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      payload: { title: "Test", query: "4*" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("should successfully save a query and generate metadata autoTags", async () => {
    // Mock the auth check or provide a valid-looking cookie if possible
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "MOCK_TOKEN_HERE" },
      payload: {
        title: "PvP Hundo",
        query: "4*&cp-1500",
      },
    });

    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(201);
    // Verify our Regex logic worked!
    expect(body.metadata.autoTags).toContain("high-iv");
    expect(body.metadata.autoTags).toContain("pvp");
  });
});
