import type { Locator, Page } from "@playwright/test";

// /forbidden
export class PlatformForbiddenPage {
  readonly page: Page;
  readonly baseUrl: string;
  readonly heading: Locator;

  constructor(page: Page, baseUrl: string) {
    this.page = page;
    this.baseUrl = baseUrl;
    this.heading = page.getByRole("heading", { name: "権限がありません" });
  }

  async goto() {
    await this.page.goto(`${this.baseUrl}/forbidden`);
  }
}
