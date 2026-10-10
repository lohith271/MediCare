import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Test-only secret so signed share/emergency tokens can be created. Not used in deployments.
    env: { SESSION_SECRET: "test-only-session-secret-do-not-use-in-production" },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
    },
  },
});
