import { defineConfig, devices } from "@playwright/test";

import { e2eEnv } from "./utils/env";

export default defineConfig({
  testDir: "./spec",
  // fan / organizer の Page Object が未実装のため、seedシナリオのspecはまだ実行対象から外す
  testIgnore: ["**/entry-number/**"],

  // ローカルはフレーキーテストを炙り出したい → リトライなし・並列多め
  // CIは安定稼働させたい → リトライあり・並列少なめ
  fullyParallel: true,
  retries: e2eEnv.CI ? 1 : 0,
  workers: e2eEnv.CI ? 2 : 4,
  timeout: 30 * 1000,
  expect: {
    timeout: 15 * 1000,
  },
  forbidOnly: e2eEnv.CI,

  // テストが10本失敗したら停止する
  maxFailures: 10,

  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    // 購入者向けwebを既定のオリジンにする。別オリジンの管理画面は fixture から baseUrl を渡す
    baseURL: e2eEnv.webUrl,
    trace: e2eEnv.CI ? "retain-on-failure" : "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // 複数アプリを横断してテストできるよう、APIサーバーと各フロントをまとめて起動する
  webServer: [
    {
      command: "bun run dev",
      cwd: "../../apps/server",
      url: `${e2eEnv.apiServerUrl}/healthz`,
      reuseExistingServer: !e2eEnv.CI,
      timeout: 120 * 1000,
    },
    {
      command: "bun run dev",
      cwd: "../../apps/web",
      url: e2eEnv.webUrl,
      env: {
        VITE_SERVER_URL: e2eEnv.apiServerUrl,
      },
      reuseExistingServer: !e2eEnv.CI,
      timeout: 120 * 1000,
    },
    {
      command: "bun run dev",
      cwd: "../../apps/web-admin-organizer",
      url: e2eEnv.organizerAdminUrl,
      env: {
        VITE_SERVER_URL: e2eEnv.apiServerUrl,
        VITE_WEB_URL: e2eEnv.webUrl,
      },
      reuseExistingServer: !e2eEnv.CI,
      timeout: 120 * 1000,
    },
    {
      command: "bun run dev",
      cwd: "../../apps/web-admin-platform",
      url: e2eEnv.platformAdminUrl,
      env: {
        VITE_SERVER_URL: e2eEnv.apiServerUrl,
        // 許可リストにE2E用ドメインを追加し、テストごとにユニークなメールで登録できるようにする
        VITE_PLATFORM_ADMIN_EMAILS: `platform@example.com,@${e2eEnv.platformAdminEmailDomain}`,
      },
      reuseExistingServer: !e2eEnv.CI,
      timeout: 120 * 1000,
    },
  ],
});
