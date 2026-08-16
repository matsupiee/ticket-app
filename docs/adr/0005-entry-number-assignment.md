# ADR 0005: 整理番号を注文作成時に採番し、座席・在庫枠の確保と排他を整理する

## Status

Accepted

## Context

`TicketCategory.kind` は `ENTRY_NUMBER`（整理番号）と `RESERVED_SEAT`（指定席）の2方式を持つ。どちらの方式でも `InventorySlot` が在庫の最小消費単位であり（ADR 0001）、発券時の `TicketEntitlement` は必ず1つの `InventorySlot` を参照する。

### 整理番号の採番タイミング

整理番号は「申込順の連番」という仕様だが、当初の実装は在庫枠を作る時点で `1..capacity` を振ってしまっていた。

- `packages/api/src/routers/organizer/event/create/handler.ts` は `InventorySlot` 作成時に `entryNumber: index + 1` を採番する。
- `packages/api/src/shared/inventory/adjust-inventory-capacity.ts` は在庫増加時に `max(entryNumber) + 1` から連番を採番する。
- `packages/api/src/shared/ticketing.ts` の `allocateInventorySlots` は `entryNumber: "asc"` の順に在庫枠を割り当てる。

この設計では番号が「申し込んだ順」ではなく「在庫枠が作られた順」で決まる。どの枠を掴むかで番号が決まってしまうため、確保して放棄しただけでも番号が消費されうる。

一方で、採番を発券時まで遅らせるのも誤りである。コンビニ払いのように入金が後日になる決済手段では、先に申し込んだ購入者の発券が後になり、あとから申し込んだクレジットカード購入者より後ろの番号になってしまう。整理番号は入場順を決めるため、これは購入者間の不公平になる。

したがって採番は、在庫枠の生成時でも発券時でもなく、**注文（`Order`）を作成し在庫枠を割り当てる時点**で行う必要がある。

### 整理番号と座席の置き場所

整理番号と座席は、どちらも「在庫枠の識別子」に見えるが性質が異なるという議論があった。ただし採番タイミングを注文作成時と定めると、両者はいずれも「在庫枠を購入者に割り当てた時点で確定する」ものになり、置き場所を分ける理由がなくなる。座席については、確保中に「A列12番を確保中」と表示し他の購入者の確保を防ぐ必要があるため、そもそも在庫枠側に持つ必要がある。

### キャンセル済みチケットによる在庫枠の占有

`TicketEntitlement.inventorySlotId` に素の `@unique` を張ると、「1つの在庫枠を同時に複数人が持つ」ことは防げるが、キャンセル済みの行が在庫枠を永久に占有し、その枠を再販できなくなる。かといって `@unique` を外すと、`seatId` / `entryNumber` が `InventorySlot` 側にある構成では `TicketEntitlement` 側に一意性の担保が一切なくなり、二重販売をDBが検出できなくなる。

`canceledAt` が `null` の行だけを対象にした部分 unique index であれば両立できる。Prisma 7.4 で `partialIndexes` プレビュー機能が追加され、`@@unique([...], where: { ... })` としてスキーマ上で表現できるようになった。本リポジトリは Prisma 7.8.0 を使っているためこれを利用できる。

当初は `prisma/sql/constraints.sql` に生SQLを置き `db:push` の後に流す方式を検討したが、Prismaスキーマの外に制約が散らばること、`prisma db push --force-reset` 運用のため適用漏れが起きやすいことから採用しなかった。

## Decision

### 整理番号

