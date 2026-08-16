import type { Locator, Page } from "@playwright/test";

// /
export class PlatformDashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly organizerList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "プラットフォーム管理" });
    this.organizerList = page.getByLabel("主催者一覧");
  }

  async goto() {
    await this.page.goto("/");
  }
}
