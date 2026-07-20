# ADR 0001: チケット販売ドメインのDBスキーマ整理

## Status

Accepted

## Context

`docs/requirement.md` では、整理番号・指定席、先着・抽選、在庫追加/削除、販売停止と返金、希望制応募、料金種別、通し券、ツアー形式、リセールが求められている。

初期スキーマは主要な名詞を持っていたが、以下の整合性をDBで守りにくかった。

- 同じ座席や整理番号の二重確保・二重販売を防ぐこと。
- 応募・販売受付・販売商品・料金種別が同じスコープに属すること。
- ツアー内で共通の席種・料金種別を持ち、公演ごとに販売有無を変えること。
- 通し券の各公演利用権が、販売商品で定義した利用権から発行されること。
- 販売停止後の返金明細を監査できること。

## Decision

- 席種は公演配下ではなく `Event` 配下の `SeatCategory` とする。
- 大人・子供などの概念は `TicketType` ではなく `RateType` と呼ぶ。
- 販売商品ごとの価格は `SaleOfferRate` に置く。
- `eventId` / `saleWindowId` / `saleOfferId` / `performanceId` を必要箇所に持たせ、複合外部キーで所属の混線を防ぐ。
- `InventoryUnit` を在庫の最小消費単位とし、発券時の `TicketEntitlement` は必ず `InventoryUnit` を参照する。
- `InventoryHoldItem` は現在確保中の在庫ユニットを表す。解放・期限切れ時は対応する hold item を削除し、`InventoryUnit.status` を戻す。
- イベントの表示状態は `Event` に保存せず、販売受付の公開日時・申込期間・キャンセル状態からAPIで算出する。
- 返金は `Refund` / `RefundItem` で、注文・決済・注文明細と対応付ける。
- リセールの同時出品は `ResaleListing.activeTicketId` の一意制約で防ぐ。出品中だけ `ticketId` と同じ値を入れ、終了時は `NULL` に戻す。

## Consequences

- ツアー共通の席種・料金種別を `Event` 単位で管理できる。
- 公演ごとに扱わない席種は `InventoryPool` を作らなければよい。
- イベント状態をDBで二重管理しないため、販売受付の日時やキャンセル状態と表示状態が不整合になりにくい。
- Prismaだけではチェック制約や部分一意制約を表現しにくい箇所があるため、以下はアプリケーション層または将来のSQL migrationで補強する。
  - `InventoryUnit.type = SEAT` のとき `seatId` 必須。
  - `InventoryUnit.type = ENTRY_NUMBER` のとき `entryNumber` 必須。
  - 金額・数量・capacity が0以上であること。
  - `ResaleListing.activeTicketId` が出品中だけ `ticketId` と一致すること。
