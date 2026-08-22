import type { Locator, Page } from "@playwright/test";

// /sign-in
export class OrganizerSignInPage {
  readonly page: Page;
  readonly baseUrl: string;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page, baseUrl: string) {
    this.page = page;
    this.baseUrl = baseUrl;
    // ヘッダーにも「ログイン」ボタンがあるため、フォームは main 配下に限定して指す
    const main = page.getByRole("main");
    this.heading = main.getByRole("heading", { name: "主催者ログイン" });
    this.emailInput = main.getByLabel("メールアドレス");
    this.passwordInput = main.getByLabel("パスワード");
    this.submitButton = main.getByRole("button", { name: "ログイン" });
  }

  async goto() {
    await this.page.goto(`${this.baseUrl}/sign-in`);
  }

  async fillCredentials(args: { email: string; password: string }) {
    await this.emailInput.fill(args.email);
    await this.passwordInput.fill(args.password);
  }

  async clickSubmit() {
    await this.submitButton.click();
  }
}
