import type { Locator, Page } from "@playwright/test";

// /sign-up
export class OrganizerSignUpPage {
  readonly page: Page;
  readonly baseUrl: string;
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly organizerNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page, baseUrl: string) {
    this.page = page;
    this.baseUrl = baseUrl;
    // ヘッダーにも「ログイン」ボタンがあるため、フォームは main 配下に限定して指す
    const main = page.getByRole("main");
    this.heading = main.getByRole("heading", { name: "主催者登録" });
    this.nameInput = main.getByLabel("名前", { exact: true });
    this.organizerNameInput = main.getByLabel("主催者名");
    this.emailInput = main.getByLabel("メールアドレス");
    this.passwordInput = main.getByLabel("パスワード");
    this.submitButton = main.getByRole("button", { name: "登録" });
  }

  async goto() {
    await this.page.goto(`${this.baseUrl}/sign-up`);
  }

  async fillAccount(args: {
    name: string;
    organizerName: string;
    email: string;
    password: string;
  }) {
    await this.nameInput.fill(args.name);
    await this.organizerNameInput.fill(args.organizerName);
    await this.emailInput.fill(args.email);
    await this.passwordInput.fill(args.password);
  }

  async clickSubmit() {
    await this.submitButton.click();
  }
}
