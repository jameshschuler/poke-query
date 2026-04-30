import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { buildApp } from "../src/app.js";

describe("Queries Endpoint", () => {
  let app: any;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
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
    let capturedValues: any;
    app.db.insert = vi.fn(() => ({
      values: vi.fn((v: any) => {
        capturedValues = v;
        return { returning: vi.fn().mockResolvedValue([{ id: "new-query-id" }]) };
      }),
    }));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/queries",
      cookies: { "sb-access-token": "MOCK_TOKEN_HERE" },
      payload: {
        title: "PvP Hundo",
        query: "4*&cp-1500",
        isPublic: false,
      },
    });

    expect(response.statusCode).toBe(201);
    // Verify the pogo-parser generated the correct autoTags before insert
    expect(capturedValues.metadata.autoTags).toContain("high-iv");
    expect(capturedValues.metadata.autoTags).toContain("pvp");
  });
});
