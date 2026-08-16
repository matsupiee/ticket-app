import { expect, test } from "../../fixtures/app.fixture";
import { e2eEnv } from "../../utils/env";

test.describe("購入者の新規登録・ログイン", () => {
  test("未登録の購入者が新規登録すると、そのままマイページを開ける。", async ({ app, page }) => {
    const email = `fan-signup-${Date.now()}@example.com`;
    const password = "fan-e2e-password";

    await test.step("新規登録ページを開く。", async () => {
      await app.fan.signUp().goto();
      await expect(app.fan.signUp().heading).toBeVisible();
    });

    await test.step("名前・メールアドレス・パスワードを入力して登録する。", async () => {
      await app.fan.signUp().fillAccount({ name: "購入 太郎", email, password });
      await app.fan.signUp().clickSubmit();
    });

    await test.step("マイページに遷移し、メニューが表示されることを確認する。", async () => {
      await expect(page).toHaveURL(`${e2eEnv.webUrl}/my-page`);
      await expect(app.fan.myPage().heading).toBeVisible();
      await expect(app.fan.myPage().menu).toBeVisible();
      await expect(page.getByText("購入 太郎 さんのアカウント情報です。")).toBeVisible();
    });
  });

  test("登録済みの購入者がログインすると、マイページを開ける。", async ({ app, page, request }) => {
    const email = `fan-signin-${Date.now()}@example.com`;
    const password = "fan-e2e-password";

    await test.step("ログイン対象の購入者アカウントを事前に作成する。", async () => {
      const response = await request.post(`${e2eEnv.apiServerUrl}/api/auth/sign-up/email`, {
        data: { name: "購入 花子", email, password },
      });

      expect(response.ok()).toBe(true);
    });

    await test.step("ログインページを開く。", async () => {
      await app.fan.signIn().goto();
      await expect(app.fan.signIn().heading).toBeVisible();
    });

    await test.step("メールアドレスとパスワードでログインする。", async () => {
      await app.fan.signIn().fillCredentials({ email, password });
      await app.fan.signIn().clickSubmit();
    });

    await test.step("マイページに遷移し、メニューが表示されることを確認する。", async () => {
      await expect(page).toHaveURL(`${e2eEnv.webUrl}/my-page`);
      await expect(app.fan.myPage().heading).toBeVisible();
      await expect(app.fan.myPage().menu).toBeVisible();
    });
  });

  test("未ログインでマイページを開くと、ログインページに戻される。", async ({ app, page }) => {
    await test.step("未ログインの状態でマイページを開く。", async () => {
      await app.fan.myPage().goto();
    });

    await test.step("ログインページに遷移することを確認する。", async () => {
      await expect(page).toHaveURL(`${e2eEnv.webUrl}/sign-in`);
      await expect(app.fan.signIn().heading).toBeVisible();
    });
  });
});
