import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  test: {
    environment: "node",
    include: ["src/**/*.unit.test.ts"],
    // 現時点の apps/web には unit テスト対象の純粋関数が無いため、0件でも失敗させない
    passWithNoTests: true,
  },
});
