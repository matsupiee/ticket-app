# ADR 0009: TicketCategory を InventoryCategory に改名する

## Status

Accepted

このADRは `TicketCategory` の呼称のみを扱う。ADR 0005 / 0008（整理番号・接頭辞）と ADR 0001（ドメインスキーマ）で `TicketCategory` と書かれている箇所は、すべて `InventoryCategory` に読み替える。

## Context

`TicketCategory` は「S席・A席・VIP席」のような区分を表すテーブルで、これまで席種・券種と呼んでいた。しかし現在のスキーマ上、このテーブルが実際に決めているのは次の2点だけである。

- `InventoryPool` を公演（`Stage`）× 区分で分割する軸（`@@unique([stageId, ticketCategoryId])`）
- その在庫プールの入場方式（`kind` = `ENTRY_NUMBER` / `RESERVED_SEAT`）と整理番号の接頭辞（`entryNumberPrefix`）

一方で、購入者が実際に買う「チケット」に相当するのは `SaleOffer`（販売商品）であり、価格は `SaleOfferRate` が持つ。つまり `TicketCategory` は「チケットの種類」ではなく「在庫をどう分けるか」を表すテーブルであり、名前が実体とずれていた。

この名前のずれは実害を生んでいる。ウィザードUI・API層では同じ概念が `seatCategory`（席種）、簡単作成のステップラベルでは「券種」、DBでは `TicketCategory` と3通りに呼ばれており、`SaleOffer`（売る単位）との区別が画面から読み取れない状態になっている。

## Decision

- `TicketCategory` を `InventoryCategory` に、`TicketCategoryKind` を `InventoryCategoryKind` に改名する。列の構成・制約（`@@unique([eventId, name])`、`@@unique([eventId, entryNumberPrefix])`）は変更しない。
- `InventoryPool.ticketCategoryId` / `ticketCategory` を `inventoryCategoryId` / `inventoryCategory` に、`Event.seatCategories` リレーションを `Event.inventoryCategories` に改名する。
- スキーマ内のコメントの「席種」は「在庫種別」に統一する。
- API層・フロントエンドの `seatCategory` という呼称は今回は変更しない。UI上の表示語（席種・券種のどちらを主催者に見せるか）は、イベント作成UIの設計と一緒に決めるべき別の判断であり、DBの改名とは切り離す。
- マイグレーションファイルは作らない。`packages/db` は `prisma db push --force-reset` で開発しており `prisma/migrations` を持たないため、改名は `db:push` + `db:seed` で反映する。

## Consequences

- DB層の呼称（`InventoryCategory`）とAPI・UI層の呼称（`seatCategory`）が当面ずれたままになる。API層を触るときに読み替えが必要で、これはイベント作成UIの設計時に解消する前提の負債として残る。
- `db push --force-reset` で反映するため、既存の開発用DBのデータは失われる。本番環境はまだ無いのでデータ移行は不要。
- 「在庫種別」という語は主催者向けの表示語としては不自然なので、UIにそのまま出してはならない。UIの表示語は別途決める。