- `entryNumber` は `InventorySlot` が持つ。`TicketEntitlement` には持たせない。
- 在庫枠の生成時（イベント作成・在庫調整）には採番せず `null` のままにする。
- **`Order` を作成し在庫枠を割り当てるトランザクションの中で採番する。** 発券時ではない。コンビニ払いなど入金が後日になる購入者が、申込順より後ろの番号になるのを避けるためである。
- 連番の払い出しは `InventoryPool.nextEntryNumber` を `UPDATE ... RETURNING` で atomic に増やして行う。`max(entryNumber) + 1` を読んでから書く方式は、同時申込で採番が衝突するため使わない。
- `entryNumber` の一意スコープは `InventoryPool`（公演 × 席種）単位とし、`@@unique([inventoryPoolId, entryNumber])` で守る。PostgreSQL の一意制約は `NULL` 同士を重複とみなさないため、未採番の枠が大量にあっても制約は成立する。
- 注文がキャンセルされた場合、`InventorySlot.entryNumber` は `null` に戻して枠を再販可能にするが、`InventoryPool.nextEntryNumber` は減らさない。空いた番号は再利用せず欠番のままにする。既に発券済みの番号を詰め直すと券面の番号が変わり、入場列の運用が壊れるためである。
- 在庫枠の割り当て（`allocateInventorySlots`）は `entryNumber` 順ではなく任意順で `AVAILABLE` な `InventorySlot` を選ぶ。どの枠を掴むかと何番になるかは無関係になる。
- 抽選方式では当落確定時に注文を作成するため、同じ仕組みで当選確定順に採番される。
- 表示上の接頭辞（`S-1` / `A-1` の `S` / `A`）は `TicketCategory` が持つ。採番そのものには影響しない。ADR 0008 を参照。

### 座席

- `seatId` は `InventorySlot` が持つ。`TicketEntitlement` には持たせない。座席は「この在庫枠が会場のどの席か」という在庫側の事実であり、確保した時点で確定していないと確保中の座席を表示・排他できないためである。
- 同じ公演 × 席種で同じ座席の在庫枠が二重に作られないよう、`@@unique([inventoryPoolId, seatId])` を張る。整理番号方式では `seatId` が `null` になるが、`NULL` 同士は重複とみなされないため制約は成立する。
- 指定席方式では `entryNumber` は `null`、整理番号方式では `seatId` は `null` になる。

### 在庫枠の排他

- `TicketEntitlement.inventorySlotId` には素の `@unique` を張らず、部分 unique index で「有効な `TicketEntitlement` は1つの在庫枠につき1件まで」を守る。Prisma の `partialIndexes` プレビュー機能を有効にして、スキーマ上で表現する。

  ```prisma
  generator client {
    previewFeatures = ["partialIndexes"]
  }

  model TicketEntitlement {
    @@unique([inventorySlotId], where: { canceledAt: null })
  }
  ```

  これは `CREATE UNIQUE INDEX ... ON "TicketEntitlement" ("inventorySlotId") WHERE ("canceledAt" IS NULL)` として作成される。

- `TicketEntitlement` に `canceledAt` を追加し、キャンセル後も行を履歴として残す。`canceledAt` に値が入るとき、対応する `InventorySlot` は `AVAILABLE` に戻り `entryNumber` が `null` になっていなければならない。これらは同一トランザクションで更新する。
- 先着販売で空き枠を探すため `InventorySlot` に `@@index([inventoryPoolId, status])` を張る。

### 確保の主体（InventorySlotHold）

`InventorySlot` は在庫プールと座席への外部キーしか持たず、`HELD` になっている枠が「どの申し込みで押さえられているか」を辿る手段がなかった。`TicketEntitlement` は発券時にしか作られないため、注文作成から発券までの間（コンビニ払いの入金待ちなど）は逆引きもできない。ADR 0001 は `InventoryHoldItem` を想定していたが、実装されていなかった。

これは実害を伴う。入金通知を受け取ったときに「この注文が押さえている枠はどれか」を特定できないと、注文作成時に採番した整理番号と発券するチケットを結びつけられない。

当初は `Order`/`OrderItem` と `LotteryApplication`/`LotteryApplicationItem` を別モデルとして持ち、抽選の当選確定時に `LotteryApplicationItem.orderItemId` で `OrderItem` を作る設計だった。しかしその後のスキーマ整理で、`Order` は「申込（`Application`）の内容が確定した状態」でしかなく、先着・抽選のどちらでも `Application` と1:1にしかならないことがわかったため、`OrderItem` と `LotteryApplication` / `LotteryApplicationItem` を廃止し `Application` / `ApplicationItem` に統合した。`Order.applicationId` は `@unique` で `Application` に1:1に紐づき、数量・単価・希望順位・抽選結果（`preferenceRank` / `lotteryResult`）は `ApplicationItem` が直接持つ。

