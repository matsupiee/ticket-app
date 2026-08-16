/**
 * E2Eで使うプラットフォーム管理者メールのドメイン。
 * playwright.config.ts が `VITE_PLATFORM_ADMIN_EMAILS` にドメイン許可として渡し、
 * spec 側はこのドメインでテストごとにユニークなメールアドレスを組み立てる。
 */
export const platformAdminEmailDomain = "platform-admin.e2e.test";
