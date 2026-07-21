import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const webRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:4175",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run dev:bare --host 127.0.0.1 --port 4175",
    cwd: webRoot,
    env: {
      VITE_SERVER_URL: "http://127.0.0.1:4175",
    },
    reuseExistingServer: true,
    url: "http://127.0.0.1:4175",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
