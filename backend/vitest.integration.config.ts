import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig({
  test: {
    env: loadEnv("test", process.cwd(), ""),
    globals: true,
    environment: "node",
    fileParallelism: false,
    include: ["test/integration/**/*.test.ts"],
    setupFiles: ["./test/integration/setup.ts"],
  },
});
