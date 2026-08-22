# ADR 0007: スキーマを正としてAPI層を書き直す際の前提

## Status

Accepted（`TicketCategory` は ADR 0009 で `InventoryCategory` に改名済み。本文中の `TicketCategory` は読み替える）

## Context

`schema.prisma` は `Performance`→`Stage`、`SeatCategory`→`TicketCategory`、`InventoryUnit`→`InventorySlot` といった改名に加え、多くのカラム・モデルの削除を伴う再設計が行われた。一方でAPI層はこの再設計に追従しておらず、`bun run check-types` が通らない状態が続いていた。

当初これを改名の追従作業と見積もったが、調査の結果そうではなかった。API層が依存している次のものは、改名されたのではなく**スキーマから削除**されている。

- `SaleOfferRate.currency` / `minQuantity` / `maxQuantity` / `quantityStep`
- `Order.currency` / `feeAmount` / `buyerFeeAmount` / `organizerFeeAmount`
- `SaleOfferEntitlement.performanceId`
- `InventoryPool.performanceId` / `seatCategoryId` / `admissionMethod` / `seatAllocationMethod`
- `Ticket.status` / `serialNumber` / `qrToken`
- `FeeRule.disabledAt`
- `Organizer.slug`
- `OrderFeeLine`（現在は `OrderItemFee`。実額カラムを持たない）
- `Performance` / `SeatCategory` / `ApplicationPreferenceItem` / `OrganizerFeature`

つまり購入見積もり・手数料計算・数量バリデーションのロジックは、根拠となるデータを失っている。機械的な置換では追従できず、スキーマの意図に沿って書き直す必要がある。

## Decision

**`schema.prisma` を正とし、API層をそれに合わせて書き直す。** スキーマ側を過去のAPIに合わせて戻すことはしない。書き直しにあたっての前提を以下に固定する。

### 通貨

- 通貨はJPY固定とし、DBにもAPIの入出力にも通貨コードを持たせない。金額はすべて円単位の整数として扱う。
- 既存の `currency` フィールドを持つAPIレスポンススキーマからは当該フィールドを削除する。

### 数量制約

- 購入数量の**下限は持たない**（`minQuantity` は復活させない）。下限は常に1枚とする。
- 上限は `SaleOffer.maxQuantityPerOrder`、刻みは `SaleOffer.quantityStep` を使う。料金種別（`SaleOfferRate`）ごとの数量制約は持たない。
- 刻みの判定は「1枚を起点に `quantityStep` 単位」とする。

### 手数料

- `Order` は購入者が支払う総額の内訳だけを持つ。`Order.totalFeeAmount` は**購入者負担（`FeePayer.BUYER`）の手数料合計**であり、`totalAmount = subtotalAmount + totalFeeAmount` が購入者の支払額になる。主催者負担（`EVENT_ORGANIZER`）は購入者の支払額に影響しないため `Order` には含めない（ADR 0002 の方針どおり）。
- 手数料の実額は保存しない。`OrderItemFee` に適用時点の `rateBasisPoints` / `flatAmount` / `payer` をコピーし、**必要になった時点で `OrderItem.unitPrice` と `quantity` から都度集計する**。計算式は `(floor(unitPrice * rateBasisPoints / 10000) + flatAmount) * quantity` とし、切り下げで固定する（ADR 0002）。
- 手数料ルールの無効化（`FeeRule.disabledAt`）は現在のスキーマに無いため、適用判定から外す。無効化が必要になった時点で別途スキーマに追加する。

### 通し券と公演の特定

- `SaleOfferEntitlement` から公演を辿る経路は `inventoryPool.stageId` の一本にする。`SaleOfferEntitlement.performanceId` による上書きは行わない。これは意図的な単純化であり、1つの利用権が指す公演は在庫プールが属する公演と常に一致する。

### 発券済みチケットの状態

- `Ticket` に状態カラム（`status` / `serialNumber` / `qrToken`）は持たせない。もぎり済みかどうかは `TicketEntitlement.usedAt` で表現する（ADR 0005）。
- 通し券では公演ごとに `TicketEntitlement` があるため、もぎりも公演単位になる。

### 書き直しの順序

- E2Eで検証する経路（イベント作成ウィザード → 購入 → 発券 → 保有チケット表示）を優先して書き直す。抽選（`fan/application/*`）・精算・platform管理は後続とする。

## Consequences

- API のレスポンススキーマから `currency` が消えるため、フロントエンドの表示側も追従が必要になる。
- 手数料を都度集計する方式にしたことで、`FeeRule` を後から変更しても既存注文の金額は変わらない（`OrderItemFee` に率と固定額をコピーしているため）。一方で集計ロジックが複数箇所に散らないよう、計算関数は1か所に置く必要がある。
- `Order` から主催者負担手数料が読めなくなるため、精算側は `OrderItemFee` を `payer` で絞って集計する実装になる。
- 数量下限を廃止したことで、「2枚単位でしか買えない」は `quantityStep = 2` で表現されるが、1枚を起点にするため 1, 3, 5 枚が有効になる。偶数枚のみに限定したい場合は別途の表現が必要になる。この点は現時点の要件に無いため保留する。
- `FeeRule` の無効化ができないため、誤った手数料ルールを作った場合は行の削除で対応することになる。過去注文は `OrderItemFee` にコピー済みなので影響を受けない。
- 書き直しが済んでいないルートの `handler.ts` を空にしたままだと `route.ts` の import が解決できず、APIサーバー自体が起動しない。書き直し順序を守りつつ他画面のE2Eを回せるよう、未着手のルートは `NOT_IMPLEMENTED` を投げる handler を置いておく。書き直したルートから順にこの handler を実装に置き換える。
- スタブに置き換えたルートの `handler.integration.test.ts` は、書き直し前のスキーマ前提のまま残っているものが多く、`bun test:int` の `packages/api` は当面赤のままになる。ルートを書き直すタイミングで、そのルートの統合テストも同時に書き直す。赤を隠さないよう、`test.skip` での一括除外は行わない。
