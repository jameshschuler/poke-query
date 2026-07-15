import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { buildApp } from "../src/app.js";

describe("Health endpoint", () => {
  let app: any;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  test("GET /health returns service health payload", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("poke-query-backend");
    expect(typeof body.uptimeSeconds).toBe("number");
    expect(typeof body.startedAt).toBe("string");
    expect(typeof body.now).toBe("string");
  });
});
