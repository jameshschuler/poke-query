import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { config } from "dotenv";

async function run() {
  config({ path: resolve(process.cwd(), ".env"), quiet: true });

  process.env.SUPABASE_URL ??= "http://localhost:54321";
  process.env.SUPABASE_ANON_KEY ??= "dev-anon-key";
  process.env.COOKIE_SECRET ??= "docs-cookie-secret";
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/postgres";

  const { buildApp } = await import("../src/app.js");
  const app = await buildApp();

  try {
    await app.ready();
    const spec = app.swagger();
    const outputPath = resolve(process.cwd(), "../docs-site/data/openapi.json");

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");

    app.log.info({ outputPath }, "OpenAPI spec exported");
    console.log(`Exported OpenAPI spec to ${outputPath}`);
  } finally {
    await app.close();
  }
}

run().catch((error) => {
  console.error("Failed to export OpenAPI spec", error);
  process.exitCode = 1;
});
