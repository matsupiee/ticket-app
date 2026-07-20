import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  test: {
    environment: "node",
    globalSetup: ["./src/test/global-setup.ts"],
    hookTimeout: 120_000,
    include: ["src/**/*.integration.test.ts"],
    testTimeout: 120_000,
  },
});
