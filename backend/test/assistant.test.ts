import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";

describe("Assistant Endpoint", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  const originalGeminiApiKey = process.env.GEMINI_API_KEY;

  beforeAll(async () => {
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "test-gemini-key";
    app = await buildApp();
  });

  afterAll(async () => {
    if (originalGeminiApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalGeminiApiKey;
    }

    vi.restoreAllMocks();
    await app.close();
  });

  it("should reject generation when no auth session is present", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/assistant/search-string/generate",
      payload: {
        prompt: "Best counters for shadow groudon?",
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("should reject short prompts", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/assistant/search-string/generate",
      cookies: { "sb-access-token": "MOCK_TOKEN_HERE" },
      payload: {
        prompt: "hi",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should generate a result payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: "Shadow Groudon Counters",
                    query: "4*&shadow&!traded",
                    description: "Shadow-friendly attackers for Groudon raids.",
                    tags: ["raid", "shadow"],
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as Response);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/assistant/search-string/generate",
      cookies: { "sb-access-token": "MOCK_TOKEN_HERE" },
      payload: {
        prompt: "Best counters for shadow groudon?",
        mode: "raids",
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.resultId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(body.title.length).toBeGreaterThan(2);
    expect(body.query.length).toBeGreaterThan(0);
    expect(Array.isArray(body.tags)).toBe(true);
    expect(body.title).toBe("Shadow Groudon Counters");
    expect(body.description).toBe("Shadow-friendly attackers for Groudon raids.");
    expect(body.tags).toEqual(["raid", "shadow"]);
    expect(body.provider).toBe("gemini");
    expect(body.model.length).toBeGreaterThan(0);
  });
});
