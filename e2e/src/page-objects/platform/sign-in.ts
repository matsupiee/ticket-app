import type { Locator, Page } from "@playwright/test";

// /sign-in
export class PlatformSignInPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // ヘッダーにも「ログイン」ボタンがあるため、フォームは main 配下に限定して指す
    const main = page.getByRole("main");
    this.heading = main.getByRole("heading", { name: "プラットフォーム管理ログイン" });
    this.emailInput = main.getByLabel("メールアドレス");
    this.passwordInput = main.getByLabel("パスワード");
    this.submitButton = main.getByRole("button", { name: "ログイン" });
  }

  async goto() {
    await this.page.goto("/sign-in");
  }

  async fillCredentials(args: { email: string; password: string }) {
    await this.emailInput.fill(args.email);
    await this.passwordInput.fill(args.password);
  }

  async clickSubmit() {
    await this.submitButton.click();
  }
}
