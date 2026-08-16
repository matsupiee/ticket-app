import type { Locator, Page } from "@playwright/test";

// /forbidden
export class PlatformForbiddenPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly signInLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "権限がありません" });
    this.signInLink = page.getByRole("main").getByRole("link", { name: "ログインへ" });
  }

  async clickSignInLink() {
    await this.signInLink.click();
  }
}
