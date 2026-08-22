import type { Locator, Page } from "@playwright/test";

// /
export class OrganizerDashboardPage {
  readonly page: Page;
  readonly baseUrl: string;
  readonly heading: Locator;

  constructor(page: Page, baseUrl: string) {
    this.page = page;
    this.baseUrl = baseUrl;
    this.heading = page.getByRole("heading", { name: "主催者ダッシュボード" });
  }

  async goto() {
    await this.page.goto(`${this.baseUrl}/`);
  }
}
