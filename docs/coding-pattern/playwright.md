# playwright コーディング規約

このファイルは spec / Page Object を実装するときの規約。
SKILL.md のワークフローから コード実装を行うサブエージェント を起動する際に、必ずこのファイルへの参照を渡す。

---

## ロケーター（優先順位）

1. `getByRole('button', { name: '...' })`
2. `getByLabel('...')` / `getByPlaceholder('...')`
3. `getByText('...')`（完全一致または正規表現）
4. `getByTestId('...')` — **既存のみ参照**。テスト用途で新規付与しない
5. CSS セレクタ — 最終手段

```ts
// ✅ ユーザーが知覚するもので指す
await page.getByRole("button", { name: "申し込みを完了する" }).click();

// ❌ クラス名や DOM 構造に結合
await page.locator(".btn-primary > span").click();
```

### アイコンボタンが指せない場合の意思決定

`Icon`-only ボタン（× / コピー / 削除など）に role/label が無くて指せないとき、**いきなり `data-testid` を生やすのは禁止**。次の順で検討する。

1. **`aria-label` を本実装に追加する** ← 第一選択
   - スクリーンリーダー対応も同時に進む（アクセシビリティと両立）
   - `getByRole('button', { name: '閉じる' })` で指せるようになる
   - 注意: `libs/admin/src/components/common/Icon/Icon.tsx` の `Icon` コンポーネントは現状 `aria-label` prop を受けていない可能性が高い。**先に `Icon.types.ts` に `aria-label?: string` を追加し `<div>` に渡す** 一手間が必要
2. それも難しい場合は、近接するテキスト（モーダルタイトル等）からチェーン: `page.getByRole('dialog', { name: '...' }).getByRole('button')`
3. **どうしても無理な場合のみ** `data-testid` 追加を**ユーザーに相談**してから足す。テスト都合だけで本実装に attribute を生やさない。

---

## アサーション

`Web First Assertions` のみ。`isVisible()` 等の手動チェックは禁止。

```ts
// ✅
await expect(page.getByText("アカウント登録が完了しました")).toBeVisible();
await expect(page).toHaveURL(/\/apply/);

// ❌ 待たない
expect(await page.getByText("...").isVisible()).toBe(true);
```

---

## 待機

- `await locator.click()` 等の自動待機に任せる
- 必要なら `await expect(...).toBeVisible({ timeout: ... })` で待つ
- `networkidle` / `waitForTimeout` は禁止

### 「とりあえず待つ」が必要に見えたときの代替

| やりたいこと        | NG                                | OK                                                                 |
| ------------------- | --------------------------------- | ------------------------------------------------------------------ |
| Firestore 反映待ち  | `waitForLoadState('networkidle')` | `expect(page.getByText('保存しました')).toBeVisible()`             |
| API 叩いた後の遷移  | `waitForTimeout(500)`             | `await page.waitForURL(/\/done/)` or `expect(page).toHaveURL(...)` |
| モーダル閉じ待ち    | `waitForTimeout(300)`             | `expect(modalLocator).toBeHidden()`                                |
| 特定 API レスポンス | `networkidle`                     | `page.waitForResponse(r => r.url().includes('/api/x') && r.ok())`  |

**`networkidle` は Firestore のような長期接続があると永遠に来ない**ので、結局フレークの温床になる。
Web First Assertion で「ユーザーが見える結果」を待つ方向に倒す。

---

## フレーキーテストをとりあえず通すための対応は禁止

失敗時に次で「通す」ことは禁止。根本原因（待ちの設計・データ・環境）を直す。

- **`networkidle` / `waitForTimeout` / 固定時間の `sleep`**（`setTimeout` だけで進める等）— 理由と代替は上の「待機」節
- **Playwright の `retries`（設定・CLI）を増やしてフレークを埋める** — 不安定テストの温存になる
- **本実装に `data-testid` をテスト都合だけで新規付与** — 例外手順は「ロケーター」節のアイコンボタン節に従う

---

## スコープとテスト粒度に関する禁止事項

