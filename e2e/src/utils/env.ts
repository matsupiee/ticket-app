const isCi = process.env.CI === "true" || process.env.CI === "1";

/**
 * E2Eの実行対象。ローカルの既定ポートを使い、必要なら環境変数で上書きする。
 * `platformAdminEmailDomain` は、テストごとにユニークなメールアドレスで
 * プラットフォーム管理者を新規登録するためのドメイン。
 * playwright.config.ts が `VITE_PLATFORM_ADMIN_EMAILS` の許可リストへ渡す。
 */
export const e2eEnv = {
  CI: isCi,
  apiServerUrl: process.env.E2E_API_SERVER_URL ?? "http://localhost:3000",
  webUrl: process.env.E2E_WEB_URL ?? "http://localhost:3001",
  organizerAdminUrl: process.env.E2E_ORGANIZER_ADMIN_URL ?? "http://localhost:3002",
  platformAdminUrl: process.env.E2E_PLATFORM_ADMIN_URL ?? "http://localhost:3003",
  platformAdminEmailDomain: "platform-admin.e2e.test",
};
