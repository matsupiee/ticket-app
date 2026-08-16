import { defineConfig, devices } from "@playwright/test";

import { platformAdminEmailDomain } from "../../e2e/src/utils/platform-admin-email-domain";

const apiServerUrl = "http://localhost:3000";
const platformAdminUrl = "http://localhost:3003";

export default defineConfig({
  testDir: "../../e2e/src/spec/platform",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: platformAdminUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "bun run dev",
      cwd: "../server",
      url: `${apiServerUrl}/healthz`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "bun run dev",
      cwd: ".",
      url: platformAdminUrl,
      // プラットフォーム管理者の許可リストにE2E用ドメインを追加し、テストごとにユニークなメールで登録できるようにする
      env: {
        VITE_SERVER_URL: apiServerUrl,
        VITE_PLATFORM_ADMIN_EMAILS: `platform@example.com,@${platformAdminEmailDomain}`,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
