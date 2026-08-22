# ADR 0008: 主催者向けイベントAPIの棚卸しと、appRouterへの登録漏れ防止

## Status

Accepted（APIの本数と粒度は ADR 0011 で置き換えた。積み残しのうち `Performance`→`Stage`、`SeatCategory`→`InventoryCategory` の呼称は ADR 0011 で、`get` / `list` のスキーマのずれは ADR 0012 で解消済み）

## Context

`packages/api/src/routers/organizer/event/` 配下のAPIは13本まで増えていた。ADR 0004 でイベント編集ウィザードのステップ単位に粒度を細かくした結果であり、増加自体は意図されたものだが、実際に使われているものと使われていないものが混在していないかを確認した。

呼び出し元を全件調べた結果は次のとおり。

- `apps/web-admin-organizer` から呼ばれている: `get` / `list` / `create` / `update` / `upsertPerformance` / `upsertSeatCategory` / `upsertRateType` / `adjustInventory` / `upsertSaleWindow` / `upsertSaleOffer` / `cancelSaleWindow` の11本
- 呼び出し元が存在しない: `upsertFeeRule` / `disableFeeRule` の2本

手数料系の2本は、単に未使用であるだけでなく次の問題を抱えている。

- `disableFeeRule` は `FeeRule.disabledAt` を前提にしているが、ADR 0007 のとおりこのカラムはスキーマから削除済みで、`shared/ticketing.ts` にも「無効化判定は行わない」と明記されている。**実装する手段がない。**
- `upsertFeeRule` は手数料設定UIが存在せず、`FeeRule` は現状 seed が作成し `shared/ticketing.ts` が読むだけである。ADR 0002 の位置づけからしても、手数料設定を主催者に開放するのか、プラットフォーム管理者の権限とするのかがまだ決まっていない。`input` に `currency` を持つ点もADR 0007（通貨はJPY固定、APIから通貨コードを削除）に反している。

また、`create` / `update` の `publicTicketing` ブロック（14フィールド）はリポジトリ全体で参照が route.ts の定義2箇所しかない死にコードだった。ADR 0004 は「単発イベントの即時作成という別用途のために残し、廃止しない」と判断していたが、その用途の呼び出し元は結局作られず、機能としては `upsertPerformance` 以下6本と完全に重複している。

棚卸しの過程で、より深刻な `routers/index.ts` の誤配線が見つかった。

```ts
fan.event.get           → ./organizer/event/get/route
fan.event.list          → ./organizer/event/list/route
fan.user.profile.update → ./organizer/account/update-profile/route
```

`fan/event/get` / `fan/event/list` / `fan/user/profile/update` の `route.ts` は実装されているのに `appRouter` へ登録されておらず、代わりに `protectedProcedure` かつ `eventOrganizerId` 必須の主催者向けルートが `fan` 名前空間に配線されていた。同一パス `/organizer/events/{eventId}` が2箇所へ登録される状態でもあった。

原因は export 名の衝突である。`fan/event/list` と `organizer/event/list` はどちらも `listEventsRoute` を、`fan/user/profile/update` と `organizer/account/update-profile` はどちらも `updateProfileRoute` を export しており、片方だけを import すれば両方の登録先を型エラーなく満たせてしまう。型チェックでは検出できない。

## Decision

- `upsertFeeRule` / `disableFeeRule` を削除する。手数料設定をAPIとして開放する必要が生じた時点で、どの利用者種別（`organizer` か `platform` か）の権限とするかを決めてから改めて設計する。過去注文の手数料は `ApplicationItemFee` にコピー済みのため、削除の影響を受けない。
- `create` / `update` の `publicTicketing` を削除し、両APIの入力を `name` / `description`（と識別子）だけにする。ADR 0004 の「`publicTicketing` 版を残す」という判断は、呼び出し元が作られなかったため撤回する。単発イベントの一括作成が必要になった場合は、ウィザードと同じ `upsert-*` 系をフロント側でまとめて呼ぶ。
- `routers/index.ts` の誤配線を修正し、`fan` 配下の3ルートを本来の実装へ接続する。export 名が衝突するルートは、import 時に利用者種別を含む別名を付ける（`listFanEventsRoute` / `listOrganizerEventsRoute` など）。
- 「すべての `route.ts` が `routers/index.ts` から import されていること」を `scripts/check-coding-patterns.ts` で機械的に検証する。型チェックで検出できない種類の不具合であり、AGENTS.md の方針に従って決定論的なチェックで再発を防ぐ。

以上により `organizer/event` 配下は11本になる。この11本はいずれもADR 0004 の粒度そのままで、役割の重複はない。

## Consequences

- 主催者が手数料ルールを設定する手段はAPI上に存在しなくなる。開発中は seed（`packages/db/src/seed/senarios/`）で作成する。
- `create` / `update` は薄くなり、イベントの中身の設定はすべて `upsert-*` 系が担う。ウィザード以外からイベントを作る経路を追加する場合、呼び出し順（公演→席種→料金種別→在庫→販売受付→販売商品）を守る責務がクライアント側に残る。
- `fan.event.get` / `fan.event.list` / `fan.user.profile.update` の配線が変わるため、これらのAPIの入出力は主催者向けのものから一般ユーザー向けのものに変わる。誤配線が実質的に機能していなかった箇所のため、意図した挙動への修正である。
- 新しいAPIルートを追加して `appRouter` への登録を忘れると `bun run check:patterns` が落ちるようになる。ルートを一時的に作り置きすることはできなくなる。

## 積み残し（別PRで対応する）

棚卸し中に、残す11本の `route.ts` のスキーマが `schema.prisma`（ADR 0007 の書き直し）に追従していないことを確認した。`handler.ts` が `NOT_IMPLEMENTED` を投げるスタブで input を参照していないため型チェックでは表面化しないが、実装前に修正が必要である。

- `upsertSeatCategory.active`: `TicketCategory` に `active` カラムが無い（論理削除できない）。逆に必須の `kind`（`ENTRY_NUMBER` / `RESERVED_SEAT`）が入力に無い
- `upsertSaleOffer.rates[].currency` / `minQuantity` / `maxQuantity` / `quantityStep`: `SaleOfferRate` から削除済み。`SaleOffer.quantityStep` は逆に受け取れていない
- `upsertSaleOffer.entitlements[].performanceId`: `SaleOfferEntitlement` から削除済み（`inventoryPoolId` の一本経路）
- `adjustInventory.admissionMethod` / `seatAllocationMethod`: `InventoryPool` から削除済み
- `upsertPerformance.admissionMethod`: `Stage` に無い
- `upsertSaleWindow.lotteryMode`: スキーマは `autoLotteryStartsAt`。`notifyLotteryResultAt` は `notifiesLotteryResultAt` と綴りが不一致で、`maxLotteryItemCount` を受け取れていない
- `get` / `list` の `status`（`Event` に status カラムが無い）、`settlement`（対応するモデルが存在しない）、`inventoryPools[].soldCount`
- `Performance` / `SeatCategory` の呼称が `Stage` / `TicketCategory` へ改名済み

ADR 0004 が前提にしていた「`SeatCategory.active` による論理削除」も成立しなくなっているため、席種の無効化手段をどう表現するかは追従作業の中で決める。
