import type { Locator, Page } from "@playwright/test";

// /organizers
export class PlatformOrganizerListPage {
  readonly page: Page;
  readonly baseUrl: string;
  readonly heading: Locator;
  readonly list: Locator;

  constructor(page: Page, baseUrl: string) {
    this.page = page;
    this.baseUrl = baseUrl;
    this.heading = page.getByRole("heading", { name: "プラットフォーム管理" });
    this.list = page.getByLabel("主催者一覧");
  }

  async goto() {
    await this.page.goto(`${this.baseUrl}/organizers`);
  }
}
