import { config as loadDotenv } from "dotenv";
import { defineConfig } from "vitest/config";

loadDotenv({ path: ".env" });
loadDotenv({ path: ".env.local", override: true });
loadDotenv({ path: ".env.test", override: true });
loadDotenv({ path: ".env.test.local", override: true });

const testEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => typeof value === "string"),
);

export default defineConfig({
  test: {
    env: testEnv,
    globals: true,
    environment: "node",
    fileParallelism: false,
    include: ["test/integration/**/*.test.ts"],
    setupFiles: ["./test/integration/setup.ts"],
  },
});
