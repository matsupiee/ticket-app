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
          id: "organizer-session",
          userId: "organizer-admin",
          token: "organizer-session-token",
          createdAt: "2026-07-19T00:00:00.000Z",
          updatedAt: "2026-07-19T00:00:00.000Z",
          expiresAt: "2026-07-20T00:00:00.000Z",
        },
        user: {
          id: "organizer-admin",
          name: "主催者管理者",
          email,
          emailVerified: true,
          createdAt: "2026-07-19T00:00:00.000Z",
          updatedAt: "2026-07-19T00:00:00.000Z",
        },
      }),
    });
  });
}

test("主催者がイベント設定、売上、精算を確認できる", async ({ page }) => {
  await mockSession(page, "organizer@example.com");

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "主催者ダッシュボード" })).toBeVisible();
  await expect(page.getByLabel("総売上")).toContainText("￥13,971,600");

  await page.getByRole("link", { name: "TOKYO ORBIT 2026" }).click();
  await expect(page.getByRole("heading", { name: "イベント設定" })).toBeVisible();
  await expect(page.getByLabel("販売状態")).toHaveValue("ON_SALE");

  await page.getByRole("link", { name: "売上", exact: true }).click();
  await expect(page.getByRole("heading", { name: "売上ダッシュボード" })).toBeVisible();
  await expect(page.getByLabel("販売中イベント売上")).toContainText("￥8,942,400");

  await page.getByRole("link", { name: "精算" }).click();
  await expect(page.getByRole("heading", { name: "精算一覧" })).toBeVisible();
  await expect(page.getByText("次回精算予定")).toBeVisible();
  await expect(page.getByLabel("次回精算予定")).toContainText("￥8,495,280");
});

test("未ログインの場合はログイン画面へ誘導する", async ({ page }) => {
  await mockSession(page, null);

  await page.goto("/sales");

  await expect(page.getByRole("heading", { name: "主催者ログイン" })).toBeVisible();
});

test("許可されていないユーザーは主催者管理画面を開けない", async ({ page }) => {
  await mockSession(page, "customer@example.com");

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "権限がありません" })).toBeVisible();
});
