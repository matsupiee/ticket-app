import type { Locator, Page } from "@playwright/test";

// /sign-up
export class PlatformSignUpPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // ヘッダーにも「ログイン」ボタンがあるため、フォームは main 配下に限定して指す
    const main = page.getByRole("main");
    this.heading = main.getByRole("heading", { name: "プラットフォーム管理者の新規登録" });
    this.nameInput = main.getByLabel("名前");
    this.emailInput = main.getByLabel("メールアドレス");
    this.passwordInput = main.getByLabel("パスワード");
    this.submitButton = main.getByRole("button", { name: "登録" });
  }

  async goto() {
    await this.page.goto("/sign-up");
  }

  async fillAccount(args: { name: string; email: string; password: string }) {
    await this.nameInput.fill(args.name);
    await this.emailInput.fill(args.email);
    await this.passwordInput.fill(args.password);
  }

  async clickSubmit() {
    await this.submitButton.click();
  }
}
