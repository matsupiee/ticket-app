# Playwright Page Object 規約

このファイルは Page Object（POM）を作成するときの規約。
SKILL.md ワークフローの「Page Object 抽出」ステップで参照する。

---

## いつ切り出すか

サブエージェント への指示で、**最初に既存の `tests/shared/playwright/pages/<actor>/` を確認** させる。

- 既存 POM があれば **再利用**（サブエージェント にパス一覧を渡す）
- 既存 POM が無ければ、**新規作成**

---

## Page Object の厚み・責務

POM は薄く保つ。locator の宣言と単一 UI 操作（click, fill 等）だけを持つ。

- **デフォルト値の自動補完は避ける**（未指定フィールドを勝手に埋めて「なんとなく通す」メソッドにしない）
- **業務ルールを持たせない**（手数料計算、販売条件、期待金額などは spec 側で明示する）
- **helper を賢くしない**（分岐だらけ・環境依存の特例埋め込みは spec 側またはテスト用ユーティリティへ）
- **env 参照禁止**: `e2eEnv` 等の環境変数を POM に直接 import しない（credentials は呼び出し元から引数で渡す）
- **シナリオ禁止**: `loginAsFan` のような複数段操作 + 検証をまとめた「シナリオ」は POM に入れない
- **`goto()` は相対パスで書く**: `await this.page.goto('/signup')` のように相対パスを使い、baseURL は `playwright.config.ts` 側で設定する

### 悪い例

呼び出し側で何を入力したかが明示的に読み取れないのは避ける

```ts
// 悪い例: 引数に空オブジェクトを渡せば、POM側がデフォルト値を勝手に埋めてくれる
await eventPage.fillStage({});

// 最悪な例: 複数画面・複数ステップ・データ入力までを1メソッドに丸ごと隠し、シナリオや業務ルールが spec から読めなくなる
await eventPage.createEvent();
```

### 良い例

```ts
// 良い例: spec 側で明示的に引数を渡す必要がある
await eventPage.fillStage({
  date: futureDate,
  venueName: "Shibuya O-EAST",
});
```

---

## ディレクトリ規約（freee 流）

[freeeの記事](https://developers.freee.co.jp/entry/freee-qa-advent-calendar2024-day11)

POM は **E2E と VRT の共通資産** として `tests/shared/playwright/pages/` に置く。
URL パスに完全に対応させる。

```
tests/shared/playwright/pages
├─ fan/
│  ├─ signup.ts            ← /signup
│  ├─ signin.ts            ← /signin
│  ├─ account/
│  │  ├─ index.ts          ← /account
│  │  └─ payment.ts        ← /account/payment
│  └─ event/
│     └─ [id].ts           ← /event/[id]
│
└─ admin/
   └─ event/
      └─ new/
         └─ `.ts           ← /event/new/1
```

---

## メソッドの粒度

**1 メソッド = 1 操作**。複数ステップを 1 メソッドに束ねない。

- ボタンクリック・モーダル処理・URL 待機はそれぞれ独立したメソッドにする
- spec 側で明示的に呼び出すことで、テストが何をしているかが読めるようにする

### 悪い例

```ts
// 悪い例: クリック・モーダル処理・URL待機が1メソッドに混在している
async clickNext() {
  await this.nextButton.click();
  const modal = this.page.locator('...').filter({ hasText: '...' }).getByRole('button', { name: 'OK' });
  const reached = this.page.waitForURL(/\/3(\?|$)/, { timeout: 20_000 });
  await Promise.race([reached, modal.waitFor({ state: 'visible' }).then(() => modal.click()).catch(() => {})]);
  await this.page.waitForURL(/\/3(\?|$)/, { timeout: 20_000 });
}
```

spec 側では `await step2.clickNext()` の1行だけになり、モーダルが出るかどうか・URL 遷移を待っているかどうかが読めない。

### 良い例

```ts
// 良い例: 操作を分割し、spec から意図が読める
async clickNext() {
  await this.nextButton.click();
}

async acceptDuplicateRefModalIfVisible() {
  const okButton = this.page.getByRole('button', { name: 'OK', exact: true });
  if (await okButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await okButton.click();
  }
}

async expectStep3() {
  await this.page.waitForURL(/\/3(\?|$)/, { timeout: 20_000 });
}
```

---

## 実装パターン（最小）

```ts
// tests/shared/playwright/pages/fan/signup.ts
import type { Page, Locator } from "@playwright/test";

export class SignupPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByLabel("お名前");
    this.emailInput = page.getByLabel("メールアドレス");
    this.submitButton = page.getByRole("button", { name: "登録する" });
  }

  async goto() {
    await this.page.goto("/signup");
  }

  async fillBasic(args: { name: string; email: string; password: string }) {
    await this.nameInput.fill(args.name);
    await this.emailInput.fill(args.email);
    await this.page.getByLabel("パスワード").fill(args.password);
  }
}
```
