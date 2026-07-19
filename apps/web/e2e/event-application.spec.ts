import { expect, test } from "@playwright/test";

test("ユーザーがイベント詳細からチケット申し込みを完了できる", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "イベントを探す" })).toBeVisible();
  await page.getByRole("link", { name: "詳細を見る" }).first().click();

  await expect(page.getByRole("heading", { name: "TOKYO ORBIT 2026" })).toBeVisible();
  await page.getByRole("link", { name: "チケットを申し込む" }).click();

  await expect(page.getByRole("heading", { name: "チケット申し込み" })).toBeVisible();
  await page.getByLabel("枚数").selectOption("2");
  await expect(page.getByLabel("申し込み金額")).toContainText("￥24,660");

  await page.getByRole("button", { name: "申し込み内容を確定" }).click();

  await expect(page.getByRole("heading", { name: "申し込みが完了しました" })).toBeVisible();
  await expect(page.getByText("TOKYO ORBIT 2026")).toBeVisible();
  await expect(page.getByText("￥24,660")).toBeVisible();
});