- `InventorySlotHold` を追加する。1つの在庫枠を同時に複数の申し込みが確保できないよう `inventorySlotId` に `@unique` を張る。
- 確保の主体は `applicationItemId`（必須）とする。抽選も当選確定時に対応する `ApplicationItem.lotteryResult` が `WON` になり `Order` が作られるため、先着・抽選のどちらも `ApplicationItem` から `Application` → `Order` を辿れば申込元・注文の両方に到達できる。専用の外部キーは追加しない。
- 解放時は行を削除し、`InventorySlot.status` を `AVAILABLE` に戻す。
- 発券後もこの行は残す。発券は `TicketEntitlement` が増えるだけであり、「枠が埋まっている」という事実の正本は常に `InventorySlotHold` に置く。

## Consequences

- 整理番号が決済手段に左右されなくなる。コンビニ払いでもクレジットカードでも、申し込んだ順に番号が決まる。
- 確保して放棄しただけでは番号を消費しない。欠番が出るのは注文がキャンセルされた場合のみになる。
- 整理番号の払い出しは `InventoryPool` の1行を更新するため直列化する。これは「連番を振る」という要件から本質的に避けられない。在庫確保そのものは `InventorySlot` 行への分散した更新のままなので、販売開始直後のバーストは在庫確保側で吸収される。
- `packages/db/src/seed/` は在庫枠の作成時に `entryNumber: i + 1` を振っており、「`entryNumber` が `null` でない枠は `AVAILABLE` ではない」という不変条件に反する。seedデータも採番なしで作り、購入済みの枠だけ番号を持つ形に直す必要がある。
- 在庫減少（`adjustInventoryCapacity`）は現在 `entryNumber` の大きい順に `AVAILABLE` を削除しているが、採番タイミングが変わると `AVAILABLE` な枠の `entryNumber` は常に `null` になるため、この順序指定は意味を失う。`createdAt` の新しい順など別の基準に置き換える必要がある。同様に `allocateInventorySlots` の `orderBy: { entryNumber: "asc" }` も外す必要がある。
- 入金時の発券は「`InventorySlotHold` を `applicationItemId` で引く → その枠に `TicketEntitlement` を作る」で完結する。整理番号は注文作成時に確定しているので、入金の早い遅いで番号が変わらない。
- `InventorySlot.status` と `InventorySlotHold` の有無は常に一致していなければならない。両者を同一トランザクションで更新する規律が必要になる。`status` は「空き枠を高速に検索するための非正規化」と位置づけ、正本は `InventorySlotHold` とする。
- 期限切れ解放バッチは期限を計算して期限切れしている `InventorySlotHold` を削除して `status` を戻すだけでよい。
- `partialIndexes` はプレビュー機能のため、将来のPrismaのバージョンで構文が変わる可能性がある。GA前に破壊的変更が入った場合は `@@unique` の書き方を追随させる必要がある。
- **`findUnique` / `update` / `upsert` の `where` に `inventorySlotId` 単体を渡してはいけない。** Prisma は部分インデックスであっても `TicketEntitlementWhereUniqueInput` に `inventorySlotId?: string` を生成するため、型チェックは通ってしまう。しかし実際には「有効な行のうち1件」しか一意でないので、キャンセル済みの行が複数あると一意に定まらない。在庫枠から有効なチケットを引くときは `findFirst({ where: { inventorySlotId, canceledAt: null } })` を使う。
- 現時点で API 層のコードは現行の `schema.prisma` に追従していない。追従すべき差分の詳細は ADR 0007 を参照。本ADRに関係する差分としては、`packages/api/src/shared/ticketing.ts` が `OrderItem` / `order.orderItems` / `InventorySlotHold.orderItemId` など、`Application` / `ApplicationItem` への統合で廃止済みのモデル・カラム名をまだ参照しており、`ApplicationItem` / `InventorySlotHold.applicationItemId` に置き換える必要がある。本ADRの採番方式は、この追従作業と合わせて実装する。
- Prismaだけでは表現できない次の制約は、アプリケーション層で補強する。
  - `TicketCategory.kind = RESERVED_SEAT` のとき `InventorySlot.seatId` 必須・`entryNumber` は常に `null`。
  - `TicketCategory.kind = ENTRY_NUMBER` のとき `InventorySlot.seatId` は常に `null`。
  - `InventorySlot.entryNumber` が `null` でないとき、その枠は `AVAILABLE` ではない。
