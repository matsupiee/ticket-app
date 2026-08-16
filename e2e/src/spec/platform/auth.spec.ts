import { db, disconnectDb } from "@ticket-app/db";

import { expect, test } from "../../fixtures/app.fixture";
import { e2eEnv } from "../../utils/env";

test.afterAll(async () => {
  await disconnectDb();
});

test.describe("プラットフォーム管理者の新規登録・ログイン", () => {
  test("プラットフォーム管理者として登録されていないユーザーは、新規登録しても管理画面を開けない。", async ({
    app,
    page,
  }) => {
    const email = `platform-signup-${Date.now()}@example.com`;
    const password = "platform-e2e-password";

    await test.step("新規登録ページを開く。", async () => {
      await app.platform.signUp().goto();
      await expect(app.platform.signUp().heading).toBeVisible();
    });

    await test.step("名前・メールアドレス・パスワードを入力して登録する。", async () => {
      await app.platform.signUp().fillAccount({ name: "運営 太郎", email, password });
      await app.platform.signUp().clickSubmit();
    });

    await test.step("権限エラーページに遷移し、主催者一覧を開けないことを確認する。", async () => {
      await expect(page).toHaveURL(`${e2eEnv.platformAdminUrl}/forbidden`);
      await expect(app.platform.forbidden().heading).toBeVisible();
    });
  });

  test("プラットフォーム管理者として登録済みのユーザーがログインすると、プラットフォーム管理画面を開ける。", async ({
    app,
    page,
    request,
  }) => {
    const email = `platform-signin-${Date.now()}@example.com`;
    const password = "platform-e2e-password";

    await test.step("ログイン対象の管理者アカウントを事前に作成する。", async () => {
      const response = await request.post(`${e2eEnv.apiServerUrl}/api/auth/sign-up/email`, {
        data: { name: "運営 花子", email, password },
      });

      expect(response.ok()).toBe(true);

      const { user } = (await response.json()) as { user: { id: string } };

      await db.platformMember.create({
        data: {
          userId: user.id,
          role: "OPERATOR",
        },
      });
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

  test("未ログインで管理画面を開くと、ログインページに戻される。", async ({ app, page }) => {
    await test.step("未ログインの状態で主催者一覧ページを開く。", async () => {
      await app.platform.organizerList().goto();
    });

    await test.step("ログインページに遷移することを確認する。", async () => {
      await expect(page).toHaveURL(`${e2eEnv.platformAdminUrl}/sign-in`);
      await expect(app.platform.signIn().heading).toBeVisible();
    });
  });
});
