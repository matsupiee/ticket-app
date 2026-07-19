import { expect, test } from "@playwright/test";

async function mockSession(page: import("@playwright/test").Page, email: string | null) {
  await page.route("**/api/auth/get-session*", async (route) => {
    if (!email) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(null),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        session: {
          id: "platform-session",
          userId: "platform-admin",
          token: "platform-session-token",
          createdAt: "2026-07-19T00:00:00.000Z",
          updatedAt: "2026-07-19T00:00:00.000Z",
          expiresAt: "2026-07-20T00:00:00.000Z",
        },
        user: {
          id: "platform-admin",
          name: "平台管理者",
          email,
          emailVerified: true,
          createdAt: "2026-07-19T00:00:00.000Z",
          updatedAt: "2026-07-19T00:00:00.000Z",
        },
      }),
    });
  });
}

test("平台管理者が主催者一覧と月別売上を確認できる", async ({ page }) => {
  await mockSession(page, "platform@example.com");

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "プラットフォーム管理" })).toBeVisible();
  await expect(page.getByLabel("総流通額")).toContainText("￥13,971,600");

  await page.getByRole("link", { name: "Orbit Works" }).click();
  await expect(page.getByRole("heading", { name: "主催者詳細" })).toBeVisible();
  await expect(page.getByText("リスク: LOW")).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "月別売上" }).click();
  await expect(page.getByRole("heading", { name: "月別売上一覧" })).toBeVisible();
  await expect(page.getByText("2026年9月")).toBeVisible();
  await expect(page.getByText("￥8,495,280")).toBeVisible();
});

test("未ログインの場合はログイン画面へ誘導する", async ({ page }) => {
  await mockSession(page, null);

  await page.goto("/sales");

  await expect(page.getByRole("heading", { name: "平台管理ログイン" })).toBeVisible();
});

test("許可されていないユーザーは平台管理画面を開けない", async ({ page }) => {
  await mockSession(page, "customer@example.com");

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "権限がありません" })).toBeVisible();
});