- **`test.skip` / `test.fixme`** — チケットやユーザー合意なき理由での増加は禁止（主要パスを恒久スキップにしない）
- **1 つの `test` にユーザーストーリーパスを複数連結しない** — 対象は入力パス 1 本に合わせる
- **バグ報告 1 件につき機械的に E2E を 1 本足さない** — 回帰は単体・統合や既存パスの拡張を優先し、E2E はユーザー価値の高いパスに寄せる

---

## テストデータの値は spec 内に inline で書く

テストデータ（イベントタイトル・日時・会場名・本文・期待表示文字列など）は、**当該 spec ファイル内** に直接書く。
fixtures ファイルや「値を組み立てるためのヘルパー関数」（例: `buildAdminEventCreateTitle`, `computeAdminEventCreateDates`, `formatAnnounceWinnerLabel` など）に切り出さない。

```ts
// ✅ spec の関数冒頭で値を直接組み立てる
const executionDate = new Date();
const title = `【QA】パターン1 ${mm}.${dd} ${hh}:${mi}`;

const lotterySaleEnd = new Date(executionDate);
lotterySaleEnd.setDate(lotterySaleEnd.getDate() + 1);
lotterySaleEnd.setHours(23, 59, 0, 0);

// ❌ fixtures ファイル / ヘルパーへ切り出す
import {
  buildAdminEventCreateTitle,
  computeAdminEventCreateDates,
} from "../fixtures/admin-event-create-test-data";
const title = buildAdminEventCreateTitle(executionDate);
const dates = computeAdminEventCreateDates(executionDate);
```

### 理由

- **可読性**: 1 ファイル読むだけでテスト内容（入力 → 操作 → 期待）が完結して追える。fixtures に飛んで戻る往復で文脈が切れない。
- **入力値と期待値の距離が近い**: 例として「公演日 = 実行日+4 日 / 開場 18:30」を入れた直後に「`/18:30/` がイベント詳細に出ること」を assert する。両者が同じ `test` 関数の中にあると、UI 表示が変わったときに 1 箇所で対応できる。
- **テスト間カップリングを避ける**: 共有 fixture は「H1 用に少し直したら H2 が壊れた」事故が起きやすい。spec 単位で完結させると変更の影響範囲が spec 内で閉じる。
- **抽象化のオーバーヘッドが見合わない**: テストデータは大半が **その spec でしか使われない**。ヘルパー化しても DRY の効果が薄く、「引数仕様 → 実装 → 呼び出し元」を往復するコストの方が高い。
- **再利用したくなったら警告**: 複数 spec で同じ値を使い回したくなる時点で、テストの独立性（後続の節）が崩れている可能性が高い。共通化ではなく「本当に独立しているか」を見直す。

---

## Firestore の直接更新、Firebase Auth のユーザー取得などの処理は共通ヘルパーにせず利用する spec 内に直接書く

### 理由

- 入力データ・前工程・期待値を 1 ファイルだけで追えるようにするため。

---

## 画面操作は PageObject に置く

spec から `page.getByRole(...).click()` や `page.locator(...).selectOption()` を直接呼ばない。
ユーザー操作は PageObject に名前付きメソッドとして定義してから使う。

```ts
// ✅
await app.fan.event.detail().clickApplyButton();

// ❌
await app.page.getByRole("button", { name: "申し込みをする" }).click();
```

アサーションは spec に残してよい。
PageObject の実装ルールは [PAGE_OBJECT.md](./PAGE_OBJECT.md) を参照

---

## テスト独立性とデータ戦略

- 専用環境前提。本番 DB や本番外部サービスは触らない
- `test.beforeEach` で必ず初期状態を作る（fixture or storage state）
- テスト間でグローバル状態を共有しない
- 並列実行で壊れない作りにする
- **テスト用データはユニーク化**:
  - `runId = randomUUID().slice(0, 8)` + `Date.now()` で event URL を衝突させない
  - メールアドレスも `signup+${Date.now()}@example.com` 等
- ステップに「メールが届く」がある場合は Gmail APIを使う

---
