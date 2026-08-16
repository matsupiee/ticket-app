import { expect, test } from "../../fixtures/app.fixture";
import { e2eEnv } from "../../utils/env";

// プラットフォーム管理者の許可リスト（VITE_PLATFORM_ADMIN_EMAILS）は playwright.config.ts で
// `@platform-admin.e2e.test` ドメインを許可している。
test.describe("プラットフォーム管理者の新規登録・ログイン", () => {
  test("未登録の管理者が新規登録すると、そのままプラットフォーム管理画面を開ける。", async ({
    app,
    page,
  }) => {
    const email = `platform-signup-${Date.now()}@${e2eEnv.platformAdminEmailDomain}`;
    const password = "platform-e2e-password";

    await test.step("新規登録ページを開く。", async () => {
      await app.platform.signUp().goto();
      await expect(app.platform.signUp().heading).toBeVisible();
    });

    await test.step("名前・メールアドレス・パスワードを入力して登録する。", async () => {
      await app.platform.signUp().fillAccount({ name: "運営 太郎", email, password });
      await app.platform.signUp().clickSubmit();
    });

    await test.step("主催者一覧ページに遷移し、主催者一覧が表示されることを確認する。", async () => {
      await expect(page).toHaveURL(`${e2eEnv.platformAdminUrl}/organizers`);
      await expect(app.platform.organizerList().heading).toBeVisible();
      await expect(app.platform.organizerList().list).toBeVisible();
    });
  });

  test("登録済みの管理者がログインすると、プラットフォーム管理画面を開ける。", async ({
    app,
    page,
    request,
  }) => {
    const email = `platform-signin-${Date.now()}@${e2eEnv.platformAdminEmailDomain}`;
    const password = "platform-e2e-password";

    await test.step("ログイン対象の管理者アカウントを事前に作成する。", async () => {
      const response = await request.post(`${e2eEnv.apiServerUrl}/api/auth/sign-up/email`, {
        data: { name: "運営 花子", email, password },
      });

      expect(response.ok()).toBe(true);
    });

    await test.step("ログインページを開く。", async () => {
      await app.platform.signIn().goto();
      await expect(app.platform.signIn().heading).toBeVisible();
    });

    await test.step("メールアドレスとパスワードでログインする。", async () => {
      await app.platform.signIn().fillCredentials({ email, password });
      await app.platform.signIn().clickSubmit();
    });

    await test.step("主催者一覧ページに遷移し、主催者一覧が表示されることを確認する。", async () => {
      await expect(page).toHaveURL(`${e2eEnv.platformAdminUrl}/organizers`);
      await expect(app.platform.organizerList().heading).toBeVisible();
      await expect(app.platform.organizerList().list).toBeVisible();
    });
  });

  test("許可されていないメールアドレスで登録した場合、プラットフォーム管理画面を開けない。", async ({
    app,
    page,
  }) => {
    // 許可リストに含まれないドメインのメールアドレスで登録する
    const email = `outsider-${Date.now()}@not-allowed.e2e.test`;
    const password = "platform-e2e-password";

    await test.step("新規登録ページから、許可されていないメールアドレスで登録する。", async () => {
      await app.platform.signUp().goto();
      await app.platform.signUp().fillAccount({ name: "部外者 次郎", email, password });
      await app.platform.signUp().clickSubmit();
    });

    await test.step("権限エラーページに遷移することを確認する。", async () => {
      await expect(page).toHaveURL(`${e2eEnv.platformAdminUrl}/forbidden`);
      await expect(app.platform.forbidden().heading).toBeVisible();
    });

    await test.step("ログインページへの導線が表示されることを確認する。", async () => {
      await app.platform.forbidden().clickSignInLink();
      await expect(page).toHaveURL(`${e2eEnv.platformAdminUrl}/sign-in`);
      await expect(app.platform.signIn().heading).toBeVisible();
    });
  });
});
