import { config as loadDotenv } from "dotenv";
import { defineConfig } from "vitest/config";

loadDotenv({ path: ".env" });
loadDotenv({ path: ".env.local", override: true });

const testEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => typeof value === "string"),
);

export default defineConfig({
  test: {
    env: testEnv,
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],
  },
});
