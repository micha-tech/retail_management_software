import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "server-only": fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)), "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["tests/integration/**/*.test.ts"], setupFiles: ["./tests/integration/setup.ts"], testTimeout: 30_000, hookTimeout: 30_000, sequence: { concurrent: false } },
});
