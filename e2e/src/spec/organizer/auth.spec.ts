import { expect, test } from "../../fixtures/app.fixture";
import { e2eEnv } from "../../utils/env";

test.describe("主催者の新規登録・ログイン", () => {
  test("未登録の主催者が新規登録すると、そのまま主催者ダッシュボードを開ける。", async ({
    app,
    page,
  }) => {
    const suffix = Date.now();
    const email = `organizer-signup-${suffix}@example.com`;
    const password = "organizer-e2e-password";
    const organizerName = `E2E主催者 新規登録 ${suffix}`;

    await test.step("新規登録ページを開く。", async () => {
      await app.organizer.signUp().goto();
      await expect(app.organizer.signUp().heading).toBeVisible();
    });

    await test.step("名前・主催者名・メールアドレス・パスワードを入力して登録する。", async () => {
      await app.organizer.signUp().fillAccount({
        name: "主催 太郎",
        organizerName,
        email,
        password,
      });
      await app.organizer.signUp().clickSubmit();
    });

    await test.step("主催者ダッシュボードに遷移することを確認する。", async () => {
      await expect(page).toHaveURL(`${e2eEnv.organizerAdminUrl}/`);
      await expect(app.organizer.dashboard().heading).toBeVisible();
    });
  });

  test("登録済みの主催者がログインすると、主催者ダッシュボードを開ける。", async ({
    app,
    page,
    request,
  }) => {
    const suffix = Date.now();
    const email = `organizer-signin-${suffix}@example.com`;
    const password = "organizer-e2e-password";
    const organizerName = `E2E主催者 ログイン ${suffix}`;
    let cookie = "";

    await test.step("ログイン対象のユーザーアカウントを事前に作成する。", async () => {
      const response = await request.post(`${e2eEnv.apiServerUrl}/api/auth/sign-up/email`, {
        data: { name: "主催 花子", email, password },
      });

      expect(response.ok()).toBe(true);

      cookie = response
        .headersArray()
        .filter((header) => header.name.toLowerCase() === "set-cookie")
        .map((header) => header.value.split(";")[0])
        .join("; ");
      expect(cookie).not.toBe("");
    });

    await test.step("そのユーザーの主催者アカウントを事前に作成する。", async () => {
      const response = await request.post(`${e2eEnv.apiServerUrl}/rpc/organizer/account/signUp`, {
        headers: { cookie, origin: e2eEnv.organizerAdminUrl },
        data: { json: { organizerName } },
      });

      expect(response.ok()).toBe(true);
    });

    await test.step("ログインページを開く。", async () => {
      await app.organizer.signIn().goto();
      await expect(app.organizer.signIn().heading).toBeVisible();
    });

    await test.step("メールアドレスとパスワードでログインする。", async () => {
      await app.organizer.signIn().fillCredentials({ email, password });
      await app.organizer.signIn().clickSubmit();
    });

    await test.step("主催者ダッシュボードに遷移することを確認する。", async () => {
      await expect(page).toHaveURL(`${e2eEnv.organizerAdminUrl}/`);
      await expect(app.organizer.dashboard().heading).toBeVisible();
    });
  });

  test("主催者アカウントを持たないユーザーがログインすると、権限エラーになる。", async ({
    app,
    page,
    request,
  }) => {
    const email = `organizer-no-account-${Date.now()}@example.com`;
    const password = "organizer-e2e-password";

    await test.step("主催者アカウントを作らずにユーザーだけ作成する。", async () => {
      const response = await request.post(`${e2eEnv.apiServerUrl}/api/auth/sign-up/email`, {
        data: { name: "主催者未登録 次郎", email, password },
      });

      expect(response.ok()).toBe(true);
    });

    await test.step("ログインページからログインする。", async () => {
      await app.organizer.signIn().goto();
      await app.organizer.signIn().fillCredentials({ email, password });
      await app.organizer.signIn().clickSubmit();
    });

    await test.step("権限がないことを伝えるページに遷移することを確認する。", async () => {
      await expect(page).toHaveURL(`${e2eEnv.organizerAdminUrl}/forbidden`);
      await expect(app.organizer.forbidden().heading).toBeVisible();
    });
  });

  test("未ログインで主催者ダッシュボードを開くと、ログインページに戻される。", async ({
    app,
    page,
  }) => {
    await test.step("未ログインの状態で主催者ダッシュボードを開く。", async () => {
      await app.organizer.dashboard().goto();
    });

    await test.step("ログインページに遷移することを確認する。", async () => {
      await expect(page).toHaveURL(`${e2eEnv.organizerAdminUrl}/sign-in`);
      await expect(app.organizer.signIn().heading).toBeVisible();
    });
  });
});
