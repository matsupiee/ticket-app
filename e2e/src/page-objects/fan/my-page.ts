import type { Locator, Page } from "@playwright/test";

// /my-page
export class FanMyPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly menu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "マイページ" });
    this.menu = page.getByLabel("マイページメニュー");
  }

  async goto() {
    await this.page.goto("/my-page");
  }
}
