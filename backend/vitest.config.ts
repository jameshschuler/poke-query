import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig({
  test: {
    env: loadEnv("", process.cwd(), ""),
    globals: true,
    environment: "node",
  },
});
